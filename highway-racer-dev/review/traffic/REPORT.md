# Highway Racer 3D — AI traffic upgrade
28 October 2026 · Local development only

All five AI classes now use imported original CC0 GLBs: sedan, SUV, sports coupe, cargo van and a 17 m semi-truck with box trailer. The Ferrari, highway, controls, scoring and existing game states remain. No commit, push or deployment was performed.

[Before-and-after gallery](index.html) · [Traffic checks and benchmark](packaged/results.json) · [Development traffic checks](verified/results.json) · [Full gameplay regression](../traffic-gameplay/results.json) · [Asset provenance](../../public/TRAFFIC-ASSETS.md)

## Visual evidence

All images were captured from actual WebGL rendering in locally installed Google Chrome. They are not concept images. The before capture is this checkout immediately before the traffic replacement.

| View | Before | After |
| --- | --- | --- |
| Twelve moving vehicles, chase | [Original traffic](before/traffic-chase.png) | [Imported fleet](packaged/traffic-chase.png) |
| Tracking camera | [Original](before/traffic-cinematic.png) | [Imported fleet](packaged/traffic-cinematic.png) |
| SEDAN model close-up | [Original](before/sedan.png) | [Imported GLB](packaged/sedan.png) |
| SUV model close-up | [Original](before/suv.png) | [Imported GLB](packaged/suv.png) |
| SPORTS model close-up | [Original](before/sports.png) | [Imported GLB](packaged/sports.png) |
| VAN model close-up | [Original](before/van.png) | [Imported GLB](packaged/van.png) |
| TRUCK model close-up | [Original](before/truck.png) | [Imported GLB](packaged/truck.png) |
| Actual driving collision | — | [Collision/game over](packaged/moving-collision.png) |

The chase/tracking comparisons run a fixed twelve-vehicle fixture through the normal game loop. Vehicle types, starting lane/positions, cruise speed, camera and viewport are controlled for comparison. The player coasts in the remaining lane while AI movement and collision logic remain active. Close-ups use a deliberately positioned camera and paused simulation to inspect geometry, materials and wheel detail. The general regression also drives with normal randomized spawning.

## Implementation

- Local artist-authored meshes replace every procedural AI body. Body panels, window apertures, seats where supplied, glazing, mirrors, grilles, door seams/handles, tire tread, alloy rims, lamp internals and tail-light geometry are retained. The semi includes its supplied tractor, trailer, six axles, side guards and rear-door hardware.
- Shared metallic clearcoat paint, reflective tinted glass, textured trim, silver rims and emissive lamps are adapted to the existing HDR lighting. Original lens geometry remains transparent so the reflectors show through. Brake lights brighten when following traffic slows.
- Fixed parts are merged by source material. Original tire/rim/rotor geometry is grouped around measured axle centers; calipers remain fixed. Each wheel rolls by traveled distance divided by its tire radius, with synchronized poses in all LODs. The semi has twelve rotating wheel assemblies.
- Three LODs switch at nominal camera distances of 65 m and 140 m, with 12% hysteresis. Nearby shadow casters are kept within 85 m. Geometry and nonvarying materials are shared between instances.
- A bounded pool retains up to four idle vehicles per class, alongside the existing twelve-active-vehicle cap. Despawn and restart return vehicles to the pool; reuse resets paint, lights, speed, wheel distance and near-miss state. No GPU instancing was added: shared buffers, merged parts, LODs and pooling are sufficient for this fleet size.
- Spawn weights, randomized lanes, 35 m initial clearance, spawn difficulty ramp, speed ranges and despawn distances remain. Traffic keeps its assigned lane and smoothly follows a slower vehicle with a speed-dependent gap.
- The collision system and near-miss/scoring code are unchanged. Collider dimensions now match each class's nominal body size; mirror width is excluded. The semi is 17 m long, so it occupies more road than the former short procedural truck.

## Asset budgets

