# Highway Racer 3D — development review

This project is isolated from production. `npm run build` writes **only to highway-racer-dev/dist/**.

## Play locally

From this directory:

```powershell
npm.cmd run dev
```

Open http://127.0.0.1:5173/games/highway-racer/ in Chrome.

- W / Up: accelerate
- S / Down: brake
- A / D or Left / Right: steer
- Space: handbrake
- C or the camera button: chase → cockpit → cinematic
- Escape / P: pause or resume
- R: restart
- Touch: steering buttons, gas, brake, camera and pause buttons

## Validate

```powershell
npm.cmd run build
node review-chrome.mjs after fresh-review
```

The Chrome test expects Vite running on port 5173 and Chrome installed at its standard Windows location. It launches a separate headless Chrome profile, captures actual WebGL frames, sends keyboard and touch events, and checks gameplay. It does not write to production. Use a fresh review folder name to avoid file locks when screenshots are open in another app.

To test the packaged build, run `npm.cmd run preview -- --host 127.0.0.1`, then:

```powershell
$env:HIGHWAY_TEST_URL='http://127.0.0.1:4173/games/highway-racer/'
node review-chrome.mjs smoke fresh-build-smoke
Remove-Item Env:HIGHWAY_TEST_URL
```

The older verify-game / verify-live-production scripts predate this task and target the website's production directory. Use **review-chrome.mjs** for this review.

## Review files

- [Visual report and test scope](review/REVIEW.md)
- [Screenshot gallery](review/index.html)
- [Final regression results](review/showcase/results.json)
- [Packaged-build smoke test](review/build-smoke/results.json)
- [Asset attribution and license provenance](public/ASSET-LICENSES.md)

Original vegetation downloads are retained in ignored `.asset-sources/`. Runtime uses the optimized GLBs in `public/models/`. All runtime assets are local; the bundle does not rely on asset CDNs.

No commits, pushes or production deployments were performed. The checkout already contained unrelated production edits at the beginning of this task; those edits were preserved.


## Latest AI traffic upgrade

All five AI classes now use original CC0 GLBs with LODs and bounded pooling. [Traffic review and benchmarks](review/traffic/REPORT.md) · [Before/after gallery](review/traffic/index.html) · [Traffic licenses](public/TRAFFIC-ASSETS.md). The earlier visual-overhaul report is retained as a historical snapshot.

With Vite running, use `node traffic-review.mjs after fresh-traffic-review` for the traffic-specific Chrome checks.
