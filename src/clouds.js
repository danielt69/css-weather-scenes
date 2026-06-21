import * as THREE from 'three';

// Layered fBm-noise cloud planes. Several large quads at different depths drift
// at different speeds for parallax, giving a soft volumetric overcast feel
// (not flat PNGs). Brightness + coverage + darkness are animatable.
const vert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const frag = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform float uSpeed;
  uniform float uScale;
  uniform float uCoverage;  // 0..1 how much sky is covered
  uniform float uSoft;      // edge softness
  uniform vec3  uColor;     // lit cloud color
  uniform vec3  uShadow;    // underside / dark color
  uniform float uOpacity;
  uniform float uSeed;

  // hash / value noise / fbm
  float hash(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
  float noise(vec2 p){
    vec2 i = floor(p); vec2 f = fract(p);
    float a = hash(i);
    float b = hash(i+vec2(1.0,0.0));
    float c = hash(i+vec2(0.0,1.0));
    float d = hash(i+vec2(1.0,1.0));
    vec2 u = f*f*(3.0-2.0*f);
    return mix(a,b,u.x) + (c-a)*u.y*(1.0-u.x) + (d-b)*u.x*u.y;
  }
  float fbm(vec2 p){
    float v = 0.0; float amp = 0.5;
    for(int i=0;i<6;i++){ v += amp*noise(p); p *= 2.02; amp *= 0.5; }
    return v;
  }

  void main(){
    vec2 uv = vUv;
    vec2 p = uv * uScale + vec2(uSeed*7.0, uSeed*3.0);
    p.x += uTime * uSpeed;
    float n = fbm(p + fbm(p*0.5));

    // coverage threshold → cloud mask
    float edge = uSoft;
    float thresh = 1.0 - uCoverage;
    float mask = smoothstep(thresh - edge, thresh + edge, n);

    // fade clouds toward the horizon (bottom of plane) and top edges
    float vfade = smoothstep(0.0, 0.25, uv.y) * smoothstep(1.0, 0.7, uv.y);
    mask *= vfade;

    // shade: denser cores darker underneath
    float dens = smoothstep(thresh, 1.0, n);
    vec3 col = mix(uColor, uShadow, (1.0 - dens) * 0.6);

    float a = mask * uOpacity;
    if (a < 0.01) discard;
    gl_FragColor = vec4(col, a);
  }
`;

export class Clouds {
  constructor(scene) {
    this.group = new THREE.Group();
    this.layers = [];
    const defs = [
      { z: -120, w: 360, h: 200, y: 40, speed: 0.006, scale: 3.0, seed: 0.1, op: 0.0 },
      { z: -90, w: 300, h: 170, y: 36, speed: 0.011, scale: 4.5, seed: 0.6, op: 0.0 },
      { z: -60, w: 240, h: 140, y: 30, speed: 0.018, scale: 6.0, seed: 1.3, op: 0.0 },
    ];
    for (const d of defs) {
      const uniforms = {
        uTime: { value: 0 },
        uSpeed: { value: d.speed * 60 },
        uScale: { value: d.scale },
        uCoverage: { value: 0.5 },
        uSoft: { value: 0.18 },
        uColor: { value: new THREE.Color('#ffffff') },
        uShadow: { value: new THREE.Color('#8fa3bd') },
        uOpacity: { value: d.op },
        uSeed: { value: d.seed },
      };
      const mat = new THREE.ShaderMaterial({
        vertexShader: vert,
        fragmentShader: frag,
        uniforms,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(d.w, d.h), mat);
      mesh.position.set(0, d.y, d.z);
      mesh.renderOrder = -4;
      this.group.add(mesh);
      this.layers.push({ mesh, uniforms, baseSpeed: d.speed * 60 });
    }
    scene.add(this.group);

    this._targetOp = 0;
    this._targetCov = 0.5;
    this._color = new THREE.Color('#ffffff');
    this._shadow = new THREE.Color('#8fa3bd');
    this._tColor = this._color.clone();
    this._tShadow = this._shadow.clone();
  }

  // intensity 0 (none) .. 1 (full overcast). dark=true for storm undersides.
  set({ coverage = 0.6, opacity = 0.9, color = '#ffffff', shadow = '#8fa3bd' }) {
    this._targetCov = coverage;
    this._targetOp = opacity;
    this._tColor = new THREE.Color(color);
    this._tShadow = new THREE.Color(shadow);
  }

  update(dt, t) {
    const k = 1 - Math.pow(0.0008, dt);
    this._color.lerp(this._tColor, k);
    this._shadow.lerp(this._tShadow, k);
    for (let i = 0; i < this.layers.length; i++) {
      const L = this.layers[i];
      L.uniforms.uTime.value = t;
      L.uniforms.uColor.value.copy(this._color);
      L.uniforms.uShadow.value.copy(this._shadow);
      const op = L.uniforms.uOpacity;
      op.value += (this._targetOp - op.value) * k;
      const cov = L.uniforms.uCoverage;
      cov.value += (this._targetCov - cov.value) * k;
    }
    this.group.visible = this.layers.some((L) => L.uniforms.uOpacity.value > 0.01);
  }
}
