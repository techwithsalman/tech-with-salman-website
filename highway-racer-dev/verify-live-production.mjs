import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = path.join(__dirname, '.chrome-live-test');

const chromeArgs = [
  '--headless=new',
  '--remote-debugging-port=9224',
  '--use-gl=angle',
  '--enable-webgl',
  '--window-size=1280,720',
  '--no-first-run',
  '--no-default-browser-check',
  `--user-data-dir=${userDataDir}`,
  'about:blank'
];

const chromeProcess = spawn(chromePath, chromeArgs);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
await sleep(1500);

try {
  const versionRes = await fetch('http://127.0.0.1:9224/json/list');
  const targets = await versionRes.json();
  const pageTarget = targets.find((t) => t.type === 'page') || targets[0];

  console.log('Connecting to Chrome CDP target for live production test...');
  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  let msgId = 1;
  const pendingRequests = new Map();

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && pendingRequests.has(data.id)) {
      pendingRequests.get(data.id)(data);
      pendingRequests.delete(data.id);
    }
    if (data.method === 'Runtime.consoleAPICalled') {
      console.log('[LIVE CONSOLE]', data.params.type, data.params.args.map((a) => a.value || a.description).join(' '));
    }
    if (data.method === 'Runtime.exceptionThrown') {
      console.error('[LIVE EXCEPTION]', JSON.stringify(data.params.exceptionDetails));
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

  const liveUrl = 'https://techwithsalman.online/games/highway-racer/';
  console.log(`Navigating to ${liveUrl} ...`);
  await sendCommand('Page.navigate', { url: liveUrl });

  // Wait for 3D assets & Three.js canvas to render
  await sleep(2500);

  // Capture Live Start Menu Screenshot
  const menuSnap = await sendCommand('Page.captureScreenshot', { format: 'png' });
  const menuSnapPath = path.join(rootDir, 'games', 'highway-racer', 'live_screenshot_menu.png');
  fs.writeFileSync(menuSnapPath, Buffer.from(menuSnap.result.data, 'base64'));
  console.log('Saved live menu screenshot to:', menuSnapPath);

  // Click START RACE
  console.log('Starting live race...');
  const clickRes = await sendCommand('Runtime.evaluate', {
    expression: `
      (() => {
        const btn = document.getElementById('btn-start-game');
        if (btn) {
          btn.click();
          return 'Started, state=' + window.highwayRacerGame?.gameState?.currentState;
        }
        return 'Start button missing';
      })()
    `,
    returnByValue: true
  });
  console.log('Click result:', clickRes.result?.result?.value);

  await sleep(600);

  // Accelerate and steer
  console.log('Driving live vehicle: applying throttle (ArrowUp) & steer (ArrowLeft)...');
  await sendCommand('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'ArrowUp', code: 'ArrowUp', windowsVirtualKeyCode: 38 });
  await sendCommand('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'ArrowLeft', code: 'ArrowLeft', windowsVirtualKeyCode: 37 });

  await sleep(4000);

  // Query in-game telemetry
  const telemetry = await sendCommand('Runtime.evaluate', {
    expression: `
      (() => {
        const game = window.highwayRacerGame;
        return {
          state: game?.gameState?.currentState,
          speedKmh: Math.round(game?.playerCar?.speedKmh || 0),
          distance: Math.round(game?.gameState?.distance || 0),
          score: Math.round(game?.gameState?.score || 0),
          trafficCount: game?.trafficManager?.activeVehicles?.length || 0,
          position: {
            x: +game?.playerCar?.position?.x?.toFixed(2),
            y: +game?.playerCar?.position?.y?.toFixed(2),
            z: +game?.playerCar?.position?.z?.toFixed(2)
          }
        };
      })()
    `,
    returnByValue: true
  });

  console.log('Live Telemetry:', JSON.stringify(telemetry.result?.result?.value, null, 2));

  // Capture Live Gameplay Screenshot
  const playSnap = await sendCommand('Page.captureScreenshot', { format: 'png' });
  const playSnapPath = path.join(rootDir, 'games', 'highway-racer', 'live_screenshot_gameplay.png');
  fs.writeFileSync(playSnapPath, Buffer.from(playSnap.result.data, 'base64'));
  console.log('Saved live gameplay screenshot to:', playSnapPath);

  // Release keys
  await sendCommand('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowUp', code: 'ArrowUp', windowsVirtualKeyCode: 38 });
  await sendCommand('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowLeft', code: 'ArrowLeft', windowsVirtualKeyCode: 37 });

  ws.close();
} catch (err) {
  console.error('Live production test failed:', err);
} finally {
  chromeProcess.kill();
  try {
    fs.rmSync(userDataDir, { recursive: true, force: true });
  } catch (e) {}
  process.exit(0);
}
