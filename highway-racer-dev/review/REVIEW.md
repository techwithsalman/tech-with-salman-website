# Highway Racer 3D — visual overhaul review
28 October 2026 · Development only

The procedural player car has been replaced by a detailed, licensed Ferrari 458 GLB. All work from this task is inside **highway-racer-dev/**. No commit, push, production copy or deployment was performed. Production already had modified/deleted files when this task began; they were preserved.

[Open the screenshot gallery](index.html) · [29-check Chrome result](showcase/results.json) · [Built-game smoke test](build-smoke/results.json) · [Asset licenses](../public/ASSET-LICENSES.md)

## Before and after

These are actual WebGL screenshots captured from the local game in Google Chrome, not generated concept images. “Before” is the working development checkout as it existed at the start of this task, including its pre-existing changes.

| View | Before | After |
| --- | --- | --- |
| Player side profile | [Original car](before/car-side.png) | [Imported GLB](showcase/car-side.png) |
| Rear chase during driving | [Original scene](before/rear-chase.png) | [New scene](showcase/rear-chase.png) |
| Main menu | [Original](before/menu.png) | [New showcase](showcase/menu.png) |
| Genuine model interior | — | [Cockpit while driving](showcase/cockpit.png) |
| External tracking view | — | [Cinematic while driving](showcase/cinematic.png) |
| Daytime highway and moving AI | — | [Traffic](showcase/day-highway-traffic.png) |
| Mobile | — | [Portrait driving](showcase/mobile-portrait.png), [landscape cockpit](showcase/mobile-landscape.png), [menu](showcase/mobile-menu.png) |
| Collision fixture | — | [Game-over screen](showcase/collision-gameover.png) |

The side profiles use a deliberately positioned in-engine camera with the interface hidden to show the geometry. Chase, traffic, cockpit and cinematic frames use the running game. Collision and near-miss regression cases use controlled traffic placements so their expected results are reproducible.

## What changed

- **Player asset:** 358,788 source triangles, sculpted body panels, five-spoke alloy rims, tires, glass, projector-light geometry, taillights, engine detailing, mirrors, seats, dashboard and steering wheel. The original GLB is 1.68 MB with Draco compression. No box-car fallback is used.
- **Scale and materials:** car length normalized to 4.527 m, model height about 1.234 m; established 1.95 m body collider retained, excluding the wider mirror silhouette. Metallic red clearcoat paint, silver alloys, transparent glass, charcoal cabin, emissive lights and brighter brake lights. Reflections come from a local HDR environment.
- **Wheel rig:** each original wheel is reparented under an aligned axle pivot; all four rotate from traveled distance and front wheels steer. The original steering wheel animates with the input.
- **Highway:** local CC0 1K asphalt diffuse/normal/roughness maps replace the flat road color. Worn markings, road studs, shoulder grooves, profiled galvanized barriers, reflectors, streetlights and overhead M-2 signs add depth.
- **Vegetation:** imported CC0 textured pine variants and shrub geometry replace cones and faceted spheres. Offline simplification, 512 px maps, Meshopt compression and instancing keep their combined runtime GLBs near 1.52 MB.
- **Architecture:** physically scaled window spacing, four facade treatments, brick and concrete surfaces, setbacks, balconies, floor bands, roof equipment and antennas. These buildings are modeled procedurally.
- **Lighting:** photographic daytime HDR sky, image-based ambient illumination and reflections, directional sunlight, PCF soft shadows and distance fog.
- **Cameras:** C and the touch-friendly camera button cycle Chase → Cockpit → Cinematic with damping. Cockpit uses an eye position inside the imported cabin. The cinematic boom checks nearby traffic and chooses a clear side or raises its height.
- **Driving:** speed-dependent steering and torque, brake priority over throttle, aerodynamic drag, stable spring/damper pitch and roll, modest road vibration and smaller speed-dependent FOV changes. Physics/collision updates use bounded steps of at most 1/120 second.
- **Gameplay:** existing AI types, scoring, near misses, high scores, HUD, pause/restart, touch controls and synthesized audio remain. R restarts, initial traffic is visible sooner, pause cuts engine audio, race reset clears stale combo UI and refreshes the best score, and the menu correctly hides driving instruments.
- **Build safety:** the build output changed from the production folder to the development project's own dist/. Vite also ignores Chrome's locked test-profile files.

## Verification and measured performance

**29/29 regression checks passed** in locally installed Google Chrome, using a separate headless profile and the real NVIDIA WebGL backend. The test sends keyboard and Chrome touch events and reads the actual game state.

Coverage: initialization; acceleration and speedometer state; left/right steering and front axle response; rolling wheels; braking; pause freezing position and score; R restart; moving AI; all camera modes and camera-button cycling; a truck-obstruction fixture; near-miss score/combo; collision/game over; saved high score; restart from game over; HUD reset; sound toggle and a running AudioContext; portrait touch acceleration; portrait/landscape layouts; return to menu; and road continuity through a simulated 5 km recycling sequence.

The four-second moving-gameplay sample at **1600 × 1000** recorded:

| Metric | Observed |
| --- | --- |
| Average | 59.93 FPS |
| Mean frame interval | 16.68 ms |
| 95th percentile interval | 16.8 ms |
| GPU | NVIDIA GeForce GTX 1060 6 GB via ANGLE / Direct3D 11 |
| End state | Playing, 172 km/h, six moving AI vehicles |
| Draw calls at sample end | 585 |
| Rendered triangles at sample end | 2,567,108 |

The old scene sampled 3,421 draw calls; the new rear-chase sample recorded 632 with five AI vehicles. Those are different traffic samples, not a controlled FPS comparison. Geometry workload increased substantially because the imported assets are much more detailed.

No JavaScript exceptions, failed asset requests or console warnings were observed in the final regression run. The isolated built game also passed its three Chrome smoke checks, driving at about 154 km/h with five traffic vehicles and no missing assets.

`npm.cmd run build` passed. Vite emits its standard advisory that the roughly 693 kB minified JavaScript bundle exceeds 500 kB; gzip size is about 183 kB. Static runtime content is about 8 MB. `git diff --check` passed.

## Honest limits

- The player is a professional imported vehicle mesh. AI sedans, SUVs, vans, trucks and sports traffic retain their existing procedural geometry; they are visibly simpler.
- Architecture is improved procedural scenery, not a textured city or a library of authored building assets. Facade motifs still repeat along the endless road.
- The cabin has real modeled interior geometry, but dashboard instruments and mirror surfaces are static. The HUD supplies live speed; mirrors do not render a rear view.
- Paint reflections use the HDR environment, not a dynamic car-mounted reflection probe. Shadows are real-time; there is no ray tracing or screen-space ambient occlusion pass.
- Suspension is a damped visual load-transfer model with arcade vehicle dynamics, not a full tire/contact or multibody simulation.
- FPS is a short desktop sample on this GPU. Mobile input/layout was tested with Chrome emulation, not on physical phones. Audio routing/context and sound toggle were checked; no listening-based audio-quality judgment is claimed.
- Windows interactive UI automation stopped because it could not identify the browser URL confidently. No further UI actions were attempted; verification used the already established local Chrome engineering test harness.
- The original Sketchfab car link is currently unavailable. The pinned Three.js distributor example records the creator; its public asset-license inventory records CC BY 4.0. Full provenance, source links and license notices ship with the development build.

## Run and review

From highway-racer-dev/, run `npm.cmd run dev`, then open http://127.0.0.1:5173/games/highway-racer/ in Chrome. Controls and repeatable test commands are in [README.md](../README.md).

The local dist/ is ready for review. **Production deployment remains pending your review and explicit approval.**

