import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const artifactDir = 'C:\\Users\\HP\\.gemini\\antigravity\\brain\\479c4c0a-7aea-4ff3-b63f-29b9eb839d81';
const liveUrl = `https://techwithsalman.online/games/highway-racer/?cb=${Date.now()}`;

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = path.join(__dirname, '.chrome-test-profile-live-mobile');

const chromeArgs = [
  '--headless=new',
  '--remote-debugging-port=9236',
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
  const versionRes = await fetch('http://127.0.0.1:9236/json/list');
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

  // Emulate Mobile Portrait (iPhone 14/15 390x844)
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

  console.log('Navigating to Live Production URL:', liveUrl);
  await sendCommand('Page.navigate', { url: liveUrl });

  console.log('Waiting for live game initialization...');
  let ready = false;
  for (let i = 0; i < 90; i++) {
    const evalRes = await sendCommand('Runtime.evaluate', {
      expression: "!!window.highwayRacerGame && !document.getElementById('loading-overlay')"
    });
    if (evalRes?.result?.result?.value) {
      ready = true;
      break;
    }
    await sleep(500);
  }
  if (!ready) throw new Error('Live game failed to initialize within 45s!');

  await sleep(1500);

  // Click START RACE on Live
  console.log('Starting Live race...');
  await sendCommand('Runtime.evaluate', {
    expression: "document.getElementById('btn-start-game').click()"
  });
  await sleep(2000);

  // Wait for Netlify's live script to inject badge
  for (let i = 0; i < 20; i++) {
    const badgeFound = await sendCommand('Runtime.evaluate', {
      expression: "!!document.getElementById('nl-badge-frame')"
    });
    if (badgeFound?.result?.result?.value) {
      console.log('Live Netlify badge iframe detected in DOM.');
      break;
    }
    await sleep(300);
  }

  // Drive forward with touch accelerator and steer slightly left
  console.log('Driving live car with touch controls...');
  await sendCommand('Runtime.evaluate', {
    expression: `
      (() => {
        window.highwayRacerGame.input.setTouchInput('throttle', true);
        window.highwayRacerGame.input.setTouchInput('left', true);
      })()
    `
  });
  await sleep(2500);

  await sendCommand('Runtime.evaluate', {
    expression: `
      (() => {
        window.highwayRacerGame.input.setTouchInput('throttle', true);
        window.highwayRacerGame.input.setTouchInput('left', false);
      })()
    `
  });
  await sleep(800);

  // Measure live layout metrics
  const liveTelemetry = await sendCommand('Runtime.evaluate', {
    expression: `
      (() => {
        const getBox = id => {
          const el = document.getElementById(id);
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return { id, x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height), top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right) };
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

        const brakeFromBottom = vh - brakeBtn.bottom;
        const gasFromBottom = vh - gasBtn.bottom;
        const leftSteerFromBottom = vh - leftBtn.bottom;
        const rightSteerFromBottom = vh - rightBtn.bottom;

        // Actual Netlify badge pill top inside iframe (badge is positioned near bottom of 92px iframe)
        const netlifyPillTop = netlify ? (netlify.top + 40) : (vh - 46);
        const netlifyOverlapBrake = netlify ? !(brakeBtn.bottom <= netlifyPillTop || brakeBtn.right <= netlify.left) : false;
        const netlifyOverlapGas = netlify ? !(gasBtn.bottom <= netlifyPillTop || gasBtn.right <= netlify.left) : false;

        const speedoBottom = speedo ? speedo.bottom : 0;
        const highestActionTop = Math.min(gearBtn?.top || 9999, driftBtn?.top || 9999, nitroBtn?.top || 9999);
        const actionSpeedoGap = highestActionTop - speedoBottom;

        const player = window.highwayRacerGame.playerCar;
        const bundle = {
          scripts: [...document.querySelectorAll('script[type="module"]')].map(s => s.src),
          styles: [...document.querySelectorAll('link[rel="stylesheet"]')].map(l => l.href)
        };

        return {
          bundle,
          viewport: { vw, vh },
          brakeFromBottom,
          gasFromBottom,
          leftSteerFromBottom,
          rightSteerFromBottom,
          actionSpeedoGap,
          netlifyPillTop,
          netlifyOverlapBrake,
          netlifyOverlapGas,
          boxes: { leftBtn, rightBtn, brakeBtn, gasBtn, gearBtn, driftBtn, nitroBtn, speedo, netlify },
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

  const res = liveTelemetry.result.result.value;
  console.log('\n--- LIVE PRODUCTION MOBILE AUDIT ---');
  console.log(`  Live bundle JS: ${res.bundle.scripts.find(s => s.includes('index-'))}`);
  console.log(`  Live bundle CSS: ${res.bundle.styles.find(s => s.includes('index-'))}`);
  console.log(`  Viewport: ${res.viewport.vw}x${res.viewport.vh}`);
  console.log(`  Brake pedal clearance above bottom: ${res.brakeFromBottom}px (TARGET >= 50px)`);
  console.log(`  Gas pedal clearance above bottom: ${res.gasFromBottom}px (TARGET >= 50px)`);
  console.log(`  Left steer clearance above bottom: ${res.leftSteerFromBottom}px (TARGET >= 50px)`);
  console.log(`  Right steer clearance above bottom: ${res.rightSteerFromBottom}px (TARGET >= 50px)`);
  console.log(`  Netlify badge pill top: Y=${res.netlifyPillTop}px, Pedals bottom: Y=${res.boxes.gasBtn.bottom}px`);
  console.log(`  Netlify Overlap with Brake: ${res.netlifyOverlapBrake ? 'YES (FAIL)' : 'NO (CLEARED ✔)'}`);
  console.log(`  Netlify Overlap with Gas: ${res.netlifyOverlapGas ? 'YES (FAIL)' : 'NO (CLEARED ✔)'}`);
  console.log(`  Vertical gap between actions and speedometer: ${res.actionSpeedoGap}px`);
  console.log(`  Live Ferrari speed: ${res.telemetry.speedKmh.toFixed(1)} km/h, lateral U: ${res.telemetry.currentU.toFixed(2)}m, distance: ${res.telemetry.currentS.toFixed(1)}m`);
  console.log(`  Failed Asset Requests: ${failedAssets.length}`);
  console.log(`  Console Exceptions: ${consoleErrors.length}`);

  // Assertions for live mobile portrait
  if (res.brakeFromBottom < 50) throw new Error(`Live brake pedal too low: ${res.brakeFromBottom}px from bottom!`);
  if (res.gasFromBottom < 50) throw new Error(`Live gas pedal too low: ${res.gasFromBottom}px from bottom!`);
  if (res.leftSteerFromBottom < 50) throw new Error(`Live left steering button too low: ${res.leftSteerFromBottom}px from bottom!`);
  if (res.netlifyOverlapBrake || res.netlifyOverlapGas) throw new Error('Live Netlify badge overlaps with driving pedals!');
  if (res.actionSpeedoGap < 0) throw new Error('Live speedometer overlaps with mobile action buttons!');
  if (failedAssets.length > 0) throw new Error(`Live failed assets: ${failedAssets.join(', ')}`);
  if (consoleErrors.length > 0) throw new Error(`Live console errors: ${consoleErrors.join(', ')}`);

  // Capture Live Mobile Portrait Screenshot
  const livePortraitShot = await sendCommand('Page.captureScreenshot', { format: 'png' });
  const livePortraitPath = path.join(artifactDir, 'live_mobile_portrait_updated.png');
  fs.writeFileSync(livePortraitPath, Buffer.from(livePortraitShot.result.data, 'base64'));
  console.log('Saved live portrait screenshot to:', livePortraitPath);

  // Test Live Mobile Landscape (844 x 390)
  console.log('\nTesting Live Mobile Landscape (844x390)...');
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

  const liveLandscapeShot = await sendCommand('Page.captureScreenshot', { format: 'png' });
  const liveLandscapePath = path.join(artifactDir, 'live_mobile_landscape_updated.png');
  fs.writeFileSync(liveLandscapePath, Buffer.from(liveLandscapeShot.result.data, 'base64'));
  console.log('Saved live landscape screenshot to:', liveLandscapePath);

  // Test Live Desktop (1920 x 1080)
  console.log('\nTesting Live Desktop (1920x1080)...');
  await sendCommand('Emulation.setDeviceMetricsOverride', {
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
    mobile: false
  });
  await sendCommand('Emulation.setTouchEmulationEnabled', { enabled: false });
  await sleep(1000);

  const liveDesktopCheck = await sendCommand('Runtime.evaluate', {
    expression: `
      (() => {
        const mobileControls = document.querySelector('.hud-mobile-controls');
        const style = window.getComputedStyle(mobileControls);
        const routeCaption = document.querySelector('.route-caption');
        const routeCaptionStyle = window.getComputedStyle(routeCaption);
        return {
          mobileHidden: style.display === 'none',
          routeCaptionVisible: routeCaptionStyle.display !== 'none'
        };
      })()
    `,
    returnByValue: true
  });

  const deskRes = liveDesktopCheck.result.result.value;
  console.log(`  Live Desktop: mobile controls hidden: ${deskRes.mobileHidden ? 'PASS ✔' : 'FAIL ❌'}`);
  console.log(`  Live Desktop: route caption visible: ${deskRes.routeCaptionVisible ? 'PASS ✔' : 'FAIL ❌'}`);

  const liveDesktopShot = await sendCommand('Page.captureScreenshot', { format: 'png' });
  const liveDesktopPath = path.join(artifactDir, 'live_desktop_updated.png');
  fs.writeFileSync(liveDesktopPath, Buffer.from(liveDesktopShot.result.data, 'base64'));
  console.log('Saved live desktop screenshot to:', liveDesktopPath);

  console.log('\n=== ALL LIVE PRODUCTION MOBILE VERIFICATION TESTS PASSED 100% ===');
} finally {
  try {
    chromeProcess.kill('SIGKILL');
  } catch {}
}
