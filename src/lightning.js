import * as THREE from 'three';

// Thunderstorm lightning: a jagged 3D bolt regenerated each strike + a quick
// screen flash (DOM overlay) + a point-light pop so clouds/rain catch the light.
export class Lightning {
  constructor(scene) {
    this.scene = scene;
    this.enabled = false;

    const MAX = 120; // max vertices in the bolt path
    this.positions = new Float32Array(MAX * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geo = geo;
    this.mat = new THREE.LineBasicMaterial({
      color: new THREE.Color('#dff0ff'),
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.bolt = new THREE.Line(geo, this.mat);
    this.bolt.frustumCulled = false;
    this.bolt.visible = false;
    scene.add(this.bolt);

    this.light = new THREE.PointLight('#cfe6ff', 0, 400, 1.4);
    this.light.position.set(0, 50, -40);
    scene.add(this.light);

    // DOM flash overlay
    this.flashEl = document.createElement('div');
    Object.assign(this.flashEl.style, {
      position: 'fixed',
      inset: '0',
      background: 'radial-gradient(circle at 50% 30%, rgba(220,240,255,0.9), rgba(180,210,255,0.4) 40%, transparent 70%)',
      opacity: '0',
      pointerEvents: 'none',
      zIndex: '5',
      mixBlendMode: 'screen',
    });
    document.body.appendChild(this.flashEl);

    this._nextStrike = 1.5;
    this._boltLife = 0;
    this._flash = 0;
    this._reduced = false;
  }

  enable(on, reduced = false) {
    this.enabled = on;
    this._reduced = reduced;
    if (!on) {
      this.bolt.visible = false;
      this.mat.opacity = 0;
      this.light.intensity = 0;
      this.flashEl.style.opacity = '0';
    }
  }

  _strike() {
    const startX = (Math.random() - 0.5) * 80;
    const z = -30 - Math.random() * 30;
    let x = startX;
    let y = 46;
    const pts = [];
    pts.push(x, y, z);
    const steps = 16 + Math.floor(Math.random() * 8);
    const dy = (y + 4) / steps;
    for (let i = 0; i < steps; i++) {
      y -= dy;
      x += (Math.random() - 0.5) * 7;
      pts.push(x, y, z);
    }
    const n = Math.min(pts.length / 3, this.positions.length / 3);
    for (let i = 0; i < n * 3; i++) this.positions[i] = pts[i];
    // collapse the unused tail onto the last point
    const last = (n - 1) * 3;
    for (let i = n * 3; i < this.positions.length; i++) {
      this.positions[i] = this.positions[last + (i % 3)];
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.setDrawRange(0, n);

    this.light.position.set(startX, 30, z);
    this._boltLife = 0.18;
    this._flash = 1.0;
    this.bolt.visible = true;
  }

  update(dt) {
    if (!this.enabled) return;
    // schedule strikes
    this._nextStrike -= dt;
    if (this._nextStrike <= 0) {
      this._strike();
      this._nextStrike = 2.5 + Math.random() * 4.5;
      // occasional double-flash
      if (Math.random() < 0.4) this._nextStrike = 0.12;
    }

    // bolt fade with a flicker
    if (this._boltLife > 0) {
      this._boltLife -= dt;
      const flick = 0.5 + 0.5 * Math.sin(this._boltLife * 90);
      this.mat.opacity = Math.max(0, this._boltLife / 0.18) * flick;
      if (this._boltLife <= 0) this.bolt.visible = false;
    }

    // flash decay
    if (this._flash > 0) {
      this._flash -= dt * 3.2;
      const f = Math.max(0, this._flash);
      this.light.intensity = f * (this._reduced ? 4 : 9);
      this.flashEl.style.opacity = String(f * (this._reduced ? 0.25 : 0.6));
    }
  }

  dispose() {
    this.flashEl?.remove();
  }
}
