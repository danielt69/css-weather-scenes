# CSS Weather Scenes

Six animated weather scenes built with **pure HTML and CSS** — no JavaScript, no images, no external resources of any kind.

**Live demo:** https://danielt69.github.io/css-weather-scenes/

## The scenes

| Scene | Animation technique |
|-------|--------------------|
| Clear Day | Radial-gradient sun with a ring of `<span>` rays rotating via `@keyframes rotate` (full 360° loop) |
| Clear Night | Radial-gradient moon with an inset crescent shadow; stars pulse opacity + scale via staggered `@keyframes twinkle` |
| Rain | Gradient-streak raindrops falling with `@keyframes fall-rain` (translateY), under a `border-radius` cloud that sways with `@keyframes cloud-drift` |
| Snow | Circular flakes of varied sizes drifting down via `@keyframes fall-snow` (combined translateX + translateY for a natural sway), each with its own duration/delay |
| Thunderstorm | Dark cloud over a periodic radial-gradient `@keyframes flash` plus a `clip-path` lightning bolt that strikes in sync (`@keyframes bolt-strike`) |
| Fog | Four blurred translucent layers sliding horizontally via `@keyframes drift`, alternating direction for depth |

## How it works

Every scene is a fixed-size card. The weather elements are plain `<div>` and `<span>`
elements styled entirely with CSS — gradients for skies and the sun/moon, `border-radius`
for clouds and flakes, and `clip-path` for the lightning bolt. All motion comes from CSS
`@keyframes` animations; there is not a single line of script.

- **Layout:** responsive CSS Grid (`repeat(auto-fill, minmax(260px, 1fr))`) that reflows to a single column at 390px.
- **No images:** suns, moons, clouds, rain, snow, and bolts are all CSS shapes.
- **No JS:** open the page source — zero `<script>` tags.
- **Accessible:** respects `prefers-reduced-motion`, pausing all animations for users who opt out.

## Run locally

Just open `index.html` in any browser. No build step, no dependencies.
