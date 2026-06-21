# Weather Scenes — WebGL

A full-screen **WebGL weather visualizer**. It reads your local weather and renders
the matching scene in real time — GPU rain and snow, volumetric shader clouds, a
bloom-lit sun, a moon over a starfield, thunderstorms with lightning, and fog.

**Live:** https://danielt69.github.io/css-weather-scenes/

> This is a full rewrite. The old version was a pure-CSS card grid; it's now a
> real-time 3D scene built with Three.js.

## Scenes

| Scene | What you see |
|-------|--------------|
| **Clear day** | Blue sky gradient, a crisp round sun disc with bloom + atmospheric god-ray glow, light drifting clouds |
| **Clear night** | Deep night gradient, a sharp round **cratered moon** (procedural lunar surface, maria + crater relief), twinkling starfield |
| **Clouds** | Layered fBm-noise shader clouds drifting with parallax (overcast) |
| **Rain** | Thousands of GPU streak particles, wind slant, and **realistic ground splashes** — contact-flash + expanding ripple rings on a wet plane |
| **Snow** | Drifting GPU snow with per-flake sway, soft pale sky |
| **Thunderstorm** | Dark heavy clouds, driving rain, periodic lightning bolts + screen flash |
| **Fog** | Dense exponential fog with faint low cloud |

## How it works

- **Geolocation → [Open-Meteo](https://open-meteo.com)** (no API key). On load the app
  asks for your location, fetches the current `weather_code` / `is_day` / `temperature` /
  `apparent_temperature`, maps the WMO code to a scene, and shows it full-screen. If
  location is denied or the network fails, it falls back to a sensible default
  (Tel Aviv / clear day) — never a blank screen.
- **Live conditions readout** (top-left): condition icon, current temperature, condition
  text, location, and feels-like, with a pulsing **LIVE** indicator while tracking your
  real local weather.
- **7-day forecast** (centered glass widget): a row of day-columns — day name, weather
  icon, and high / low — driven by the Open-Meteo daily forecast. Glassmorphism with
  backdrop blur so it reads cleanly over the animated scene; responsive down to 390px.
- **Manual override dock** at the bottom forces any scene; **◎ Live** returns to your
  real local weather.
- **Rendering:** Three.js scene with an `EffectComposer` + `UnrealBloomPass` post chain.
  Rain/snow are vertex-shader-animated particle systems (no per-frame CPU work); clouds
  and the sky dome are custom GLSL.
- **Accessible & smooth:** honours `prefers-reduced-motion` — particle counts are cut and
  bloom is disabled so it stays light on low-power devices. Targets 60fps.

## Run locally

```bash
npm install
npm run dev          # http://localhost:5173/css-weather-scenes/
```

Handy query params for testing: `?scene=rain` forces a scene, `?debug=1` skips the
geolocation/weather fetch.

## Build & preview

```bash
npm run build        # outputs to dist/
npm run preview      # serves the production build
```

## Deploy

Pushes to `main` trigger a GitHub Actions workflow (`.github/workflows/deploy.yml`)
that builds with Vite and publishes `dist/` to GitHub Pages.

Because this is served from a project sub-path, `vite.config.js` sets
`base: '/css-weather-scenes/'`. To host at a domain root, build with
`VITE_BASE=/ npm run build`.

## Stack

Three.js · Vite · vanilla JS + GLSL · Open-Meteo
