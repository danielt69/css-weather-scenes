import { SCENES, SCENE_META } from './weather.js';

// Builds the bottom dock (scene picker + Live toggle) and the top-left readout.
export class UI {
  constructor({ onPick, onAuto }) {
    this.onPick = onPick;
    this.onAuto = onAuto;
    this.buttons = new Map();

    this.dock = document.getElementById('dock');
    this.scenesEl = document.getElementById('dock-scenes');
    this.autoBtn = document.getElementById('dock-auto');
    this.toggleBtn = document.getElementById('dock-toggle');

    for (const key of SCENES) {
      const meta = SCENE_META[key];
      const b = document.createElement('button');
      b.className = 'dock__btn';
      b.type = 'button';
      b.setAttribute('aria-label', meta.label);
      b.innerHTML = `<span class="ico">${meta.icon}</span><span>${meta.label}</span>`;
      b.addEventListener('click', () => this.onPick(key));
      this.scenesEl.appendChild(b);
      this.buttons.set(key, b);
    }

    this.autoBtn.addEventListener('click', () => this.onAuto());

    // collapse / reopen
    this.reopen = document.createElement('button');
    this.reopen.className = 'dock-reopen';
    this.reopen.textContent = '☰ Scenes';
    document.body.appendChild(this.reopen);
    this.toggleBtn.addEventListener('click', () => this.setCollapsed(true));
    this.reopen.addEventListener('click', () => this.setCollapsed(false));

    // readout refs
    this.rCond = document.getElementById('r-condition');
    this.rPlace = document.getElementById('r-place');
    this.rTemp = document.getElementById('r-temp');
  }

  setCollapsed(c) {
    this.dock.classList.toggle('is-collapsed', c);
    this.reopen.classList.toggle('is-visible', c);
  }

  setActive(key, isAuto) {
    for (const [k, b] of this.buttons) b.classList.toggle('is-active', k === key);
    this.autoBtn.classList.toggle('is-live', !!isAuto);
  }

  setReadout({ condition, place, temp }) {
    if (condition != null) this.rCond.textContent = condition;
    if (place != null) this.rPlace.textContent = place;
    this.rTemp.textContent = temp == null ? '' : `${temp}°`;
  }
}