| Class | Source triangles | Near | Medium | Far | Rolling wheels |
| --- | --- | --- | --- | --- | --- |
| SEDAN | 132,082 | 55,603 | 17,125 | 4,937 | 4 |
| SUV | 133,178 | 55,072 | 17,246 | 4,895 | 4 |
| SPORTS | 113,490 | 42,867 | 14,711 | 4,804 | 4 |
| VAN | 135,896 | 60,580 | 17,604 | 5,901 | 4 |
| TRUCK | 41,472 | 31,260 | 5,730 | 1,674 | 12 |

The fifteen runtime traffic GLBs total 4.53 MB, including all three levels for every type. Meshopt compresses geometry. Close materials retain UVs and source maps reduced to at most 256 px; medium/far materials use baked mean colors. No added runtime npm dependency or remote asset CDN is needed.

## Chrome performance comparison

1600 × 1000, local headless Chrome with the real NVIDIA GeForce GTX 1060 6 GB / ANGLE Direct3D 11 backend. Each row is a five-second warmed sample with twelve moving AI vehicles; the game remained in PLAYING and ended above 78 km/h.

| Camera | Before FPS | After FPS | Before mean draw calls | After mean draw calls | Draw-call reduction |
| --- | --- | --- | --- | --- | --- |
| Chase | 58.53 | 59.93 | 985.93 | 553.05 | 43.91% |
| Cockpit | 59.33 | 59.93 | 953.68 | 537.03 | 43.69% |

After: mean frame intervals about 16.68 ms; 95th percentile about 16.8 ms. Frame pacing stays near the 60 Hz browser cap. These are short desktop measurements, not a physical-phone performance claim or a sustained thermal benchmark. The reduced draw calls and triangle workload reflect batching, LOD and the 85 m traffic-shadow budget; the highway rendering settings were unchanged.

## Verification

- **20/20 traffic checks passed** against development, then **20/20 passed again against the built dist/**.
- **29/29 general gameplay checks passed**: acceleration/braking/steering, camera switching, pause/restart, collision and high-score persistence, near-miss combo, audio context/toggle, mobile input and road recycling.
- Traffic checks cover all five colliders; one-time near-miss scoring; the real moving collision; LOD selection 0→1→2; radius-correct synchronized wheel rotation; pool state reset; 1,000 repeated pool acquisitions; twelve-car cap; assigned lanes and spawn clearance; despawn recycling; restart seeding; and faster traffic following a slow semi for fifteen simulated seconds without overlap.
- **Zero browser exceptions, failed asset requests or console warnings** in the final traffic and general gameplay runs.
- **Build passed** into highway-racer-dev/dist only. Vite retains its advisory about the approximately 692 kB minified JavaScript chunk exceeding 500 kB (about 183 kB gzip).
- **git diff --check passed**. [Production verification](production-verification.json) confirms all five pre-existing production files have unchanged SHA-256 hashes, with no new or deleted files in games/highway-racer/.

## Licensing and limits

All five originals are by **Innerscene**, released under **CC0 1.0**. The [traffic asset notice](../../public/TRAFFIC-ASSETS.md), in-game [credits page](../../public/credits.html), bundled CC0 text and runtime manifest record creator, source URLs, original hashes, derived files and modifications. Original downloads and source-page evidence are retained in the ignored .asset-sources/traffic folder. A hash-checking fetch script supports reproducible preparation.

These are unbranded visualization assets. The semi cab is a simpler exterior than the passenger-car meshes; this is not a manufacturer-CAD or photorealistic claim. The trailer stays aligned for the existing straight-lane game and has no articulated coupling physics. Steering/lane changes were not added to AI; its wheels roll while it follows the assigned straight lane. Reflections continue to use the existing static HDR environment. Mobile controls/layout passed Chrome emulation; performance was measured on desktop, not a phone.

## Run locally

From highway-racer-dev/:

```powershell
npm.cmd run dev
```

Open http://127.0.0.1:5173/games/highway-racer/ in Chrome. To repeat traffic checks with the dev server running:

```powershell
node traffic-review.mjs after fresh-traffic-review
```

To repeat the built-game check, run npm.cmd run preview -- --host 127.0.0.1, then set HIGHWAY_TEST_URL to http://127.0.0.1:4173/games/highway-racer/ before running the same script. The original asset fetch and offline build commands are documented in the asset notice.

Production remains pending review and explicit approval.
