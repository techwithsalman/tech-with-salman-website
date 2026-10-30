import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const artifactDir = 'C:\\Users\\HP\\.gemini\\antigravity\\brain\\479c4c0a-7aea-4ff3-b63f-29b9eb839d81';
const EXPECTED_BUNDLE = 'index-Dpe2bIYV.js';
const liveUrl = `https://techwithsalman.online/games/highway-racer/?cb=${Date.now()}`;

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = path.join(__dirname, '.chrome-test-profile-live-5lane');

const chromeArgs = [
  '--headless=new',
  '--remote-debugging-port=9234',
  '--use-gl=angle',
  '--enable-webgl',
  '--disable-application-cache',
  '--disk-cache-size=1',
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
  const versionRes = await fetch('http://127.0.0.1:9234/json/list');
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
  const failedAssets = [];
  await sendCommand('Runtime.enable');
  await sendCommand('Page.enable');
  await sendCommand('Network.enable');
  await sendCommand('Network.setCacheDisabled', { cacheDisabled: true });

  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.method === 'Runtime.exceptionThrown') {
      consoleErrors.push(msg.params?.exceptionDetails?.text || 'Runtime exception');
    }
    if (msg.method === 'Network.responseReceived') {
      const { url, status } = msg.params.response;
      if (status >= 400 && !url.includes('favicon')) {
        failedAssets.push(`${status} ${url}`);
      }
    }
  });

  await sendCommand('Emulation.setDeviceMetricsOverride', {
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
    mobile: false
  });

  console.log('Navigating to Live Production:', liveUrl);
  await sendCommand('Page.navigate', { url: liveUrl });

  console.log('Waiting for live 3D assets (Ferrari GLB, Traffic GLBs, Sky HDR) to load from CDN...');
  let gameReady = false;
  for (let i = 0; i < 90; i++) {
    const readyRes = await sendCommand('Runtime.evaluate', {
      expression: "!!window.highwayRacerGame && !document.getElementById('loading-overlay')"
    });
    if (readyRes?.result?.result?.value) {
      gameReady = true;
      console.log(`Live game ready after ${(i * 0.5).toFixed(1)}s!`);
      break;
    }
    await sleep(500);
  }
  if (!gameReady) throw new Error('Live game failed to initialize within 45s!');

  await sleep(1800);

  // Verify live bundle script tag
  const bundleCheck = await sendCommand('Runtime.evaluate', {
    expression: `
      (() => {
        const scripts = [...document.querySelectorAll('script[type="module"]')].map(s => s.src);
        const styles = [...document.querySelectorAll('link[rel="stylesheet"]')].map(l => l.href);
        const lanes = window.highwayRacerGame.trafficManager.lanes;
        const subtitle = document.querySelector('.game-subtitle')?.textContent || '';
        return { scripts, styles, lanes, subtitle };
      })()
    `,
    returnByValue: true
  });
  const liveMeta = bundleCheck?.result?.result?.value;
  console.log('Live Bundle Metadata:', liveMeta);
  const bundleMatches = liveMeta.scripts.some((s) => s.includes(EXPECTED_BUNDLE));
  console.log(`Expected Bundle (${EXPECTED_BUNDLE}) Loaded Live: ${bundleMatches ? 'PASS ✔' : 'FAIL ✖'}`);
  if (!bundleMatches) {
    throw new Error(`Live bundle mismatch! Loaded: ${liveMeta.scripts.join(', ')}`);
  }

  // Capture Live Menu Screenshot
  const menuSnap = await sendCommand('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(artifactDir, 'live_5lane_menu.png'), Buffer.from(menuSnap.result.data, 'base64'));
  console.log('Saved Live Menu screenshot.');

  // Start Race
  await sendCommand('Runtime.evaluate', {
    expression: "document.getElementById('btn-start-game').click();",
    returnByValue: true
  });
  await sleep(400);

  // Prevent accidental crash modal during automated live telemetry cruise while preserving near-miss scoring
  await sendCommand('Runtime.evaluate', {
    expression: "window.highwayRacerGame.collisionSystem.handleCrash = () => {};",
    returnByValue: true
  });

  const evalTelemetry = async () => {
    const res = await sendCommand('Runtime.evaluate', {
      expression: `
        (() => {
          const game = window.highwayRacerGame;
          const p = game.playerCar;
          const spline = game.environment.spline;
          const traffic = game.trafficManager;
          const cam = game.sceneManager.camera;
          const screenPos = p.position.clone().project(cam);
          const frame = spline.getFrameAt(p.currentS);

          p.group.updateMatrixWorld(true);
          const e = p.group.matrixWorld.elements;
          const len = Math.hypot(e[8], e[10]) || 1;
          const dot = Math.max(-1, Math.min(1, (e[8] / len) * frame.tangent.x + (e[10] / len) * frame.tangent.z));
          const meshAngleErrDeg = Math.acos(dot) * (180 / Math.PI);

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

          let minBuildingEdgeClearance = 999;
          for (const seg of game.environment.segments) {
            for (const b of (seg.userData.buildings || [])) {
              const proj = spline.project({ x: b.x, y: 0, z: b.z, distanceToSquared(pt) { return (pt.x - b.x) ** 2 + (pt.z - b.z) ** 2; } }, b.s);
              const clr = Math.abs(proj.u) - b.halfDiag - 11.2;
              if (clr < minBuildingEdgeClearance) minBuildingEdgeClearance = clr;
            }
          }

          return {
            speedKmh: Math.round(p.speedKmh),
            s: Number(p.currentS.toFixed(2)),
            u: Number(p.currentU.toFixed(4)),
            heading: Number(frame.heading.toFixed(4)),
            curvature: Number(frame.curvature.toFixed(5)),
            meshAngleErrDeg: Number(meshAngleErrDeg.toFixed(2)),
            maxTrafficAngleErrDeg: Number(maxTrafficAngleErrDeg.toFixed(2)),
            screenX: Number(screenPos.x.toFixed(4)),
            driveMode: p.driveMode,
            difficultyLevel: game.gameState.difficultyLevel,
            levelName: game.gameState.getLevelName(),
            score: Math.round(game.gameState.score),
            activeTrafficCount: activeCars.length,
            oncomingCount: oncomingCars.length,
            minBuildingEdgeClearance: Number(minBuildingEdgeClearance.toFixed(2)),
            cameraMode: game.cameraController.modes[game.cameraController.mode]
          };
        })()
      `,
      returnByValue: true
    });
    return res?.result?.result?.value;
  };

  // Accelerate
  await sendCommand('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'ArrowUp', code: 'ArrowUp', windowsVirtualKeyCode: 38 });
  await sleep(2200);

  // 1. Live Steering Left / Right Check
  const bL = await evalTelemetry();
  await sendCommand('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'ArrowLeft', code: 'ArrowLeft', windowsVirtualKeyCode: 37 });
  await sleep(800);
  const aL = await evalTelemetry();
  await sendCommand('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowLeft', code: 'ArrowLeft', windowsVirtualKeyCode: 37 });
  const liveLeftPass = (aL.u - bL.u) > 0.5 && (aL.screenX - bL.screenX) < 0;
  console.log(`Live Steer LEFT:  Δu = +${(aL.u - bL.u).toFixed(3)}m, ΔscreenX = ${(aL.screenX - bL.screenX).toFixed(4)} -> ${liveLeftPass ? 'PASS ✔' : 'FAIL ✖'}`);

  await sleep(400);
  const bR = await evalTelemetry();
  await sendCommand('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 });
  await sleep(800);
  const aR = await evalTelemetry();
  await sendCommand('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 });
  const liveRightPass = (aR.u - bR.u) < -0.5 && (aR.screenX - bR.screenX) > 0;
  console.log(`Live Steer RIGHT: Δu = ${(aR.u - bR.u).toFixed(3)}m, ΔscreenX = +${(aR.screenX - bR.screenX).toFixed(4)} -> ${liveRightPass ? 'PASS ✔' : 'FAIL ✖'}`);

  // 2. Live 5-Second Zero-Drift Check
  await sleep(600);
  const z0 = await evalTelemetry();
  let maxLiveDrift = 0;
  for (let i = 0; i < 10; i++) {
    await sleep(500);
    const zSample = await evalTelemetry();
    maxLiveDrift = Math.max(maxLiveDrift, Math.abs(zSample.u - z0.u));
  }
  const liveZeroDriftPass = maxLiveDrift < 0.001;
  console.log(`Live 5s Zero-Input Drift: maxDrift = ${maxLiveDrift.toFixed(6)}m -> ${liveZeroDriftPass ? 'PASS ✔' : 'FAIL ✖'}`);

  // 3. Live High-Speed Curve & Multi-Level Cruise (30s with Nitro)
  const samples = [];
  for (let sec = 1; sec <= 32; sec++) {
    if (sec % 8 === 1) {
      await sendCommand('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'ShiftLeft', code: 'ShiftLeft', windowsVirtualKeyCode: 16 });
    } else if (sec % 8 === 5) {
      await sendCommand('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ShiftLeft', code: 'ShiftLeft', windowsVirtualKeyCode: 16 });
    }
    await sleep(1000);
    const t = await evalTelemetry();
    samples.push(t);
    if (sec === 18) {
      const curveSnap = await sendCommand('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(artifactDir, 'live_5lane_desktop_curve.png'), Buffer.from(curveSnap.result.data, 'base64'));
      console.log(`Saved Live Desktop Curved Highway screenshot at s=${t.s}m (Level ${t.difficultyLevel}, heading=${t.heading}rad, meshErr=${t.meshAngleErrDeg}°).`);
    }
  }
  await sendCommand('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ShiftLeft', code: 'ShiftLeft', windowsVirtualKeyCode: 16 });

  const liveFinal = samples[samples.length - 1];
  const liveNoOncoming = samples.every(s => s.oncomingCount === 0);
  const liveMaxCarErr = Math.max(...samples.map(s => s.meshAngleErrDeg));
  const liveMaxTrafficErr = Math.max(...samples.map(s => s.maxTrafficAngleErrDeg));
  const liveMinBldg = Math.min(...samples.map(s => s.minBuildingEdgeClearance));

  console.log(`Live Cruise Final Distance: ${liveFinal.s}m (Level ${liveFinal.difficultyLevel} - ${liveFinal.levelName}), Score: ${liveFinal.score}`);
  console.log(`Live Zero Oncoming Traffic: ${liveNoOncoming ? 'PASS ✔' : 'FAIL ✖'}`);
  console.log(`Live Ferrari 3D Curve Mesh Error: ${liveMaxCarErr.toFixed(2)}° -> ${liveMaxCarErr <= 5 ? 'PASS ✔' : 'FAIL ✖'}`);
  console.log(`Live Traffic 3D Curve Mesh Error: ${liveMaxTrafficErr.toFixed(2)}° -> ${liveMaxTrafficErr <= 5 ? 'PASS ✔' : 'FAIL ✖'}`);
  console.log(`Live Min 3D Building Clearance: ${liveMinBldg.toFixed(2)}m -> ${liveMinBldg >= 15 ? 'PASS ✔' : 'FAIL ✖'}`);

  // 4. Live Cockpit Camera Check
  await sendCommand('Runtime.evaluate', { expression: "document.getElementById('btn-hud-camera').click();" });
  await sleep(900);
  const liveCockpit = await evalTelemetry();
  const liveCockpitSnap = await sendCommand('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(artifactDir, 'live_5lane_cockpit.png'), Buffer.from(liveCockpitSnap.result.data, 'base64'));
  console.log(`Live Cockpit Mode: ${liveCockpit.cameraMode} -> ${liveCockpit.cameraMode === 'COCKPIT' ? 'PASS ✔' : 'FAIL ✖'}`);

  // Return to CHASE
  await sendCommand('Runtime.evaluate', { expression: "document.getElementById('btn-hud-camera').click();" });
  await sleep(300);
  await sendCommand('Runtime.evaluate', { expression: "document.getElementById('btn-hud-camera').click();" });
  await sleep(900);

  // 5. Live Mobile Portrait (390x844) & Landscape (844x390)
  await sendCommand('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true
  });
  await sendCommand('Emulation.setTouchEmulationEnabled', { enabled: true });
  await sleep(1200);

  const mb0 = await evalTelemetry();
  await sendCommand('Runtime.evaluate', {
    expression: "document.getElementById('touch-left').dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));"
  });
  await sleep(500);
  const mb1 = await evalTelemetry();
  await sendCommand('Runtime.evaluate', {
    expression: "document.getElementById('touch-left').dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));"
  });
  await sleep(400);
  const liveMobileSteerPass = (mb1.u - mb0.u) > 0.3;
  console.log(`Live Mobile Touch LEFT Δu = +${(mb1.u - mb0.u).toFixed(3)}m -> ${liveMobileSteerPass ? 'PASS ✔' : 'FAIL ✖'}`);

  const mobPortSnap = await sendCommand('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(artifactDir, 'live_5lane_mobile_portrait.png'), Buffer.from(mobPortSnap.result.data, 'base64'));

  await sendCommand('Emulation.setDeviceMetricsOverride', {
    width: 844,
    height: 390,
    deviceScaleFactor: 2,
    mobile: true
  });
  await sleep(1200);
  const mobLandSnap = await sendCommand('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(artifactDir, 'live_5lane_mobile_landscape.png'), Buffer.from(mobLandSnap.result.data, 'base64'));
  console.log('Saved Live Mobile Portrait & Landscape screenshots.');

  console.log(`Live Failed Asset Requests: ${failedAssets.length} -> ${failedAssets.length === 0 ? 'PASS ✔' : 'FAIL ✖'}`);
  console.log(`Live Console Exceptions: ${consoleErrors.length} -> ${consoleErrors.length === 0 ? 'PASS ✔' : 'FAIL ✖'}`);

  const allLivePass = bundleMatches && liveLeftPass && liveRightPass && liveZeroDriftPass &&
    liveNoOncoming && liveMaxCarErr <= 5 && liveMaxTrafficErr <= 5 && liveMinBldg >= 15 &&
    liveMobileSteerPass && failedAssets.length === 0 && consoleErrors.length === 0;

  if (!allLivePass) {
    console.error('LIVE PRODUCTION VERIFICATION FAILED!');
    process.exitCode = 1;
  } else {
    console.log('\n=============================================================');
    console.log('ALL LIVE PRODUCTION VERIFICATION TESTS PASSED 100%!');
    console.log('=============================================================');
  }
} catch (err) {
  console.error('Live test error:', err);
  process.exitCode = 1;
} finally {
  try { chromeProcess.kill('SIGINT'); } catch (e) {}
  process.exit(process.exitCode || 0);
}
