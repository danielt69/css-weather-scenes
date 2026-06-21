import { SCENES, SCENE_META } from './weather.js';

// Builds the bottom dock (scene picker + Live toggle), the top-left live
// readout, and the centered 7-day forecast widget.
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
    this.rIcon = document.getElementById('r-icon');
    this.rFeels = document.getElementById('r-feels');
    this.rLive = document.getElementById('r-live');

    // forecast refs
    this.forecast = document.getElementById('forecast');
    this.forecastRow = document.getElementById('forecast-row');
    this.fPlace = document.getElementById('f-place');
  }

  setCollapsed(c) {
    this.dock.classList.toggle('is-collapsed', c);
    this.reopen.classList.toggle('is-visible', c);
  }

  setActive(key, isAuto) {
    for (const [k, b] of this.buttons) b.classList.toggle('is-active', k === key);
    this.autoBtn.classList.toggle('is-live', !!isAuto);
    // the LIVE chip only makes sense in auto mode.
    if (this.rLive) this.rLive.classList.toggle('is-on', !!isAuto);
  }

  setReadout({ condition, place, temp, feels, icon }) {
    if (condition != null) this.rCond.textContent = condition;
    if (place != null) this.rPlace.textContent = place;
    if (icon !== undefined) this.rIcon.textContent = icon || '';
    this.rTemp.textContent = temp == null ? '—' : `${temp}°`;
    if (feels !== undefined) {
      this.rFeels.textContent = feels == null ? '' : `Feels ${feels}°`;
    }
  }

  // Render the 7-day forecast columns. Empty/missing data hides the widget.
  setForecast(daily, place) {
    if (!daily || !daily.length) {
      this.forecast.hidden = true;
      return;
    }
    if (place != null) this.fPlace.textContent = place;
    this.forecastRow.innerHTML = daily
      .map((d, i) => {
        const today = i === 0 ? ' is-today' : '';
        const day = i === 0 ? 'Today' : d.label;
        return `
          <div class="fday${today}">
            <span class="fday__name">${day}</span>
            <span class="fday__icon">${d.icon}</span>
            <span class="fday__hi">${Number.isFinite(d.hi) ? d.hi + '°' : '–'}</span>
            <span class="fday__lo">${Number.isFinite(d.lo) ? d.lo + '°' : '–'}</span>
          </div>`;
      })
      .join('');
    this.forecast.hidden = false;
  }
}
