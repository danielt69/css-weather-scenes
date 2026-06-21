import * as THREE from 'three';

// Radial sprite texture for soft glows / halos.
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

// A perfectly round disc with a crisp anti-aliased edge. Because it lives on a
// Sprite it always faces the camera, so it reads as a clean circle on screen no
// matter where it sits — that's what makes the sun/moon edge sharp, not blobby.
function discTexture(paint) {
  const s = 512;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const ctx = c.getContext('2d');
  const r = s * 0.46;
  // clip to the disc so the silhouette is a crisp circle, then let `paint`
  // fill the interior however it likes.
  ctx.save();
  ctx.beginPath();
  ctx.arc(s / 2, s / 2, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  paint(ctx, s, r);
  ctx.restore();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// ---------------------------------------------------------------------------
// SUN — a crisp white circular disc (Sprite → always perfectly round) seeded
// for bloom, plus a warm additive halo behind it for the glow.
// ---------------------------------------------------------------------------
export class Sun {
  constructor(scene) {
    this.group = new THREE.Group();

    // warm additive halo (drawn first / behind) — gives the bloom-y glow.
    this.glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture('rgba(255,244,214,1)', 'rgba(255,205,130,0)'),
        color: new THREE.Color('#ffe6a8'),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    this.glow.scale.set(34, 34, 1);
    this.group.add(this.glow);

    // crisp solar disc: near-white core fading to a warm rim, hard circular edge.
    const disc = discTexture((ctx, s, r) => {
      const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, r);
      g.addColorStop(0.0, '#ffffff');
      g.addColorStop(0.72, '#fff6df');
      g.addColorStop(0.94, '#ffe7b0');
      g.addColorStop(1.0, '#ffd98f');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, s, s);
    });
    this.core = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: disc,
        transparent: true,
        depthWrite: false,
        // additive so it stays the brightest thing on screen and bloom latches
        // onto it cleanly without darkening the rim.
        blending: THREE.AdditiveBlending,
      })
    );
    this.core.scale.set(11, 11, 1);
    this.group.add(this.core);

    this.group.position.set(46, 58, -150);
    scene.add(this.group);
  }
  setVisible(v) {
    this.group.visible = v;
  }
  update(dt, t) {
    const pulse = 1 + Math.sin(t * 0.8) * 0.03;
    this.glow.scale.set(34 * pulse, 34 * pulse, 1);
  }
}

// ---------------------------------------------------------------------------
// MOON — a procedurally cratered full-moon disc baked once into a canvas and
// shown on a Sprite (perfectly round, crisp edge), with a faint cool halo.
// ---------------------------------------------------------------------------
function paintMoon(ctx, s, r) {
  const cx = s / 2;
  const cy = s / 2;

  // base regolith with limb darkening toward the edge. Kept in the mid/upper
  // greys (not pure white) so maria + craters keep contrast and the disc
  // doesn't blow out under bloom.
  const base = ctx.createRadialGradient(cx - r * 0.18, cy - r * 0.2, r * 0.1, cx, cy, r);
  base.addColorStop(0.0, '#dfe5ee');
  base.addColorStop(0.55, '#c7cfdc');
  base.addColorStop(0.85, '#a7b1c2');
  base.addColorStop(1.0, '#7e8aa0');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, s, s);

  // deterministic PRNG so the moon looks identical every reload.
  let seed = 1337;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  // maria — large dark basaltic plains.
  const maria = [
    [-0.18, -0.22, 0.30],
    [0.22, -0.10, 0.24],
    [0.05, 0.26, 0.30],
    [-0.30, 0.14, 0.18],
    [0.34, 0.28, 0.16],
  ];
  ctx.globalCompositeOperation = 'multiply';
  for (const [mx, my, mr] of maria) {
    const x = cx + mx * r;
    const y = cy + my * r;
    const rad = mr * r;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, 'rgba(96,108,130,0.7)');
    g.addColorStop(0.7, 'rgba(132,145,166,0.42)');
    g.addColorStop(1, 'rgba(180,192,210,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';

  // craters — dark floor + bright sun-lit rim for relief.
  const craters = 46;
  for (let i = 0; i < craters; i++) {
    const ang = rnd() * Math.PI * 2;
    const dist = Math.sqrt(rnd()) * r * 0.94;
    const x = cx + Math.cos(ang) * dist;
    const y = cy + Math.sin(ang) * dist;
    const cr = (3 + rnd() * 22) * (1 - (dist / (r * 1.3)) * 0.4);

    // bright rim highlight (upper-left, matches limb light).
    const rim = ctx.createRadialGradient(x, y, cr * 0.6, x, y, cr * 1.15);
    rim.addColorStop(0, 'rgba(255,255,255,0)');
    rim.addColorStop(0.8, 'rgba(255,255,255,0.28)');
    rim.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = rim;
    ctx.beginPath();
    ctx.arc(x - cr * 0.12, y - cr * 0.12, cr * 1.15, 0, Math.PI * 2);
    ctx.fill();

    // dark shadowed floor.
    const floor = ctx.createRadialGradient(x + cr * 0.18, y + cr * 0.18, 0, x, y, cr);
    floor.addColorStop(0, 'rgba(58,66,82,0.62)');
    floor.addColorStop(0.7, 'rgba(96,106,124,0.4)');
    floor.addColorStop(1, 'rgba(140,150,168,0)');
    ctx.fillStyle = floor;
    ctx.beginPath();
    ctx.arc(x, y, cr, 0, Math.PI * 2);
    ctx.fill();
  }

  // a couple of bright ray-craters (Tycho-like) for a touch of realism.
  for (let i = 0; i < 2; i++) {
    const ang = rnd() * Math.PI * 2;
    const dist = Math.sqrt(rnd()) * r * 0.8;
    const x = cx + Math.cos(ang) * dist;
    const y = cy + Math.sin(ang) * dist;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 0.4);
    g.addColorStop(0, 'rgba(255,255,255,0.5)');
    g.addColorStop(0.15, 'rgba(255,255,255,0.18)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  // crisp inner rim so the silhouette edge stays defined against the glow.
  ctx.lineWidth = s * 0.012;
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.arc(cx, cy, r - ctx.lineWidth, 0, Math.PI * 2);
  ctx.stroke();
}

export class Moon {
  constructor(scene) {
    this.group = new THREE.Group();

    // faint cool halo behind the disc — kept tight + dim so the disc edge stays
    // crisp and the surface texture isn't washed out.
    this.glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture('rgba(190,210,255,0.32)', 'rgba(150,180,255,0)'),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    this.glow.scale.set(22, 22, 1);
    this.group.add(this.glow);

    // cratered lunar disc — a touch larger than the sun so the surface detail
    // actually reads on screen.
    this.core = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: discTexture(paintMoon),
        transparent: true,
        depthWrite: false,
      })
    );
    this.core.scale.set(15, 15, 1);
    this.group.add(this.core);

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
