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

await new Promise((resolve) => server.listen(8081, '127.0.0.1', resolve));
console.log('Test HTTP server listening at http://127.0.0.1:8081/');

// 2. Launch Chrome
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = path.join(__dirname, '.chrome-test-profile-repair');

const chromeArgs = [
  '--headless=new',
  '--remote-debugging-port=9223',
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
  const versionRes = await fetch('http://127.0.0.1:9223/json/list');
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

  await sendCommand('Runtime.enable');
  await sendCommand('Page.enable');
  await sendCommand('Emulation.setDeviceMetricsOverride', {
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
    mobile: false
  });

  console.log('Navigating to http://127.0.0.1:8081/games/highway-racer/ ...');
  await sendCommand('Page.navigate', { url: 'http://127.0.0.1:8081/games/highway-racer/' });

  // Wait for 3D start menu scene
  await sleep(3000);

  // Capture Menu Screenshot
  const menuSnap = await sendCommand('Page.captureScreenshot', { format: 'png' });
  const menuSnapPath = path.join(artifactDir, 'repair_menu.png');
  fs.writeFileSync(menuSnapPath, Buffer.from(menuSnap.result.data, 'base64'));
  console.log('Saved Menu screenshot to:', menuSnapPath);

  // Click START RACE
  console.log('Starting race...');
  await sendCommand('Runtime.evaluate', {
    expression: "document.getElementById('btn-start-game').click();",
    returnByValue: true
  });
  await sleep(500);

  // Disable collision interruptions during pure steering calibration tests
  await sendCommand('Runtime.evaluate', {
    expression: "window.highwayRacerGame.collisionSystem.checkCollisions = () => {};",
    returnByValue: true
  });

  // Accelerate to ~100 km/h
  console.log('Accelerating to ~100 km/h...');
  await sendCommand('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'ArrowUp', code: 'ArrowUp', windowsVirtualKeyCode: 38 });
  await sleep(2500);

  // Evaluate initial driving state
  const evalTelemetry = async () => {
    const res = await sendCommand('Runtime.evaluate', {
      expression: `
        (() => {
          const game = window.highwayRacerGame;
          const p = game.playerCar;
          const cam = game.sceneManager.camera;
          const screenPos = p.position.clone().project(cam);
          return {
            speedKmh: Math.round(p.speedKmh),
            s: Number(p.currentS.toFixed(2)),
            u: Number(p.currentU.toFixed(4)),
            lateralVel: Number(p.lateralVelocity.toFixed(4)),
            steerAngle: Number(p.steerAngle.toFixed(4)),
            heading: Number(p.heading.toFixed(4)),
            driveMode: p.driveMode,
            inputSteer: Number(game.input.steer.toFixed(4)),
            screenX: Number(screenPos.x.toFixed(4)),
            isDrifting: p.isDrifting
          };
        })()
      `,
      returnByValue: true
    });
    return res?.result?.result?.value || res?.result?.value;
  };

  const t0 = await evalTelemetry();
  console.log('\n--- INITIAL BASELINE TELEMETRY ---');
  console.log(t0);

  // =========================================================================
  // TEST 1: PRESS LEFT FOR 1.0 SECOND
  // =========================================================================
  console.log('\n>>> EXECUTING TEST 1: Press LEFT for 1.0s <<<');
  const t1_before = await evalTelemetry();
  await sendCommand('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'ArrowLeft', code: 'ArrowLeft', windowsVirtualKeyCode: 37 });
  await sleep(1000);
  const t1_after = await evalTelemetry();
  await sendCommand('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowLeft', code: 'ArrowLeft', windowsVirtualKeyCode: 37 });

  const leftSnap = await sendCommand('Page.captureScreenshot', { format: 'png' });
  const leftSnapPath = path.join(artifactDir, 'repair_steer_left.png');
  fs.writeFileSync(leftSnapPath, Buffer.from(leftSnap.result.data, 'base64'));

  const deltaU_Left = t1_after.u - t1_before.u;
  const deltaScreen_Left = t1_after.screenX - t1_before.screenX;
  console.log(`Initial: u = ${t1_before.u}, screenX = ${t1_before.screenX}`);
  console.log(`Final:   u = ${t1_after.u}, screenX = ${t1_after.screenX}`);
  console.log(`Δu:      +${deltaU_Left.toFixed(3)}m (shifted left/outer)`);
  console.log(`Δscreen: ${deltaScreen_Left.toFixed(3)} (NDC moved LEFT)`);
  const test1_passed = deltaU_Left > 0.5 && deltaScreen_Left < 0;
  console.log(`TEST 1 RESULT: ${test1_passed ? 'PASS ✔' : 'FAIL ✖'}`);

  // Let car stabilize for 500ms
  await sleep(500);

  // =========================================================================
  // TEST 2: PRESS RIGHT FOR 1.0 SECOND
  // =========================================================================
  console.log('\n>>> EXECUTING TEST 2: Press RIGHT for 1.0s <<<');
  const t2_before = await evalTelemetry();
  await sendCommand('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 });
  await sleep(1000);
  const t2_after = await evalTelemetry();
  await sendCommand('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 });

  const rightSnap = await sendCommand('Page.captureScreenshot', { format: 'png' });
  const rightSnapPath = path.join(artifactDir, 'repair_steer_right.png');
  fs.writeFileSync(rightSnapPath, Buffer.from(rightSnap.result.data, 'base64'));

  const deltaU_Right = t2_after.u - t2_before.u;
  const deltaScreen_Right = t2_after.screenX - t2_before.screenX;
  console.log(`Initial: u = ${t2_before.u}, screenX = ${t2_before.screenX}`);
  console.log(`Final:   u = ${t2_after.u}, screenX = ${t2_after.screenX}`);
  console.log(`Δu:      ${deltaU_Right.toFixed(3)}m (shifted right/inner)`);
  console.log(`Δscreen: +${deltaScreen_Right.toFixed(3)} (NDC moved RIGHT)`);
  const test2_passed = deltaU_Right < -0.5 && deltaScreen_Right > 0;
  console.log(`TEST 2 RESULT: ${test2_passed ? 'PASS ✔' : 'FAIL ✖'}`);

  // =========================================================================
  // TEST 3: ZERO-INPUT STABILITY OVER 5.0 SECONDS
  // =========================================================================
  console.log('\n>>> EXECUTING TEST 3: Release all steering for 5.0s <<<');
  await sleep(300); // Allow damping to settle
  const t3_start = await evalTelemetry();
  const stabilitySamples = [];
  for (let i = 0; i < 10; i++) {
    await sleep(500);
    const sample = await evalTelemetry();
    stabilitySamples.push(sample);
  }
  const t3_end = stabilitySamples[stabilitySamples.length - 1];
  const maxDeltaU_Stability = Math.max(...stabilitySamples.map(s => Math.abs(s.u - t3_start.u)));

  const stabilitySnap = await sendCommand('Page.captureScreenshot', { format: 'png' });
  const stabilitySnapPath = path.join(artifactDir, 'repair_zero_input_stability.png');
  fs.writeFileSync(stabilitySnapPath, Buffer.from(stabilitySnap.result.data, 'base64'));

  console.log(`Start u:      ${t3_start.u}`);
  console.log(`End u:        ${t3_end.u}`);
  console.log(`Max |Δu|:     ${maxDeltaU_Stability.toFixed(6)}m`);
  console.log(`Lateral Vel:  ${t3_end.lateralVel} m/s`);
  const test3_passed = maxDeltaU_Stability < 0.001 && t3_end.lateralVel === 0;
  console.log(`TEST 3 RESULT: ${test3_passed ? 'PASS ✔ (Rock-solid zero drift)' : 'FAIL ✖'}`);

  // =========================================================================
  // TEST 4: ROAD BOUNDARY HOLD (NO BOUNCING)
  // =========================================================================
  console.log('\n>>> EXECUTING TEST 4: Hold steering against road boundary for 2.5s <<<');
  await sendCommand('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'ArrowLeft', code: 'ArrowLeft', windowsVirtualKeyCode: 37 });
  const boundarySamples = [];
  for (let i = 0; i < 12; i++) {
    await sleep(200);
    boundarySamples.push(await evalTelemetry());
  }
  await sendCommand('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowLeft', code: 'ArrowLeft', windowsVirtualKeyCode: 37 });

  const boundarySnap = await sendCommand('Page.captureScreenshot', { format: 'png' });
  const boundarySnapPath = path.join(artifactDir, 'repair_boundary_clamp.png');
  fs.writeFileSync(boundarySnapPath, Buffer.from(boundarySnap.result.data, 'base64'));

  const lastBoundary = boundarySamples[boundarySamples.length - 1];
  const bounceReversals = boundarySamples.filter(s => s.lateralVel < -0.1).length;
  console.log(`Clamped u:         ${lastBoundary.u} (outer limit 8.6)`);
  console.log(`Final lateralVel:  ${lastBoundary.lateralVel}`);
  console.log(`Bounces detected:  ${bounceReversals}`);
  const test4_passed = lastBoundary.u === 8.6 && bounceReversals === 0 && lastBoundary.lateralVel === 0;
  console.log(`TEST 4 RESULT:     ${test4_passed ? 'PASS ✔ (Clamped smoothly, 0 bounces)' : 'FAIL ✖'}`);

  // =========================================================================
  // TEST 5: S-CURVES HANDS-FREE AUTOMATIC FOLLOW
  // =========================================================================
  console.log('\n>>> EXECUTING TEST 5: Automatic curve following through S-bends <<<');
  // First gently steer back towards lane center u = 4.8
  await sendCommand('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 });
  await sleep(650);
  await sendCommand('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 });
  await sleep(600); // Allow damping to settle to exact 0.0000 m/s

  const t5_start = await evalTelemetry();
  console.log(`Entering curve stretch at s = ${t5_start.s}, u = ${t5_start.u}, lateralVel = ${t5_start.lateralVel}`);
  await sleep(4000); // Drive through curve stretch hands-free
  const t5_end = await evalTelemetry();

  const curveSnap = await sendCommand('Page.captureScreenshot', { format: 'png' });
  const curveSnapPath = path.join(artifactDir, 'repair_scurve_autofollow.png');
  fs.writeFileSync(curveSnapPath, Buffer.from(curveSnap.result.data, 'base64'));

  const curveDeltaU = Math.abs(t5_end.u - t5_start.u);
  console.log(`Exiting curve stretch at s = ${t5_end.s}, u = ${t5_end.u}, lateralVel = ${t5_end.lateralVel}`);
  console.log(`Distance traveled: ${(t5_end.s - t5_start.s).toFixed(1)}m`);
  console.log(`Lateral deviation: ${curveDeltaU.toFixed(6)}m`);
  const test5_passed = curveDeltaU < 0.001;
  console.log(`TEST 5 RESULT:     ${test5_passed ? 'PASS ✔ (Perfect hands-free curve tracking)' : 'FAIL ✖'}`);

  // =========================================================================
  // TEST 6: MOBILE TOUCH CONTROLS
  // =========================================================================
  console.log('\n>>> EXECUTING TEST 6: Mobile touch controls on 390x844 viewport <<<');
  await sendCommand('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true
  });
  await sleep(500);

  // Dispatch Touch Left (hold for 400ms to measure active inputSteer)
  await sendCommand('Runtime.evaluate', {
    expression: "window.highwayRacerGame.input.setTouchInput('left', true);"
  });
  await sleep(400);
  const touchLeftTelemetry = await evalTelemetry();
  await sendCommand('Runtime.evaluate', {
    expression: "window.highwayRacerGame.input.setTouchInput('left', false);"
  });
  await sleep(600);

  // Dispatch Touch Right (hold for 400ms to measure active inputSteer)
  await sendCommand('Runtime.evaluate', {
    expression: "window.highwayRacerGame.input.setTouchInput('right', true);"
  });
  await sleep(400);
  const touchRightTelemetry = await evalTelemetry();
  await sendCommand('Runtime.evaluate', {
    expression: "window.highwayRacerGame.input.setTouchInput('right', false);"
  });
  await sleep(600);

  const mobileSnap = await sendCommand('Page.captureScreenshot', { format: 'png' });
  const mobileSnapPath = path.join(artifactDir, 'repair_mobile_portrait.png');
  fs.writeFileSync(mobileSnapPath, Buffer.from(mobileSnap.result.data, 'base64'));

  console.log(`Mobile Touch Left:  u = ${touchLeftTelemetry.u}, inputSteer = ${touchLeftTelemetry.inputSteer}`);
  console.log(`Mobile Touch Right: u = ${touchRightTelemetry.u}, inputSteer = ${touchRightTelemetry.inputSteer}`);
  const test6_passed = touchLeftTelemetry.inputSteer > 0 && touchRightTelemetry.inputSteer < 0;
  console.log(`TEST 6 RESULT:      ${test6_passed ? 'PASS ✔ (Mobile touch steering verified)' : 'FAIL ✖'}`);

  console.log('\n====================================================');
  const allInBrowserPassed = test1_passed && test2_passed && test3_passed && test4_passed && test5_passed && test6_passed;
  console.log(`ALL IN-BROWSER REGRESSION TESTS: ${allInBrowserPassed ? 'SUCCESSFULLY PASSED! 🎉' : 'FAILURES DETECTED'}`);
  console.log('====================================================\n');

  ws.close();
} catch (err) {
  console.error('Test error:', err);
} finally {
  chromeProcess.kill();
  server.close();
  console.log('Cleaned up Chrome process and HTTP server.');
}
