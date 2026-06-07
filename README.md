# Live Weather Scenes

A full-screen weather scene that reflects the **real current weather at your location** — and animates it with hand-built CSS. Clear day, clear night, cloudy, rain, snow, thunderstorm and fog, each composed from gradients and `@keyframes` (no images, no canvas, no libraries).

**[Live demo →](https://danielt69.github.io/css-weather-scenes/)**

## What it does

- Asks for your location (browser geolocation), looks up the **live current conditions**, and renders the matching scene full-screen — with temperature, "feels like", wind and the place name.
- **Manual override:** a dock of scene pills lets you switch to any weather on demand; tap **Auto (📍)** to snap back to your real, live weather.
- **Graceful fallback:** if location is denied or offline, it picks a day/night scene by your local time and invites you to choose a scene manually — nothing breaks.
- Honors `prefers-reduced-motion` (freezes animation and thins out particles), and reflows cleanly down to mobile.

## How it works

- **Weather:** [Open-Meteo](https://open-meteo.com/) current-conditions API — free, no API key. WMO weather codes are mapped to scenes (`day`/`night` for clear, `cloudy` for overcast, plus `rain`, `snow`, `storm`, `fog`).
- **Place name:** [BigDataCloud](https://www.bigdatacloud.com/) client-side reverse geocoding — also keyless.
- **Scenes:** every drop, ray, star and lightning bolt is a CSS animation. A small vanilla-JS layer generates the particles at full-screen scale, swaps scenes, and wires the override dock. Single self-contained `index.html` — no build step.

## Run locally

Open `index.html` in a browser (geolocation needs `https://` or `localhost` to work).

---

Built by [Daniel Tsionit](https://github.com/danielt69).
