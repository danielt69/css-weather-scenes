import * as THREE from 'three';

const RANGE = { x: 120, z: 90, top: 70, height: 90 };

// ---------------------------------------------------------------------------
// RAIN — GPU-animated streaks via LineSegments (2 verts per drop). All motion
// happens in the vertex shader (time-wrapped fall), so it's effectively a GPU
// particle system: thousands of drops at 60fps with zero per-frame CPU work.
// ---------------------------------------------------------------------------
export class Rain {
  constructor(scene, count = 9000) {
    this.count = count;
    const verts = count * 2;
    const base = new Float32Array(verts * 3); // we store x,z in position.x/z, y unused
    const aEnd = new Float32Array(verts); // 0 bottom, 1 top
    const aOffset = new Float32Array(verts);
    const aSpeed = new Float32Array(verts);
    const aLen = new Float32Array(verts);

    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * RANGE.x;
      const z = (Math.random() - 0.5) * RANGE.z - 10;
      const off = Math.random();
      const sp = 0.55 + Math.random() * 0.5;
      const ln = 2.2 + Math.random() * 2.6;
      for (let v = 0; v < 2; v++) {
        const idx = i * 2 + v;
        base[idx * 3] = x;
        base[idx * 3 + 1] = 0;
        base[idx * 3 + 2] = z;
        aEnd[idx] = v; // second vertex is the trailing top
        aOffset[idx] = off;
        aSpeed[idx] = sp;
        aLen[idx] = ln;
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(base, 3));
    geo.setAttribute('aEnd', new THREE.BufferAttribute(aEnd, 1));
    geo.setAttribute('aOffset', new THREE.BufferAttribute(aOffset, 1));
    geo.setAttribute('aSpeed', new THREE.BufferAttribute(aSpeed, 1));
    geo.setAttribute('aLen', new THREE.BufferAttribute(aLen, 1));

    this.uniforms = {
      uTime: { value: 0 },
      uTop: { value: RANGE.top },
      uHeight: { value: RANGE.height },
      uWind: { value: 6.0 },
      uColor: { value: new THREE.Color('#bcd6ff') },
      uOpacity: { value: 0 },
      uFall: { value: 55.0 },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      vertexShader: /* glsl */ `
        attribute float aEnd;
        attribute float aOffset;
        attribute float aSpeed;
        attribute float aLen;
        uniform float uTime, uTop, uHeight, uWind, uFall;
        varying float vEnd;
        void main(){
          vEnd = aEnd;
          float prog = fract(aOffset + uTime * aSpeed * (uFall / 55.0));
          float y = uTop - prog * uHeight;
          y += aEnd * aLen;                 // extend the streak upward
          float drift = uWind * prog;       // slant with wind
          vec3 p = position;
          p.x += drift;
          p.y = y;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor; uniform float uOpacity;
        varying float vEnd;
        void main(){
          // brighter at the head (bottom), faded tail (top)
          float a = mix(0.9, 0.15, vEnd) * uOpacity;
          gl_FragColor = vec4(uColor, a);
        }
      `,
    });
    this.lines = new THREE.LineSegments(geo, mat);
    this.lines.frustumCulled = false;
    scene.add(this.lines);
    this._targetOp = 0;
  }
  // intensity 0..1
  set(intensity, { color = '#bcd6ff', wind = 6, fall = 55 } = {}) {
    this._targetOp = intensity;
    this.uniforms.uColor.value.set(color);
    this.uniforms.uWind.value = wind;
    this.uniforms.uFall.value = fall;
  }
  update(dt, t) {
    this.uniforms.uTime.value = t;
    const k = 1 - Math.pow(0.002, dt);
    this.uniforms.uOpacity.value += (this._targetOp - this.uniforms.uOpacity.value) * k;
    this.lines.visible = this.uniforms.uOpacity.value > 0.01;
  }
}

