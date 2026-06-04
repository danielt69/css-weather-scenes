# CSS Weather Scenes

Six animated weather scenes — clear day, clear night, rain, snow, thunderstorm and fog — built with nothing but HTML and CSS. No images, no JavaScript, no libraries.

**[Live demo →](https://danielt69.github.io/css-weather-scenes/)**

## How it works

Everything lives in a single self-contained `index.html` with an inline `<style>` block. Each scene is a card whose visuals are composed from gradients and a handful of `<div>`/`<span>` elements, and every bit of motion — the sun's rotating rays, twinkling stars, falling rain and snow, drifting fog banks, and the lightning flash — is driven purely by CSS `@keyframes`. Raindrops and snowflakes use staggered `animation-delay` and varied `animation-duration` values so the loops never feel mechanical. The gallery is a responsive CSS grid that reflows to a single column on narrow screens, and `prefers-reduced-motion: reduce` freezes all animation for accessibility.

## Run locally

Open `index.html` in any modern browser. That's it — there's nothing to install or build.

---

MIT — do whatever you like.
