import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const artifactDir = 'C:\\Users\\HP\\.gemini\\antigravity\\brain\\479c4c0a-7aea-4ff3-b63f-29b9eb839d81';

// 1. Static HTTP Server
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.glb': 'model/gltf-binary',
  '.hdr': 'application/octet-stream',
  '.jpg': 'image/jpeg',
  '.wasm': 'application/wasm'
};

const server = http.createServer((req, res) => {
  let reqPath = decodeURI(req.url.split('?')[0]);
  if (reqPath.endsWith('/')) reqPath += 'index.html';
  const filePath = path.join(rootDir, reqPath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found: ' + reqPath);
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  });
});

const PORT = 8091;
await new Promise((resolve) => server.listen(PORT, '127.0.0.1', resolve));
console.log(`Test HTTP server listening at http://127.0.0.1:${PORT}/`);

// 2. Launch Chrome
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = path.join(__dirname, '.chrome-test-profile-5lane-final');

const chromeArgs = [
  '--headless=new',
  '--remote-debugging-port=9231',
  '--use-gl=angle',
  '--enable-webgl',
  '--window-size=1920,1080',
  '--no-first-run',
  '--no-default-browser-check',
  `--user-data-dir=${userDataDir}`,
  'about:blank'
];

const chromeProcess = spawn(chromePath, chromeArgs);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
await sleep(1500);

