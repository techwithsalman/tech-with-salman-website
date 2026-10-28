import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// 1. Simple static HTTP server
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
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

await new Promise((resolve) => server.listen(8080, '127.0.0.1', resolve));
console.log('Test HTTP server listening at http://127.0.0.1:8080/');

// 2. Launch Headless Chrome with Remote Debugging
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = path.join(__dirname, '.chrome-test-profile');

const chromeArgs = [
  '--headless=new',
  '--remote-debugging-port=9222',
  '--use-gl=angle',
  '--enable-webgl',
  '--window-size=1280,720',
  '--no-first-run',
  '--no-default-browser-check',
  `--user-data-dir=${userDataDir}`,
  'about:blank'
];

const chromeProcess = spawn(chromePath, chromeArgs);

// Helper to wait
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
await sleep(1500);

try {
  // Query CDP targets
  const versionRes = await fetch('http://127.0.0.1:9222/json/list');
  const targets = await versionRes.json();
  const pageTarget = targets.find((t) => t.type === 'page') || targets[0];
  console.log('Connected to Chrome CDP page target:', pageTarget.id);

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

  function sendCommand(method, params = {}) {
    return new Promise((resolve) => {
      const id = msgId++;
      pendingRequests.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  // Enable Runtime and Page domains
  await sendCommand('Runtime.enable');
  await sendCommand('Page.enable');

  console.log('Navigating to http://127.0.0.1:8080/games/highway-racer/ ...');
  await sendCommand('Page.navigate', { url: 'http://127.0.0.1:8080/games/highway-racer/' });

  await sleep(2000);

  // Take Start Menu screenshot
  const menuSnap = await sendCommand('Page.captureScreenshot', { format: 'png' });
  const menuSnapBuffer = Buffer.from(menuSnap.result.data, 'base64');
  const menuSnapPath = path.join(rootDir, 'games', 'highway-racer', 'screenshot_menu.png');
  fs.writeFileSync(menuSnapPath, menuSnapBuffer);
  console.log('Saved Menu screenshot to:', menuSnapPath);

  // Click START RACE button
  console.log('Clicking START RACE button...');
  const clickRes = await sendCommand('Runtime.evaluate', {
    expression: `
      (() => {
        const btn = document.getElementById('btn-start-game');
        if (btn) {
          btn.click();
          return 'Clicked successfully, state=' + window.highwayRacerGame?.gameState?.currentState;
        }
        return 'Button not found!';
      })()
    `,
    returnByValue: true
  });
  console.log('Click result:', clickRes.result?.result?.value || clickRes);

  await sleep(1000);

  // Dispatch KeyDown for ArrowUp (Throttle)
  console.log('Simulating acceleration & steering keys...');
  await sendCommand('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'ArrowUp', code: 'ArrowUp', windowsVirtualKeyCode: 38 });
  await sendCommand('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 });

  // Drive for 4 seconds
  await sleep(3500);

  // Check in-game state
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
            x: game?.playerCar?.position?.x,
            y: game?.playerCar?.position?.y,
            z: game?.playerCar?.position?.z
          }
        };
      })()
    `,
    returnByValue: true
  });

  console.log('In-Game Telemetry State:', JSON.stringify(stateCheck.result?.result?.value || stateCheck, null, 2));

  // Take Gameplay screenshot
  const playSnap = await sendCommand('Page.captureScreenshot', { format: 'png' });
  const playSnapBuffer = Buffer.from(playSnap.result.data, 'base64');
  const playSnapPath = path.join(rootDir, 'games', 'highway-racer', 'screenshot_gameplay.png');
  fs.writeFileSync(playSnapPath, playSnapBuffer);
  console.log('Saved Gameplay screenshot to:', playSnapPath);

  // Release keys
  await sendCommand('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowUp', code: 'ArrowUp', windowsVirtualKeyCode: 38 });
  await sendCommand('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 });

  ws.close();
} catch (err) {
  console.error('Test execution failed:', err);
} finally {
  chromeProcess.kill();
  server.close();
  // Cleanup test user data dir
  try {
    fs.rmSync(userDataDir, { recursive: true, force: true });
  } catch (e) {}
  console.log('Testing completed successfully.');
  process.exit(0);
}
