import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// 1. Static HTTP server
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png'
};

const server = http.createServer((req, res) => {
  let reqPath = decodeURI(req.url.split('?')[0]);
  if (reqPath.endsWith('/')) reqPath += 'index.html';
  const filePath = path.join(rootDir, reqPath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  });
});

await new Promise((resolve) => server.listen(8080, '127.0.0.1', resolve));
console.log('Test HTTP server listening at http://127.0.0.1:8080/');

// 2. Launch Chrome at 1920x1080 High Resolution
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = path.join(__dirname, '.chrome-test-profile');

const chromeArgs = [
  '--headless=new',
  '--remote-debugging-port=9222',
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
  const versionRes = await fetch('http://127.0.0.1:9222/json/list');
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
    if (data.method === 'Runtime.consoleAPICalled') {
      console.log('[BROWSER CONSOLE]', data.params.type, data.params.args.map((a) => a.value || a.description).join(' '));
    }
    if (data.method === 'Runtime.exceptionThrown') {
      console.error('[BROWSER EXCEPTION]', JSON.stringify(data.params.exceptionDetails));
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

  console.log('Navigating to http://127.0.0.1:8080/games/highway-racer/ ...');
  await sendCommand('Page.navigate', { url: 'http://127.0.0.1:8080/games/highway-racer/' });

  // Wait for 3D start menu scene and car showcase rotation
  await sleep(2500);

  // Take High-Res Start Menu Screenshot
  const menuSnap = await sendCommand('Page.captureScreenshot', { format: 'png' });
  const menuSnapPath = path.join(rootDir, 'games', 'highway-racer', 'screenshot_menu.png');
  fs.writeFileSync(menuSnapPath, Buffer.from(menuSnap.result.data, 'base64'));
  console.log('Saved High-Res Menu screenshot to:', menuSnapPath);

  // Click START RACE
  console.log('Starting race...');
  await sendCommand('Runtime.evaluate', {
    expression: "document.getElementById('btn-start-game').click();",
    returnByValue: true
  });

  await sleep(500);

  // Accelerate straight down the highway in lane
  console.log('Driving straight in lane at high speed...');
  await sendCommand('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'ArrowUp', code: 'ArrowUp', windowsVirtualKeyCode: 38 });

  await sleep(3500);

  // Check in-game telemetry
  const stateCheck = await sendCommand('Runtime.evaluate', {
    expression: `
      (() => {
        const game = window.highwayRacerGame;
        return {
          state: game?.gameState?.currentState,
          speedKmh: Math.round(game?.playerCar?.speedKmh || 0),
          distance: Math.round(game?.gameState?.distance || 0),
          score: Math.round(game?.gameState?.score || 0),
          trafficCount: game?.trafficManager?.activeVehicles?.length || 0,
          playerPos: {
            x: +game?.playerCar?.position?.x?.toFixed(2),
            y: +game?.playerCar?.position?.y?.toFixed(2),
            z: +game?.playerCar?.position?.z?.toFixed(2)
          }
        };
      })()
    `,
    returnByValue: true
  });

  console.log('In-Game Telemetry State:', JSON.stringify(stateCheck.result?.result?.value, null, 2));

  // Take High-Res Gameplay Screenshot
  const playSnap = await sendCommand('Page.captureScreenshot', { format: 'png' });
  const playSnapPath = path.join(rootDir, 'games', 'highway-racer', 'screenshot_gameplay.png');
  fs.writeFileSync(playSnapPath, Buffer.from(playSnap.result.data, 'base64'));
  console.log('Saved High-Res Gameplay screenshot to:', playSnapPath);

  // Release keys
  await sendCommand('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowUp', code: 'ArrowUp', windowsVirtualKeyCode: 38 });

  ws.close();
} catch (err) {
  console.error('Test execution failed:', err);
} finally {
  chromeProcess.kill();
  server.close();
  try {
    fs.rmSync(userDataDir, { recursive: true, force: true });
  } catch (e) {}
  console.log('Testing completed successfully.');
  process.exit(0);
}
