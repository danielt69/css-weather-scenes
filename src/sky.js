import * as THREE from 'three';

// Gradient sky dome (inverted sphere) with a soft sun/moon glow baked into the
// shader along a configurable light direction. The discrete sun/moon mesh and
// bloom add the hot core; this gives the wide atmospheric scatter + god-ray feel.
const vert = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
  }
`;

const frag = /* glsl */ `
  precision highp float;
  varying vec3 vDir;

  uniform vec3 uTop;
  uniform vec3 uHorizon;
  uniform vec3 uBottom;
  uniform vec3 uLightDir;   // normalized direction to sun/moon
  uniform vec3 uGlowColor;
  uniform float uGlowStrength;
  uniform float uGlowSharp;  // higher = tighter disc

  void main() {
    vec3 d = normalize(vDir);
    float h = d.y; // -1..1

    // Vertical gradient: bottom -> horizon -> top
    vec3 col;
    if (h > 0.0) {
      col = mix(uHorizon, uTop, pow(clamp(h, 0.0, 1.0), 0.55));
    } else {
      col = mix(uHorizon, uBottom, pow(clamp(-h, 0.0, 1.0), 0.6));
    }

    // Sun/moon scatter glow
    float a = max(dot(d, normalize(uLightDir)), 0.0);
    float glow = pow(a, uGlowSharp);
    // broad halo
    float halo = pow(a, 2.0) * 0.25;
    col += uGlowColor * (glow + halo) * uGlowStrength;

    gl_FragColor = vec4(col, 1.0);
  }
`;

export class Sky {
  constructor(scene) {
    this.uniforms = {
      uTop: { value: new THREE.Color('#1a4f9c') },
      uHorizon: { value: new THREE.Color('#9fc7e8') },
      uBottom: { value: new THREE.Color('#0b1830') },
      uLightDir: { value: new THREE.Vector3(0.3, 0.5, -1).normalize() },
      uGlowColor: { value: new THREE.Color('#fff2c4') },
      uGlowStrength: { value: 1.0 },
      uGlowSharp: { value: 220.0 },
    };
    const geo = new THREE.SphereGeometry(480, 48, 32);
    const mat = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      uniforms: this.uniforms,
      side: THREE.BackSide,
      depthWrite: false,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.renderOrder = -10;
    scene.add(this.mesh);

    // current + target colors for smooth transitions
    this._cur = {
      top: this.uniforms.uTop.value.clone(),
      horizon: this.uniforms.uHorizon.value.clone(),
      bottom: this.uniforms.uBottom.value.clone(),
      glow: this.uniforms.uGlowColor.value.clone(),
      glowStrength: 1.0,
      glowSharp: 220.0,
    };
    this._target = { ...this._cur };
  }

  set(config) {
    // config: { top, horizon, bottom, glow, lightDir, glowStrength, glowSharp }
    this._target = {
      top: new THREE.Color(config.top),
      horizon: new THREE.Color(config.horizon),
      bottom: new THREE.Color(config.bottom),
      glow: new THREE.Color(config.glow ?? '#ffffff'),
      glowStrength: config.glowStrength ?? 1.0,
      glowSharp: config.glowSharp ?? 220.0,
    };
    if (config.lightDir) this.uniforms.uLightDir.value.copy(config.lightDir).normalize();
  }

  update(dt) {
    const k = 1 - Math.pow(0.0001, dt); // frame-rate independent lerp
    this._cur.top.lerp(this._target.top, k);
    this._cur.horizon.lerp(this._target.horizon, k);
    this._cur.bottom.lerp(this._target.bottom, k);
    this._cur.glow.lerp(this._target.glow, k);
    this._cur.glowStrength += (this._target.glowStrength - this._cur.glowStrength) * k;
    this._cur.glowSharp += (this._target.glowSharp - this._cur.glowSharp) * k;

    this.uniforms.uTop.value.copy(this._cur.top);
    this.uniforms.uHorizon.value.copy(this._cur.horizon);
    this.uniforms.uBottom.value.copy(this._cur.bottom);
    this.uniforms.uGlowColor.value.copy(this._cur.glow);
    this.uniforms.uGlowStrength.value = this._cur.glowStrength;
    this.uniforms.uGlowSharp.value = this._cur.glowSharp;
  }
}
