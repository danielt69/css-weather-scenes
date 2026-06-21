import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

import { Sky } from './sky.js';
import { Sun, Moon, Stars } from './celestial.js';
import { Clouds } from './clouds.js';
import { Rain, Snow, RainGround } from './particles.js';
import { Lightning } from './lightning.js';
import { SCENE_CONFIG } from './scenes.js';
import { SCENES, SCENE_META } from './weather.js';
import { resolveWeather } from './weather.js';
import { UI } from './ui.js';

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const params = new URLSearchParams(location.search);
const forcedScene = params.get('scene');
const noFetch = params.get('debug') === '1' || params.has('static');

class World {
  constructor() {
    this.canvas = document.getElementById('scene');
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: !reduced,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, reduced ? 1 : 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 6, 24);
    this.camera.lookAt(0, 9, -40);

    // lights
    this.ambient = new THREE.AmbientLight('#ffffff', 0.8);
    this.scene.add(this.ambient);
    this.hemi = new THREE.HemisphereLight('#cfe2ff', '#27313f', 0.6);
    this.scene.add(this.hemi);

    // systems
    this.sky = new Sky(this.scene);
    this.sun = new Sun(this.scene);
    this.moon = new Moon(this.scene);
    this.stars = new Stars(this.scene, reduced ? 500 : 1400);
    this.clouds = new Clouds(this.scene);
    this.rain = new Rain(this.scene, reduced ? 2500 : 9000);
    this.snow = new Snow(this.scene, reduced ? 1400 : 4500);
    this.ground = new RainGround(this.scene);
    this.lightning = new Lightning(this.scene);

    // post-processing (bloom). Skipped entirely under reduced-motion.
    this.useBloom = !reduced;
    if (this.useBloom) {
      this.composer = new EffectComposer(this.renderer);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.bloom = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        1.0,
        0.7,
        0.6
      );
      this.composer.addPass(this.bloom);
      this.composer.setPixelRatio(this.renderer.getPixelRatio());
      this.composer.setSize(window.innerWidth, window.innerHeight);
    }

    this.clock = new THREE.Clock();
    this._ambTarget = 0.8;
    this._bloomTarget = { strength: 1, radius: 0.7, threshold: 0.6 };

    window.addEventListener('resize', () => this.onResize());
    this.onResize();
  }

  applyScene(key) {
    const c = SCENE_CONFIG[key];
    if (!c) return;
    this.current = key;

    this.sky.set(c.sky);
    this.sun.setVisible(c.sun);
    this.moon.setVisible(c.moon);
    this.stars.setVisible(c.stars);

    if (c.clouds) this.clouds.set(c.clouds);
    else this.clouds.set({ opacity: 0, coverage: 0.2 });

    this.rain.set(c.rain ?? 0, c.rainOpts);
    this.snow.set(c.snow ?? 0);
    this.ground.set(c.ground ?? 0, c.groundColor);
    this.lightning.enable(!!c.lightning, reduced);

    this._ambTarget = c.ambient ?? 0.7;

    // fog
    if (c.fog) {
      if (!this.scene.fog) this.scene.fog = new THREE.FogExp2(c.fog.color, c.fog.density);
      this._fogTarget = { color: new THREE.Color(c.fog.color), density: c.fog.density };
    }

    if (this.useBloom && c.bloom) this._bloomTarget = c.bloom;
  }

  onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    if (this.useBloom) {
      this.composer.setSize(w, h);
      this.bloom.setSize(w, h);
    }
  }

  start() {
    const loop = () => {
      this._raf = requestAnimationFrame(loop);
      const dt = Math.min(this.clock.getDelta(), 0.05);
      const t = this.clock.elapsedTime;

      this.sky.update(dt, t);
      this.sun.update(dt, t);
      this.stars.update(dt, t);
      this.clouds.update(dt, t);
      this.rain.update(dt, t);
      this.snow.update(dt, t);
      this.ground.update(dt, t);
      this.lightning.update(dt, t);

      // smooth ambient
      const k = 1 - Math.pow(0.001, dt);
      this.ambient.intensity += (this._ambTarget - this.ambient.intensity) * k;

      // smooth fog
      if (this.scene.fog && this._fogTarget) {
        this.scene.fog.color.lerp(this._fogTarget.color, k);
        this.scene.fog.density += (this._fogTarget.density - this.scene.fog.density) * k;
      }

      // smooth bloom
      if (this.useBloom && this._bloomTarget) {
        this.bloom.strength += (this._bloomTarget.strength - this.bloom.strength) * k;
        this.bloom.radius += (this._bloomTarget.radius - this.bloom.radius) * k;
        this.bloom.threshold += (this._bloomTarget.threshold - this.bloom.threshold) * k;
      }

      if (this.useBloom) this.composer.render();
      else this.renderer.render(this.scene, this.camera);
    };
    loop();
  }
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------
const world = new World();
let autoMode = !forcedScene; // forced scene = manual

const ui = new UI({
  onPick: (key) => {
    autoMode = false;
    world.applyScene(key);
    ui.setActive(key, false);
    ui.setReadout({ condition: SCENE_META[key].label, place: 'Manual', temp: null });
  },
  onAuto: () => runAuto(true),
});

// headless / debug hook
window.__setScene = (key) => {
  world.applyScene(key);
  ui.setActive(key, false);
};

function hideLoader() {
  const el = document.getElementById('loading');
  if (el) {
    el.classList.add('is-hidden');
    setTimeout(() => el.remove(), 700);
  }
}

async function runAuto(force = false) {
  autoMode = true;
  ui.setActive(null, true);
  ui.setReadout({ condition: 'Reading the sky…', place: 'Locating…', temp: null });
  const w = await resolveWeather();
  if (!autoMode && !force) return; // user picked something while we waited
  world.applyScene(w.scene);
  ui.setActive(w.scene, true);
  ui.setReadout({ condition: w.condition, place: w.place, temp: w.temp });
}

// initial scene so we never show a blank canvas, even before data lands
world.applyScene(forcedScene && SCENES.includes(forcedScene) ? forcedScene : 'clear-day');
world.start();
hideLoader();

if (forcedScene && SCENES.includes(forcedScene)) {
  ui.setActive(forcedScene, false);
  ui.setReadout({ condition: SCENE_META[forcedScene].label, place: 'Manual', temp: null });
} else if (!noFetch) {
  runAuto();
} else {
  ui.setActive('clear-day', false);
  ui.setReadout({ condition: 'Clear', place: 'Debug', temp: 22 });
}
