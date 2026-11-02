import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const artifactDir = 'C:\\Users\\HP\\.gemini\\antigravity\\brain\\479c4c0a-7aea-4ff3-b63f-29b9eb839d81';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.hdr': 'application/octet-stream',
  '.glb': 'model/gltf-binary',
  '.wasm': 'application/wasm',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, 'http://127.0.0.1:4188');
  let pathname = decodeURIComponent(parsedUrl.pathname);
  if (pathname === '/' || pathname === '/games/highway-racer' || pathname === '/games/highway-racer/') {
    pathname = '/games/highway-racer/index.html';
  }

  const filePath = path.join(rootDir, pathname.replace(/^\//, ''));
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end(`404 Not Found: ${pathname}`);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache'
    });
    fs.createReadStream(filePath).pipe(res);
  });
});

await new Promise((resolve) => server.listen(4188, '127.0.0.1', resolve));
console.log('Local test HTTP server listening on http://127.0.0.1:4188/games/highway-racer/');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = path.join(__dirname, '.chrome-test-profile-mobile-fix');

const chromeArgs = [
  '--headless=new',
  '--remote-debugging-port=9235',
  '--use-gl=angle',
  '--enable-webgl',
  '--disable-application-cache',
  '--disk-cache-size=1',
  '--window-size=390,844',
  '--no-first-run',
  '--no-default-browser-check',
  `--user-data-dir=${userDataDir}`,
  'about:blank'
];

const chromeProcess = spawn(chromePath, chromeArgs);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
await sleep(1500);