// ---------------------------------------------------------------------------
// SNOW — GPU Points, time-wrapped fall + sinusoidal sway. Soft round flakes.
// ---------------------------------------------------------------------------
export class Snow {
  constructor(scene, count = 4500) {
    const base = new Float32Array(count * 3);
    const aOffset = new Float32Array(count);
    const aSpeed = new Float32Array(count);
    const aSize = new Float32Array(count);
    const aPhase = new Float32Array(count);
    const aAmp = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      base[i * 3] = (Math.random() - 0.5) * RANGE.x;
      base[i * 3 + 1] = 0;
      base[i * 3 + 2] = (Math.random() - 0.5) * RANGE.z - 10;
      aOffset[i] = Math.random();
      aSpeed[i] = 0.06 + Math.random() * 0.06;
      aSize[i] = 1.4 + Math.random() * 3.2;
      aPhase[i] = Math.random() * Math.PI * 2;
      aAmp[i] = 1.5 + Math.random() * 4.0;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(base, 3));
    geo.setAttribute('aOffset', new THREE.BufferAttribute(aOffset, 1));
    geo.setAttribute('aSpeed', new THREE.BufferAttribute(aSpeed, 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(aSize, 1));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(aPhase, 1));
    geo.setAttribute('aAmp', new THREE.BufferAttribute(aAmp, 1));

    this.uniforms = {
      uTime: { value: 0 },
      uTop: { value: RANGE.top },
      uHeight: { value: RANGE.height + 20 },
      uOpacity: { value: 0 },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
      vertexShader: /* glsl */ `
        attribute float aOffset, aSpeed, aSize, aPhase, aAmp;
        uniform float uTime, uTop, uHeight;
        varying float vFade;
        void main(){
          float prog = fract(aOffset + uTime * aSpeed);
          float y = uTop - prog * uHeight;
          vec3 p = position;
          p.y = y;
          p.x += sin(uTime * 0.6 + aPhase) * aAmp;
          p.z += cos(uTime * 0.4 + aPhase) * aAmp * 0.5;
          vFade = smoothstep(0.0, 0.08, prog) * smoothstep(1.0, 0.85, prog);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = aSize * (320.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uOpacity;
        varying float vFade;
        void main(){
          vec2 uv = gl_PointCoord - 0.5;
          float d = length(uv);
          float a = smoothstep(0.5, 0.05, d);
          gl_FragColor = vec4(vec3(1.0), a * vFade * uOpacity);
        }
      `,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
    this._targetOp = 0;
  }
  set(intensity) {
    this._targetOp = intensity;
  }
  update(dt, t) {
    this.uniforms.uTime.value = t;
    const k = 1 - Math.pow(0.002, dt);
    this.uniforms.uOpacity.value += (this._targetOp - this.uniforms.uOpacity.value) * k;
    this.points.visible = this.uniforms.uOpacity.value > 0.01;
  }
}

// ---------------------------------------------------------------------------
// RAIN GROUND — wet plane with shader splash rings (GPU). Adds the "splashes on
// a ground plane" touch without CPU particle pools.
// ---------------------------------------------------------------------------
export class RainGround {
  constructor(scene) {
    this.uniforms = {
      uTime: { value: 0 },
      uOpacity: { value: 0 },
      uColor: { value: new THREE.Color('#9fc0ff') },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;
        varying vec2 vUv;
        uniform float uTime, uOpacity; uniform vec3 uColor;
        float hash(vec2 p){ return fract(sin(dot(p, vec2(41.3,289.1)))*43758.5453); }
        void main(){
          vec2 g = vUv * 26.0;          // splash grid
          vec2 cell = floor(g);
          vec2 f = fract(g) - 0.5;
          float rnd = hash(cell);
          // each cell pulses on its own phase
          float period = 1.1 + rnd;
          float ph = fract((uTime + rnd * 7.0) / period);
          float ring = smoothstep(0.02, 0.0, abs(length(f) - ph * 0.5)) * (1.0 - ph);
          // distance fade so the far plane melts into fog/horizon
          float depth = smoothstep(0.0, 0.35, vUv.y);
          float a = ring * depth * uOpacity;
          gl_FragColor = vec4(uColor, a);
        }
      `,
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(260, 220), mat);
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.position.set(0, -6, -40);
    this.mesh.renderOrder = -3;
    scene.add(this.mesh);
    this._targetOp = 0;
  }
  set(intensity, color = '#9fc0ff') {
    this._targetOp = intensity;
    this.uniforms.uColor.value.set(color);
  }
  update(dt, t) {
    this.uniforms.uTime.value = t;
    const k = 1 - Math.pow(0.002, dt);
    this.uniforms.uOpacity.value += (this._targetOp - this.uniforms.uOpacity.value) * k;
    this.mesh.visible = this.uniforms.uOpacity.value > 0.01;
  }
}
