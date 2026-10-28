import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

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

await new Promise((resolve) => server.listen(8081, '127.0.0.1', resolve));

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = path.join(__dirname, '.chrome-full-test');

const chromeArgs = [
  '--headless=new',
  '--remote-debugging-port=9223',
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

  await sendCommand('Page.navigate', { url: 'http://127.0.0.1:8081/games/highway-racer/' });
  await sleep(1800);

  // 1. Menu state check
  const menuCheck = await sendCommand('Runtime.evaluate', {
    expression: 'window.highwayRacerGame?.gameState?.currentState',
    returnByValue: true
  });
  console.log('1. INITIAL STATE:', menuCheck.result?.result?.value);

  // 2. Start Game
  await sendCommand('Runtime.evaluate', {
    expression: "document.getElementById('btn-start-game').click();",
    returnByValue: true
  });
  await sleep(500);

  const startCheck = await sendCommand('Runtime.evaluate', {
    expression: 'window.highwayRacerGame?.gameState?.currentState',
    returnByValue: true
  });
  console.log('2. AFTER START CLICK:', startCheck.result?.result?.value);

  // 3. Accelerate and steer
  await sendCommand('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'ArrowUp', code: 'ArrowUp', windowsVirtualKeyCode: 38 });
  await sleep(2500);

  const drivingCheck = await sendCommand('Runtime.evaluate', {
    expression: `
      (() => {
        const game = window.highwayRacerGame;
        return {
          state: game?.gameState?.currentState,
          speedKmh: Math.round(game?.playerCar?.speedKmh || 0),
          distance: Math.round(game?.gameState?.distance || 0),
          score: Math.round(game?.gameState?.score || 0),
          trafficCount: game?.trafficManager?.activeVehicles?.length || 0
        };
      })()
    `,
    returnByValue: true
  });
  console.log('3. DRIVING & SCORING TELEMETRY:', JSON.stringify(drivingCheck.result?.result?.value));

  // 4. Force a collision test
  console.log('4. TRIGGERING COLLISION TEST...');
  const crashTest = await sendCommand('Runtime.evaluate', {
    expression: `
      (() => {
        const game = window.highwayRacerGame;
        // Place a traffic vehicle directly in front of player
        if (game?.trafficManager?.activeVehicles?.length > 0) {
          const v = game.trafficManager.activeVehicles[0];
          v.mesh.position.set(game.playerCar.position.x, 0, game.playerCar.position.z + 1.0);
        }
        return 'Vehicle positioned for collision';
      })()
    `,
    returnByValue: true
  });
  await sleep(400);

  const postCrashCheck = await sendCommand('Runtime.evaluate', {
    expression: `
      (() => {
        const game = window.highwayRacerGame;
        return {
          state: game?.gameState?.currentState,
          finalScore: game?.gameState?.score,
          highScore: game?.gameState?.highScore,
          gameOverModalVisible: !document.getElementById('gameover-modal').classList.contains('hidden')
        };
      })()
    `,
    returnByValue: true
  });
  console.log('4. POST-COLLISION STATE:', JSON.stringify(postCrashCheck.result?.result?.value));

  // 5. Test Restart button from Game Over modal
  console.log('5. TESTING RESTART BUTTON...');
  await sendCommand('Runtime.evaluate', {
    expression: "document.getElementById('btn-restart-game').click();",
    returnByValue: true
  });
  await sleep(600);

  const restartCheck = await sendCommand('Runtime.evaluate', {
    expression: `
      (() => {
        const game = window.highwayRacerGame;
        return {
          state: game?.gameState?.currentState,
          distance: game?.gameState?.distance,
          speedKmh: game?.playerCar?.speedKmh,
          modalHidden: document.getElementById('gameover-modal').classList.contains('hidden')
        };
      })()
    `,
    returnByValue: true
  });
  console.log('5. RESTART STATE:', JSON.stringify(restartCheck.result?.result?.value));

  ws.close();
} catch (err) {
  console.error('Lifecycle test error:', err);
} finally {
  chromeProcess.kill();
  server.close();
  try {
    fs.rmSync(userDataDir, { recursive: true, force: true });
  } catch (e) {}
  process.exit(0);
}