try {
  const versionRes = await fetch('http://127.0.0.1:9235/json/list');
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
  await sendCommand('Network.enable');

  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.method === 'Runtime.exceptionThrown') {
      consoleErrors.push(msg.params?.exceptionDetails?.text || 'Runtime exception');
    }
  });

  // Emulate iPhone 14/15 Mobile Portrait
  await sendCommand('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 3,
    mobile: true
  });
  await sendCommand('Emulation.setTouchEmulationEnabled', {
    enabled: true,
    maxTouchPoints: 5
  });
  await sendCommand('Network.setUserAgentOverride', {
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1'
  });

  const targetUrl = 'http://127.0.0.1:4188/games/highway-racer/';
  console.log('Navigating to local build:', targetUrl);
  await sendCommand('Page.navigate', { url: targetUrl });

  console.log('Waiting for game readiness...');
  let ready = false;
  for (let i = 0; i < 60; i++) {
    const evalRes = await sendCommand('Runtime.evaluate', {
      expression: "!!window.highwayRacerGame && !document.getElementById('loading-overlay')"
    });
    if (evalRes?.result?.result?.value) {
      ready = true;
      break;
    }
    await sleep(400);
  }
  if (!ready) throw new Error('Game failed to initialize within 25 seconds!');

  await sleep(1000);

  // Click START RACE
  console.log('Starting race...');
  await sendCommand('Runtime.evaluate', {
    expression: "document.getElementById('btn-start-game').click()"
  });
  await sleep(1500);

  // Inject real Netlify HUD badge iframe simulation to test overlap resistance
  await sendCommand('Runtime.evaluate', {
    expression: `
      (() => {
        if (document.getElementById('nl-badge-frame')) return;
        const frame = document.createElement('iframe');
        frame.id = 'nl-badge-frame';
        frame.setAttribute('title', 'Powered by Netlify');
        frame.style.cssText = 'position:fixed;bottom:0;right:0;border:0;margin:0;padding:0;background:transparent;color-scheme:dark;z-index:2147483645;width:216px;height:92px;clip-path:path("M0 40H216V92H0Z");';
        const docHtml = '<!doctype html><html><body style="margin:0;display:flex;align-items:flex-end;justify-content:flex-end;height:100vh;padding:12px;box-sizing:border-box;"><div style="display:flex;align-items:center;gap:8px;background:linear-gradient(180deg,#142b34,#0e1e25);border:1px solid rgba(255,255,255,0.1);border-radius:999px;padding:9px 14px 9px 11px;font-family:sans-serif;font-size:13px;font-weight:600;color:#f4f9f9;white-space:nowrap;box-shadow:0 4px 14px rgba(0,0,0,0.4);"><span style="color:#05bdba;font-size:16px;">✦</span> <span style="color:#d5e3e6;font-weight:500;">Powered by</span> <span>Netlify</span></div></body></html>';
        frame.srcdoc = docHtml;
        document.body.appendChild(frame);
      })()
    `
  });
  await sleep(600);

  // Drive forward for 2.5 seconds using touch accelerator
  console.log('Simulating touch accelerator and steering on mobile...');
  await sendCommand('Runtime.evaluate', {
    expression: `
      (() => {
        window.highwayRacerGame.input.setTouchInput('throttle', true);
        window.highwayRacerGame.input.setTouchInput('left', true);
      })()
    `
  });
  await sleep(2200);

  await sendCommand('Runtime.evaluate', {
    expression: `
      (() => {
        window.highwayRacerGame.input.setTouchInput('throttle', true);
        window.highwayRacerGame.input.setTouchInput('left', false);
      })()
    `
  });
  await sleep(800);

  // Measure all bounding boxes and layout telemetry
  const layoutTelemetry = await sendCommand('Runtime.evaluate', {
    expression: `
      (() => {
        const getBox = id => {
          const el = document.getElementById(id);
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return {
            id,
            x: Math.round(r.x),
            y: Math.round(r.y),
            width: Math.round(r.width),
            height: Math.round(r.height),
            top: Math.round(r.top),
            bottom: Math.round(r.bottom),
            left: Math.round(r.left),
            right: Math.round(r.right),
            visible: r.width > 0 && r.height > 0 && window.getComputedStyle(el).display !== 'none'
          };
        };

        const vh = window.innerHeight;
        const vw = window.innerWidth;

        const leftBtn = getBox('touch-left');
        const rightBtn = getBox('touch-right');
        const brakeBtn = getBox('touch-brake');
        const gasBtn = getBox('touch-throttle');
        const gearBtn = getBox('touch-gear');
        const driftBtn = getBox('touch-drift');
        const nitroBtn = getBox('touch-nitro');
        const speedo = getBox('hud-speedometer-box');
        const netlify = getBox('nl-badge-frame');
        const mobileControls = document.querySelector('.hud-mobile-controls')?.getBoundingClientRect();

        const brakeFromBottom = vh - brakeBtn.bottom;
        const gasFromBottom = vh - gasBtn.bottom;
        const leftSteerFromBottom = vh - leftBtn.bottom;
        const rightSteerFromBottom = vh - rightBtn.bottom;

        // Netlify badge pill is in the bottom 48px of the iframe
        const netlifyPillTop = (netlify?.top || 0) + 40;
        const netlifyOverlapBrake = !(brakeBtn.bottom <= netlifyPillTop || brakeBtn.right <= (netlify?.left || 0));
        const netlifyOverlapGas = !(gasBtn.bottom <= netlifyPillTop || gasBtn.right <= (netlify?.left || 0));

        // Speedometer vs Pedals / Actions gap
        const speedoBottom = speedo ? speedo.bottom : 0;
        const highestActionTop = Math.min(gearBtn?.top || 9999, driftBtn?.top || 9999, nitroBtn?.top || 9999);
        const actionSpeedoGap = highestActionTop - speedoBottom;

        const player = window.highwayRacerGame.playerCar;

        return {
          viewport: { vw, vh },
          brakeFromBottom,
          gasFromBottom,
          leftSteerFromBottom,
          rightSteerFromBottom,
          actionSpeedoGap,
          netlifyPillTop,
          netlifyOverlapBrake,
          netlifyOverlapGas,
          boxes: {
            leftBtn, rightBtn, brakeBtn, gasBtn, gearBtn, driftBtn, nitroBtn, speedo, netlify
          },
          telemetry: {
            speedKmh: player.speedKmh,
            currentU: player.currentU,
            currentS: player.currentS,
            gear: player.gear
          }
        };
      })()
    `,
    returnByValue: true
  });

  const res = layoutTelemetry.result.result.value;
  console.log('Mobile Portrait Layout Analysis:');
  console.log(`  Viewport: ${res.viewport.vw}x${res.viewport.vh}`);
  console.log(`  Brake clearance above screen bottom: ${res.brakeFromBottom}px (was 16px, now safely elevated)`);
  console.log(`  Gas pedal clearance above screen bottom: ${res.gasFromBottom}px (was 16px, now safely elevated)`);
  console.log(`  Left steer clearance above screen bottom: ${res.leftSteerFromBottom}px`);
  console.log(`  Right steer clearance above screen bottom: ${res.rightSteerFromBottom}px`);
  console.log(`  Netlify badge pill top: Y=${res.netlifyPillTop}px, Pedals bottom: Y=${res.boxes.gasBtn.bottom}px`);
  console.log(`  Overlap with Brake: ${res.netlifyOverlapBrake ? 'YES (FAIL)' : 'NO (CLEARED ✔)'}`);
  console.log(`  Overlap with Gas: ${res.netlifyOverlapGas ? 'YES (FAIL)' : 'NO (CLEARED ✔)'}`);
  console.log(`  Vertical gap between actions and speedometer: ${res.actionSpeedoGap}px`);
  console.log(`  Player driving speed: ${res.telemetry.speedKmh.toFixed(1)} km/h, lateral U: ${res.telemetry.currentU.toFixed(2)}m`);

  // Assertions for mobile portrait
  if (res.brakeFromBottom < 50) throw new Error(`Brake pedal too low: ${res.brakeFromBottom}px from bottom!`);
  if (res.gasFromBottom < 50) throw new Error(`Gas pedal too low: ${res.gasFromBottom}px from bottom!`);
  if (res.leftSteerFromBottom < 50) throw new Error(`Left steering button too low: ${res.leftSteerFromBottom}px from bottom!`);
  if (res.netlifyOverlapBrake || res.netlifyOverlapGas) throw new Error('Netlify badge overlaps with driving pedals!');
  if (res.actionSpeedoGap < 0) throw new Error('Speedometer overlaps with mobile action buttons!');

  // Capture Mobile Portrait Screenshot
  const portraitShot = await sendCommand('Page.captureScreenshot', { format: 'png' });
  const portraitPath = path.join(artifactDir, 'updated_mobile_portrait_gameplay.png');
  fs.writeFileSync(portraitPath, Buffer.from(portraitShot.result.data, 'base64'));
  console.log('Saved portrait screenshot to:', portraitPath);

  // Switch to Mobile Landscape (844 x 390)
  console.log('\nTesting Mobile Landscape Viewport (844x390)...');
  await sendCommand('Emulation.setDeviceMetricsOverride', {
    width: 844,
    height: 390,
    deviceScaleFactor: 2,
    mobile: true,
    screenOrientation: {
      type: 'landscapePrimary',
      angle: 90
    }
  });
  await sleep(1200);

  const landscapeTelemetry = await sendCommand('Runtime.evaluate', {
    expression: `
      (() => {
        const getBox = id => {
          const el = document.getElementById(id);
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return { id, x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height), top: Math.round(r.top), bottom: Math.round(r.bottom) };
        };
        const vh = window.innerHeight;
        const gasBtn = getBox('touch-throttle');
        const brakeBtn = getBox('touch-brake');
        const leftBtn = getBox('touch-left');
        const speedo = getBox('hud-speedometer-box');
        return {
          vh,
          gasFromBottom: gasBtn ? (vh - gasBtn.bottom) : null,
          brakeFromBottom: brakeBtn ? (vh - brakeBtn.bottom) : null,
          leftFromBottom: leftBtn ? (vh - leftBtn.bottom) : null,
          speedoBottom: speedo ? speedo.bottom : null,
          gasBtn, brakeBtn
        };
      })()
    `,
    returnByValue: true
  });

  if (landscapeTelemetry.result?.exceptionDetails) {
    console.error('Landscape evaluation error:', landscapeTelemetry.result.exceptionDetails);
  }

  const landRes = landscapeTelemetry.result?.result?.value;
  console.log('Mobile Landscape Layout Analysis:');
  console.log(`  Gas clearance above bottom: ${landRes?.gasFromBottom}px`);
  console.log(`  Brake clearance above bottom: ${landRes?.brakeFromBottom}px`);
  console.log(`  Left steer clearance above bottom: ${landRes?.leftFromBottom}px`);

  if (landRes.gasFromBottom < 40) throw new Error(`Landscape gas pedal too low: ${landRes.gasFromBottom}px from bottom!`);
  if (landRes.brakeFromBottom < 40) throw new Error(`Landscape brake pedal too low: ${landRes.brakeFromBottom}px from bottom!`);

  // Capture Mobile Landscape Screenshot
  const landscapeShot = await sendCommand('Page.captureScreenshot', { format: 'png' });
  const landscapePath = path.join(artifactDir, 'updated_mobile_landscape_gameplay.png');
  fs.writeFileSync(landscapePath, Buffer.from(landscapeShot.result.data, 'base64'));
  console.log('Saved landscape screenshot to:', landscapePath);

  // Switch to Desktop Viewport (1920 x 1080) to verify desktop layout unchanged
  console.log('\nTesting Desktop Viewport (1920x1080)...');
  await sendCommand('Emulation.setDeviceMetricsOverride', {
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
    mobile: false
  });
  await sendCommand('Emulation.setTouchEmulationEnabled', { enabled: false });
  await sleep(1000);

  const desktopCheck = await sendCommand('Runtime.evaluate', {
    expression: `
      (() => {
        const mobileControls = document.querySelector('.hud-mobile-controls');
        const style = window.getComputedStyle(mobileControls);
        const routeCaption = document.querySelector('.route-caption');
        const routeCaptionStyle = window.getComputedStyle(routeCaption);
        const speedo = document.querySelector('.hud-telemetry-cluster');
        const speedoStyle = window.getComputedStyle(speedo);

        return {
          mobileHidden: style.display === 'none',
          routeCaptionVisible: routeCaptionStyle.display !== 'none',
          speedoBottom: speedoStyle.bottom,
          speedoRight: speedoStyle.right
        };
      })()
    `,
    returnByValue: true
  });

  const deskRes = desktopCheck.result.result.value;
  console.log('Desktop Layout Check:');
  console.log(`  Mobile touch controls hidden on desktop: ${deskRes.mobileHidden ? 'YES ✔' : 'NO ❌'}`);
  console.log(`  Route caption visible on desktop: ${deskRes.routeCaptionVisible ? 'YES ✔' : 'NO ❌'}`);
  console.log(`  Desktop telemetry cluster position: bottom=${deskRes.speedoBottom}, right=${deskRes.speedoRight}`);

  if (!deskRes.mobileHidden) throw new Error('Mobile touch controls must be hidden on desktop viewports!');
  if (!deskRes.routeCaptionVisible) throw new Error('Route caption must remain visible on desktop!');

  // Capture Desktop Screenshot
  const desktopShot = await sendCommand('Page.captureScreenshot', { format: 'png' });
  const desktopPath = path.join(artifactDir, 'updated_desktop_gameplay.png');
  fs.writeFileSync(desktopPath, Buffer.from(desktopShot.result.data, 'base64'));
  console.log('Saved desktop screenshot to:', desktopPath);

  console.log('\n=== ALL MOBILE FIX ASSERTIONS PASSED 100% ===');
} finally {
  try {
    chromeProcess.kill('SIGKILL');
  } catch {}
  server.close();
}