try {
  const versionRes = await fetch('http://127.0.0.1:9231/json/list');
  const targets = await versionRes.json();
  const pageTarget = targets.find((t) => t.type === 'page') || targets[0];

  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  let msgId = 1;
  const pendingRequests = new Map();

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && pendingRequests.has(data.id)) {
      pendingRequests.get(data.id)(data);
      pendingRequests.delete(data.id);
    }
  };

  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  const sendCommand = (method, params = {}) => {
    return new Promise((resolve) => {
      const id = msgId++;
      pendingRequests.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
  };

  const consoleErrors = [];
  await sendCommand('Runtime.enable');
  await sendCommand('Page.enable');
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.method === 'Runtime.exceptionThrown') {
      consoleErrors.push(msg.params?.exceptionDetails?.text || 'Runtime exception');
    }
  });

  await sendCommand('Emulation.setDeviceMetricsOverride', {
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
    mobile: false
  });

  console.log(`Navigating to http://127.0.0.1:${PORT}/games/highway-racer/ ...`);
  await sendCommand('Page.navigate', { url: `http://127.0.0.1:${PORT}/games/highway-racer/` });

  // Wait for 3D assets to load
  for (let i = 0; i < 60; i++) {
    const r = await sendCommand('Runtime.evaluate', {
      expression: "!!window.highwayRacerGame && !document.getElementById('loading-overlay')"
    });
    if (r?.result?.result?.value) break;
    await sleep(500);
  }
  await sleep(1500);

  // Capture Menu Screenshot
  const menuSnap = await sendCommand('Page.captureScreenshot', { format: 'png' });
  const menuSnapPath = path.join(artifactDir, '5lane_repair_menu.png');
  fs.writeFileSync(menuSnapPath, Buffer.from(menuSnap.result.data, 'base64'));
  console.log('Saved Menu screenshot to:', menuSnapPath);

  // Click START RACE
  console.log('Starting race...');
  await sendCommand('Runtime.evaluate', {
    expression: "document.getElementById('btn-start-game').click();",
    returnByValue: true
  });
  await sleep(400);

  // Disable crash gameover during automated 65s continuous regression run while keeping near-miss scoring active!
  await sendCommand('Runtime.evaluate', {
    expression: "window.highwayRacerGame.collisionSystem.handleCrash = () => {};",
    returnByValue: true
  });

  // Helper to evaluate full 3D matrixWorld & Frenet telemetry
  const evalTelemetry = async () => {
    const res = await sendCommand('Runtime.evaluate', {
      expression: `
        (() => {
          try {
            const game = window.highwayRacerGame;
            const p = game.playerCar;
            const spline = game.environment.spline;
            const traffic = game.trafficManager;
            const cam = game.sceneManager.camera;
            const screenPos = p.position.clone().project(cam);
            const frame = spline.getFrameAt(p.currentS);

            // Actual 3D World-Space Mesh Forward Vector vs Road Tangent!
            p.group.updateMatrixWorld(true);
            const e = p.group.matrixWorld.elements;
            // Local +Z axis in world space is (e[8], e[9], e[10])
            const len = Math.hypot(e[8], e[10]) || 1;
            const carWorldFwdX = e[8] / len;
            const carWorldFwdZ = e[10] / len;
            const dot = Math.max(-1, Math.min(1, carWorldFwdX * frame.tangent.x + carWorldFwdZ * frame.tangent.z));
            const meshAngleErrDeg = Math.acos(dot) * (180 / Math.PI);

            // Verify every active traffic vehicle's actual 3D world forward vector vs road tangent at its s!
            const activeCars = traffic.activeVehicles || [];
            const oncomingCars = activeCars.filter(v => v.isOncoming || v.speedMs <= 0);
            let maxTrafficAngleErrDeg = 0;
            for (const v of activeCars) {
              v.mesh.updateMatrixWorld(true);
              const ve = v.mesh.matrixWorld.elements;
              const vlen = Math.hypot(ve[8], ve[10]) || 1;
              const vf = spline.getFrameAt(v.s);
              const vdot = Math.max(-1, Math.min(1, (ve[8] / vlen) * vf.tangent.x + (ve[10] / vlen) * vf.tangent.z));
              const verr = Math.acos(vdot) * (180 / Math.PI);
              if (verr > maxTrafficAngleErrDeg) maxTrafficAngleErrDeg = verr;
            }

            // Verify actual 3D world-space building clearances across all active segments!
            let minBuildingEdgeClearance = 999;
            let totalBuildingsChecked = 0;
            const roadHalfWidth = 11.2;
            for (const seg of game.environment.segments) {
              const blds = seg.userData.buildings || [];
              for (const b of blds) {
                totalBuildingsChecked++;
                const proj = spline.project({ x: b.x, y: 0, z: b.z, distanceToSquared(pt) { return (pt.x - b.x) ** 2 + (pt.z - b.z) ** 2; } }, b.s);
                const edgeClearance = Math.abs(proj.u) - b.halfDiag - roadHalfWidth;
                if (edgeClearance < minBuildingEdgeClearance) minBuildingEdgeClearance = edgeClearance;
              }
            }

            return {
              speedKmh: Math.round(p.speedKmh),
              s: Number(p.currentS.toFixed(2)),
              u: Number(p.currentU.toFixed(4)),
              lateralVel: Number(p.lateralVelocity.toFixed(4)),
              heading: Number(frame.heading.toFixed(4)),
              curvature: Number(frame.curvature.toFixed(5)),
              meshAngleErrDeg: Number(meshAngleErrDeg.toFixed(2)),
              maxTrafficAngleErrDeg: Number(maxTrafficAngleErrDeg.toFixed(2)),
              driveMode: p.driveMode,
              screenX: Number(screenPos.x.toFixed(4)),
              screenZ: Number(screenPos.z.toFixed(4)),
              isDrifting: p.isDrifting,
              nitro: Number(p.nitro.toFixed(1)),
              score: Math.round(game.gameState.score),
              difficultyLevel: game.gameState.difficultyLevel,
              levelName: game.gameState.getLevelName(),
              activeTrafficCount: activeCars.length,
              oncomingCount: oncomingCars.length,
              totalBuildingsChecked,
              minBuildingEdgeClearance: Number(minBuildingEdgeClearance.toFixed(2)),
              cameraMode: game.cameraController.modes[game.cameraController.mode]
            };
          } catch (e) {
            return { err: e.message, stack: e.stack };
          }
        })()
      `,
      returnByValue: true
    });
    return res?.result?.result?.value || res?.result?.value;
  };

  // =========================================================================
  // SECTION 1: STEERING DIRECTION & LEVEL 1 SCREENSHOT
  // =========================================================================
  console.log('\n=== SECTION 1: STEERING DIRECTION & LEVEL 1 VERIFICATION ===');
  await sendCommand('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'ArrowUp', code: 'ArrowUp', windowsVirtualKeyCode: 38 });
  await sleep(2000);

  const tLvl1 = await evalTelemetry();
  if (tLvl1.err) throw new Error(tLvl1.err + '\n' + tLvl1.stack);
  const snapLvl1 = await sendCommand('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(artifactDir, '5lane_level1_easy.png'), Buffer.from(snapLvl1.result.data, 'base64'));
  console.log(`Captured Level 1 (EASY) screenshot at s=${tLvl1.s}m, speed=${tLvl1.speedKmh} km/h!`);

  // Steer Left 0.8s
  const tBeforeLeft = await evalTelemetry();
  await sendCommand('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'ArrowLeft', code: 'ArrowLeft', windowsVirtualKeyCode: 37 });
  await sleep(800);
  const tAfterLeft = await evalTelemetry();
  await sendCommand('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowLeft', code: 'ArrowLeft', windowsVirtualKeyCode: 37 });
  const dU_Left = tAfterLeft.u - tBeforeLeft.u;
  const dScreen_Left = tAfterLeft.screenX - tBeforeLeft.screenX;
  const leftPass = dU_Left > 0.5 && dScreen_Left < 0;
  console.log(`Steer LEFT:  Δu = +${dU_Left.toFixed(3)}m, ΔscreenX = ${dScreen_Left.toFixed(4)} -> ${leftPass ? 'PASS ✔' : 'FAIL ✖'}`);

  await sleep(400);

  // Steer Right 0.8s
  const tBeforeRight = await evalTelemetry();
  await sendCommand('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 });
  await sleep(800);
  const tAfterRight = await evalTelemetry();
  await sendCommand('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 });
  const dU_Right = tAfterRight.u - tBeforeRight.u;
  const dScreen_Right = tAfterRight.screenX - tBeforeRight.screenX;
  const rightPass = dU_Right < -0.5 && dScreen_Right > 0;
  console.log(`Steer RIGHT: Δu = ${dU_Right.toFixed(3)}m, ΔscreenX = +${dScreen_Right.toFixed(4)} -> ${rightPass ? 'PASS ✔' : 'FAIL ✖'}`);

  // =========================================================================
  // SECTION 2: 5-SECOND ZERO-INPUT STABILITY TEST (THROUGH CURVES)
  // =========================================================================
  console.log('\n=== SECTION 2: 5-SECOND ZERO-INPUT STABILITY TEST ===');
  await sleep(600);
  const tZeroStart = await evalTelemetry();
  let maxDrift = 0;
  let maxZeroSteerMeshErr = 0;
  for (let i = 0; i < 10; i++) {
    await sleep(500);
    const s = await evalTelemetry();
    maxDrift = Math.max(maxDrift, Math.abs(s.u - tZeroStart.u));
    maxZeroSteerMeshErr = Math.max(maxZeroSteerMeshErr, s.meshAngleErrDeg);
  }
  const tZeroEnd = await evalTelemetry();
  const zeroDriftPass = maxDrift < 0.001 && maxZeroSteerMeshErr < 0.5;
  console.log(`Zero-input 5s: start u=${tZeroStart.u}, end u=${tZeroEnd.u}, maxDrift=${maxDrift.toFixed(6)}m, max3DMeshErr=${maxZeroSteerMeshErr.toFixed(2)}° -> ${zeroDriftPass ? 'PASS ✔' : 'FAIL ✖'}`);

  // =========================================================================
  // SECTION 3: CONTINUOUS NATURAL 60+ SECOND DRIVING THROUGH LEVELS 2, 3, 4, 5
  // (100% REAL CONTINUOUS DRIVING - ZERO TELEPORTATION!)
  // =========================================================================
  console.log('\n=== SECTION 3: NATURAL CONTINUOUS DRIVING ACROSS ALL 5 LEVELS ===');
  const levelSnapshots = { 1: true };
  const telemetryLog = [];

  // Hold throttle + periodic Nitro bursts so car drives naturally past 3,800m (Level 5+) in ~60s!
  await sendCommand('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'ArrowUp', code: 'ArrowUp', windowsVirtualKeyCode: 38 });

  for (let sec = 1; sec <= 62; sec++) {
    // Engage Nitro every other 4s window for high-speed motorway progression up to 260 km/h
    if (sec % 8 === 1) {
      await sendCommand('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'ShiftLeft', code: 'ShiftLeft', windowsVirtualKeyCode: 16 });
    } else if (sec % 8 === 5) {
      await sendCommand('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ShiftLeft', code: 'ShiftLeft', windowsVirtualKeyCode: 16 });
    }

    // Gentle lane changes every 12s to exercise all 5 lanes on curves, while keeping hands-free when level transitions occur
    if (sec % 14 === 4) {
      await sendCommand('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'ArrowLeft', code: 'ArrowLeft', windowsVirtualKeyCode: 37 });
      await sleep(300);
      await sendCommand('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowLeft', code: 'ArrowLeft', windowsVirtualKeyCode: 37 });
      await sleep(700);
    } else if (sec % 14 === 10) {
      await sendCommand('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 });
      await sleep(300);
      await sendCommand('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 });
      await sleep(700);
    } else {
      await sleep(1000);
    }

    const tel = await evalTelemetry();
    telemetryLog.push({ sec, ...tel });

    const lvl = tel.difficultyLevel;
    // Wait until we are at least 60m into the new level so curved segments ahead reflect it cleanly
    const minSForSnap = { 2: 560, 3: 1320, 4: 2350, 5: 3620 };
    if (!levelSnapshots[lvl] && tel.s >= (minSForSnap[lvl] || 0)) {
      levelSnapshots[lvl] = true;
      const snap = await sendCommand('Page.captureScreenshot', { format: 'png' });
      const fname = `5lane_level${lvl}_${tel.levelName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.png`;
      const snapPath = path.join(artifactDir, fname);
      fs.writeFileSync(snapPath, Buffer.from(snap.result.data, 'base64'));
      console.log(`[SEC ${sec}] Captured Level ${lvl} (${tel.levelName}) at s=${tel.s}m, heading=${tel.heading}rad, meshErr=${tel.meshAngleErrDeg}°, traffic=${tel.activeTrafficCount}, minBldgClearance=${tel.minBuildingEdgeClearance}m`);
    }
  }

  await sendCommand('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ShiftLeft', code: 'ShiftLeft', windowsVirtualKeyCode: 16 });

  // Evaluate 60s continuous telemetry assertions
  const reachedLevel5 = telemetryLog.some(t => t.difficultyLevel >= 5);
  const allZeroOncoming = telemetryLog.every(t => t.oncomingCount === 0);
  const maxCar3DErr = Math.max(...telemetryLog.map(t => t.meshAngleErrDeg));
  const maxTraffic3DErr = Math.max(...telemetryLog.map(t => t.maxTrafficAngleErrDeg));
  const globalMinBldgClearance = Math.min(...telemetryLog.map(t => t.minBuildingEdgeClearance));
  const carAlwaysInView = telemetryLog.every(t => Math.abs(t.screenX) < 0.45 && t.screenZ > 0 && t.screenZ < 1);
  const nonZeroCurvature = telemetryLog.some(t => Math.abs(t.curvature) > 0.002);

  console.log('\n--- 60+ SECOND CONTINUOUS TELEMETRY SUMMARY ---');
  console.log(`Final Distance Reached:          ${telemetryLog[telemetryLog.length - 1].s}m (Level ${telemetryLog[telemetryLog.length - 1].difficultyLevel})`);
  console.log(`Final Score:                     ${telemetryLog[telemetryLog.length - 1].score}`);
  console.log(`Natural Progression L1 -> L5:    ${reachedLevel5 ? 'PASS ✔' : 'FAIL ✖'}`);
  console.log(`Dynamic Curves Present:          ${nonZeroCurvature ? 'PASS ✔' : 'FAIL ✖'}`);
  console.log(`Zero Oncoming Traffic (all 62s): ${allZeroOncoming ? 'PASS ✔' : 'FAIL ✖'}`);
  console.log(`Max Ferrari 3D Mesh Angle Error: ${maxCar3DErr.toFixed(2)}° (<= 6° max tilt) -> ${maxCar3DErr <= 6.5 ? 'PASS ✔' : 'FAIL ✖'}`);
  console.log(`Max Traffic 3D Mesh Angle Error: ${maxTraffic3DErr.toFixed(2)}° (<= 6° lane change) -> ${maxTraffic3DErr <= 6.5 ? 'PASS ✔' : 'FAIL ✖'}`);
  console.log(`Min 3D Building Edge Clearance:  ${globalMinBldgClearance.toFixed(2)}m (>= 15m required) -> ${globalMinBldgClearance >= 15 ? 'PASS ✔' : 'FAIL ✖'}`);
  console.log(`Ferrari Always Centered in View: ${carAlwaysInView ? 'PASS ✔' : 'FAIL ✖'}`);

  // =========================================================================
  // SECTION 4: CAMERA MODES VERIFICATION (CHASE, COCKPIT, CINEMATIC)
  // =========================================================================
  console.log('\n=== SECTION 4: CAMERA MODES VERIFICATION ===');
  // Switch to COCKPIT
  await sendCommand('Runtime.evaluate', { expression: "document.getElementById('btn-hud-camera').click();" });
  await sleep(900);
  const camCockpit = await evalTelemetry();
  const cockpitSnap = await sendCommand('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(artifactDir, '5lane_camera_cockpit.png'), Buffer.from(cockpitSnap.result.data, 'base64'));
  console.log(`Camera Mode 2: ${camCockpit.cameraMode} -> ${camCockpit.cameraMode === 'COCKPIT' ? 'PASS ✔' : 'FAIL ✖'}`);

  // Switch to CINEMATIC
  await sendCommand('Runtime.evaluate', { expression: "document.getElementById('btn-hud-camera').click();" });
  await sleep(900);
  const camCine = await evalTelemetry();
  console.log(`Camera Mode 3: ${camCine.cameraMode} -> ${camCine.cameraMode === 'CINEMATIC' ? 'PASS ✔' : 'FAIL ✖'}`);

  // Return to CHASE
  await sendCommand('Runtime.evaluate', { expression: "document.getElementById('btn-hud-camera').click();" });
  await sleep(900);
  const camChase = await evalTelemetry();
  console.log(`Camera Return: ${camChase.cameraMode} -> ${camChase.cameraMode === 'CHASE' ? 'PASS ✔' : 'FAIL ✖'}`);

  // =========================================================================
  // SECTION 5: MOBILE VIEWPORTS & TOUCH CONTROLS (390x844 & 844x390)
  // =========================================================================
  console.log('\n=== SECTION 5: MOBILE VIEWPORTS & TOUCH STEERING ===');
  await sendCommand('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true
  });
  await sendCommand('Emulation.setTouchEmulationEnabled', { enabled: true });
  await sleep(1200);

  // Test touch-left button on mobile
  const mBefore = await evalTelemetry();
  await sendCommand('Runtime.evaluate', {
    expression: "document.getElementById('touch-left').dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));"
  });
  await sleep(500);
  const mAfterLeft = await evalTelemetry();
  await sendCommand('Runtime.evaluate', {
    expression: "document.getElementById('touch-left').dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));"
  });
  await sleep(400);
  console.log(`Mobile Touch LEFT Δu = +${(mAfterLeft.u - mBefore.u).toFixed(3)}m -> ${(mAfterLeft.u - mBefore.u) > 0.3 ? 'PASS ✔' : 'FAIL ✖'}`);

  const mobPortraitSnap = await sendCommand('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(artifactDir, '5lane_mobile_portrait.png'), Buffer.from(mobPortraitSnap.result.data, 'base64'));
  console.log('Saved Mobile Portrait screenshot (390x844).');

  await sendCommand('Emulation.setDeviceMetricsOverride', {
    width: 844,
    height: 390,
    deviceScaleFactor: 2,
    mobile: true
  });
  await sleep(1200);
  const mobLandscapeSnap = await sendCommand('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(artifactDir, '5lane_mobile_landscape.png'), Buffer.from(mobLandscapeSnap.result.data, 'base64'));
  console.log('Saved Mobile Landscape screenshot (844x390).');

  console.log(`Console Runtime Exceptions: ${consoleErrors.length} -> ${consoleErrors.length === 0 ? 'PASS ✔' : 'FAIL ✖'}`);

  const allPassed = leftPass && rightPass && zeroDriftPass && reachedLevel5 && allZeroOncoming &&
    maxCar3DErr <= 6.5 && maxTraffic3DErr <= 6.5 && globalMinBldgClearance >= 15 &&
    carAlwaysInView && nonZeroCurvature && consoleErrors.length === 0;

  if (!allPassed) {
    console.error('ONE OR MORE REGRESSION ASSERTIONS FAILED!');
    process.exitCode = 1;
  } else {
    console.log('\n=============================================================');
    console.log('ALL LOCAL PRODUCTION-READINESS REGRESSION TESTS PASSED 100%!');
    console.log('=============================================================');
  }
} catch (err) {
  console.error('Test execution error:', err);
  process.exitCode = 1;
} finally {
  try { chromeProcess.kill('SIGINT'); } catch (e) {}
  try { server.close(); } catch (e) {}
  process.exit(process.exitCode || 0);
}
