import * as THREE from 'three';

// Radial sprite texture for soft glows.
function glowTexture(inner = '#ffffff', outer = 'rgba(255,255,255,0)') {
  const s = 256;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, inner);
  g.addColorStop(0.4, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class Sun {
  constructor(scene) {
    this.group = new THREE.Group();

    // hot core — pure white so it's the brightest thing on screen and bloom
    // latches onto it (and only it) at a high threshold.
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(5, 32, 32),
      new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffffff') })
    );
    this.group.add(core);

    // additive glow disc — god-ray-ish bloom seed, kept compact so it reads as
    // a sun rather than washing the whole sky.
    const glowTex = glowTexture('rgba(255,244,214,1)', 'rgba(255,205,130,0)');
    this.glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTex,
        color: new THREE.Color('#ffe6a8'),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    this.glow.scale.set(30, 30, 1);
    this.group.add(this.glow);

    this.group.position.set(46, 58, -150);
    scene.add(this.group);
  }
  setVisible(v) {
    this.group.visible = v;
  }
  update(dt, t) {
    const pulse = 1 + Math.sin(t * 0.8) * 0.03;
    this.glow.scale.set(30 * pulse, 30 * pulse, 1);
  }
}

export class Moon {
  constructor(scene) {
    this.group = new THREE.Group();
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(5, 32, 32),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#dfe7f5'),
        emissive: new THREE.Color('#9fb6d8'),
        emissiveIntensity: 0.5,
        roughness: 1,
        metalness: 0,
      })
    );
    this.group.add(core);

    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture('rgba(200,220,255,0.9)', 'rgba(150,180,255,0)'),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    glow.scale.set(28, 28, 1);
    this.group.add(glow);

    // a directional moonlight so the moon sphere reads 3D
    this.light = new THREE.DirectionalLight('#aac4ff', 0.8);
    this.light.position.set(-1, 1, 1);
    this.group.add(this.light);

    this.group.position.set(-50, 64, -150);
    scene.add(this.group);
  }
  setVisible(v) {
    this.group.visible = v;
  }
  update() {}
}

export class Stars {
  constructor(scene, count = 1400) {
    const pos = new Float32Array(count * 3);
    const phase = new Float32Array(count);
    const size = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      // distribute on a far hemisphere shell
      const r = 360;
      const u = Math.random();
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(0.15 + u * 0.85); // bias upward
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = Math.abs(r * Math.cos(phi)) * 0.9 + 10;
      pos[i * 3 + 2] = -Math.abs(r * Math.sin(phi) * Math.sin(theta)) - 30;
      phase[i] = Math.random() * Math.PI * 2;
      size[i] = 0.6 + Math.random() * 2.2;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));

    this.uniforms = { uTime: { value: 0 }, uOpacity: { value: 1 } };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        attribute float aPhase;
        attribute float aSize;
        uniform float uTime;
        varying float vTw;
        void main() {
          vTw = 0.55 + 0.45 * sin(uTime * 1.6 + aPhase);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * (300.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uOpacity;
        varying float vTw;
        void main() {
          vec2 uv = gl_PointCoord - 0.5;
          float d = length(uv);
          float a = smoothstep(0.5, 0.0, d);
          gl_FragColor = vec4(vec3(1.0, 1.0, 0.95), a * vTw * uOpacity);
        }
      `,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.renderOrder = -5;
    scene.add(this.points);
  }
  setVisible(v) {
    this.points.visible = v;
  }
  update(dt, t) {
    this.uniforms.uTime.value = t;
  }
}
