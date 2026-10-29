import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const phase = process.argv[2] || 'after';
const output = path.join(root, 'review', process.argv[3] || phase);
fs.mkdirSync(output, { recursive: true });
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--remote-debugging-port=9334', '--window-size=1600,1000',
  '--no-first-run', '--no-default-browser-check', '--autoplay-policy=no-user-gesture-required',
  `--user-data-dir=${path.join(root, '.chrome-premium-review')}`, 'about:blank'
], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let ws;
const errors = [];
const warnings = [];
const checks = [];
const assert = (name, passed, details) => {
  checks.push({name,passed:!!passed,details});
  if (!passed) throw new Error('FAILED: '+name+' '+JSON.stringify(details));
};
try {
  let targets;
  for (let i = 0; i < 30; i++) {
    try { targets = await (await fetch('http://127.0.0.1:9334/json/list')).json(); break; }
    catch { await sleep(300); }
  }
  if (!targets) throw new Error('Chrome debugging target unavailable');
  ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
  const pending = new Map(); let id = 0;
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.id) { pending.get(m.id)?.(m); pending.delete(m.id); }
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails);
    if (m.method === 'Runtime.consoleAPICalled' && ['error','warning'].includes(m.params.type))
      warnings.push(m.params.args.map(a => a.value || a.description).join(' '));
    if (m.method === 'Network.responseReceived' && m.params.response.status >= 400)
      errors.push({ status: m.params.response.status, url: m.params.response.url });
  };
  await new Promise((r,j) => { ws.onopen = r; ws.onerror = j; });
  const cdp = (method, params = {}) => new Promise((resolve, reject) => {
    const key = ++id;
    const timer = setTimeout(() => { pending.delete(key); reject(new Error(method + ' timed out')); }, 30000);
    pending.set(key, m => { clearTimeout(timer); m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result); });
    ws.send(JSON.stringify({id:key, method, params}));
  });
  const run = async expression => {
    const r = await cdp('Runtime.evaluate', { expression, returnByValue:true, awaitPromise:true });
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
    return r.result?.value;
  };
  const snap = async name => {
    await sleep(150);
    const s = await cdp('Page.captureScreenshot', {format:'png'});
    fs.writeFileSync(path.join(output, name + '.png'), Buffer.from(s.data, 'base64'));
  };
  const key = (code, down) => cdp('Input.dispatchKeyEvent', {type: down ? 'keyDown' : 'keyUp', key:code, code});
  await cdp('Runtime.enable'); await cdp('Network.enable'); await cdp('Page.enable');
  await cdp('Emulation.setDeviceMetricsOverride', {width:1600,height:1000,deviceScaleFactor:1,mobile:false});
  await cdp('Page.navigate', {url:process.env.HIGHWAY_TEST_URL || 'http://127.0.0.1:5173/games/highway-racer/'});
  for (let i = 0; i < 120; i++) {
    if (await run('!!window.highwayRacerGame && (window.highwayRacerGame.assetsReady !== false)')) break;
    await sleep(500);
  }
  await sleep(1000);
  await snap('menu');
  assert('Game initialized',await run('!!window.highwayRacerGame'));
  await run('window.highwayRacerGame.isRunning = false; document.getElementById("ui-container").style.display="none"; window.highwayRacerGame.sceneManager.camera.position.set(6.7,1.5,0); window.highwayRacerGame.sceneManager.camera.fov=47; window.highwayRacerGame.sceneManager.camera.updateProjectionMatrix(); window.highwayRacerGame.sceneManager.camera.lookAt(0,.65,0); window.highwayRacerGame.sceneManager.render()');
  await snap('car-side');
  await run('document.getElementById("ui-container").style.display=""; window.highwayRacerGame.isRunning=true; window.highwayRacerGame.lastTime=performance.now(); requestAnimationFrame(t=>window.highwayRacerGame.loop(t)); document.getElementById("btn-start-game").click()');
  await key('ArrowUp',true); await sleep(4200);
  await snap('rear-chase');
  await key('ArrowUp',false);
  const telemetry = await run(`(() => { const g=window.highwayRacerGame;return {state:g.gameState.currentState,speed:g.playerCar.speedKmh,distance:g.gameState.distance,score:g.gameState.score,traffic:g.trafficManager.activeVehicles.length,renderer:g.sceneManager.renderer.info.render};})()`);
  let performanceSample;
  if (phase === 'smoke') {
    assert('Packaged build drives with AI traffic',telemetry.state==='PLAYING' && telemetry.speed>50 && telemetry.traffic>0,telemetry);
    assert('Packaged build has no missing assets or browser exceptions',errors.length===0,errors);
  }
  if (phase === 'after') {
    assert('Keyboard acceleration, score and AI traffic',telemetry.speed>45 && telemetry.score>0 && telemetry.traffic>0,telemetry);
    const model = await run(`(() => {const p=window.highwayRacerGame.playerCar;return {width:p.width,length:p.length,height:p.height,wheels:p.wheels.length,steering:p.frontWheelHolders.length,interior:p.hasInterior,rotation:p.wheels[0].rotation.x};})()`);
    assert('Physical model scale and rolling wheels',model.length>4.4 && model.length<4.6 && model.width>1.8 && model.width<2.2 && model.wheels===4 && model.steering===2 && model.rotation>1,model);
    await key('ArrowRight',true); await sleep(350);
    const steered = await run('({x:highwayRacerGame.playerCar.position.x,angle:highwayRacerGame.playerCar.frontWheelHolders[0].rotation.y})');
    await key('ArrowRight',false);
    assert('Right steering moves right and turns front wheels',steered.x>-1.8 && steered.angle>0.005,steered);
    await key('ArrowLeft',true); await sleep(600); await key('ArrowLeft',false);
    const left=await run('highwayRacerGame.playerCar.position.x');
    assert('Left steering moves left',left<steered.x,{left,right:steered.x});
    const beforeBrake=await run('highwayRacerGame.playerCar.speedKmh');
    await key('ArrowDown',true); await sleep(800); await key('ArrowDown',false);
    const afterBrake=await run('highwayRacerGame.playerCar.speedKmh');
    assert('Keyboard brake decelerates',afterBrake<beforeBrake-10,{beforeBrake,afterBrake});
    await key('Escape',true); await key('Escape',false);
    const paused=await run('({state:highwayRacerGame.gameState.currentState,z:highwayRacerGame.playerCar.position.z,score:highwayRacerGame.gameState.score})');
    await sleep(500);
    const still=await run('({z:highwayRacerGame.playerCar.position.z,score:highwayRacerGame.gameState.score})');
    assert('Pause freezes distance and score',paused.state==='PAUSED' && paused.z===still.z && paused.score===still.score,{paused,still});
    await key('Escape',true); await key('Escape',false);
    await key('KeyR',true); await key('KeyR',false);
    assert('R restarts and clears race stats',await run('highwayRacerGame.gameState.isPlaying() && highwayRacerGame.gameState.distance<1 && highwayRacerGame.hud.maxRecordedSpeed<1'));
    await key('ArrowUp',true); await sleep(4500);
    const trafficBefore=await run('highwayRacerGame.trafficManager.activeVehicles[0].mesh.position.z');
    await sleep(500);
    const trafficAfter=await run('highwayRacerGame.trafficManager.activeVehicles[0].mesh.position.z');
    assert('AI vehicles actually advance',trafficAfter>trafficBefore,{trafficBefore,trafficAfter});
    await snap('day-highway-traffic');
    await key('ArrowUp',false);
    await key('KeyC',true); await key('KeyC',false); await sleep(900);
    assert('Cockpit camera enabled',await run('highwayRacerGame.cameraController.mode===1 && highwayRacerGame.playerCar.hasInterior'));
    assert('Cockpit screenshot is live gameplay',await run('highwayRacerGame.gameState.isPlaying()'));
    await snap('cockpit');
    // Use a fresh race for the bounded benchmark so unattended test driving
    // cannot accidentally turn the FPS measurement into a static crash screen.
    await run('highwayRacerGame.startNewRace()');
    await key('ArrowUp',true); await sleep(1800);
    await cdp('Runtime.evaluate',{expression:'window.frameTimes=[];window.frameEnd=performance.now()+4000;window.lastSample=performance.now();requestAnimationFrame(function sample(t){frameTimes.push(t-lastSample);lastSample=t;if(t<frameEnd)requestAnimationFrame(sample)})'});
    await sleep(4300);
    performanceSample=await run(`(() => {const a=frameTimes.slice(3).sort((a,b)=>a-b);const mean=a.reduce((s,x)=>s+x,0)/a.length;const r=highwayRacerGame.sceneManager.renderer;const gl=r.getContext();const ext=gl.getExtension('WEBGL_debug_renderer_info');return {frames:a.length,meanFrameMs:mean,fps:1000/mean,p95FrameMs:a[Math.floor(a.length*.95)],drawCalls:r.info.render.calls,triangles:r.info.render.triangles,gpu:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),viewport:[innerWidth,innerHeight]};})()`);
    performanceSample.gameplay = await run('({state:highwayRacerGame.gameState.currentState,speed:highwayRacerGame.playerCar.speedKmh,traffic:highwayRacerGame.trafficManager.activeVehicles.length})');
    assert('Performance sample captured moving gameplay',performanceSample.gameplay.state==='PLAYING' && performanceSample.gameplay.speed>50 && performanceSample.gameplay.traffic>0,performanceSample.gameplay);
    await key('ArrowUp',false);
    await run('highwayRacerGame.startNewRace()');
    await key('ArrowUp',true); await sleep(2500);
    await key('KeyC',true); await key('KeyC',false); await sleep(850);
    assert('Cinematic camera enabled',await run('highwayRacerGame.cameraController.mode===2'));
    assert('Cinematic screenshot is live gameplay',await run('highwayRacerGame.gameState.isPlaying() && highwayRacerGame.playerCar.speedKmh>50'));
    await snap('cinematic');
    const obstruction=await run(`(() => {const g=highwayRacerGame;g.gameState.setState('PAUSED');const p=g.playerCar.position;const fixture={mesh:{position:{x:p.x+3.8,z:p.z-4}},width:2.4,height:3.6,length:10};const c=g.cameraController;c.cinematicSide=1;c.updateChase(p,0,0,.016,g.playerCar,[fixture]);const blocked=c.isObstructed(p,c.targetPos,[fixture]);g.gameState.setState('PLAYING');return {blocked,side:c.cinematicSide,y:c.targetPos.y};})()`);
    assert('Cinematic boom avoids an adjacent truck',!obstruction.blocked,obstruction);
    await key('ArrowUp',false);
    await key('KeyC',true); await key('KeyC',false); await sleep(700);
    assert('Camera cycles back to chase',await run('highwayRacerGame.cameraController.mode===0'));
    // Deterministic collision-system fixtures; screenshots above use the actual game loop.
    const near=await run(`(() => {const g=highwayRacerGame;g.startNewRace();g.trafficManager.reset();g.trafficManager.spawnVehicle(0);const v=g.trafficManager.activeVehicles[0];v.width=1.7;v.length=4;v.mesh.position.set(g.playerCar.position.x+1.9,0,0);g.playerCar.speedKmh=100;g.collisionSystem.checkCollisions(g.playerCar,g.trafficManager,.016);return {state:g.gameState.currentState,misses:g.gameState.nearMisses,score:g.gameState.score,combo:g.gameState.combo};})()`);
    assert('Near miss awards score and combo',near.state==='PLAYING' && near.misses===1 && near.score>=250 && near.combo===2,near);
    const crash=await run(`(() => {const g=highwayRacerGame;const v=g.trafficManager.activeVehicles[0];v.mesh.position.copy(g.playerCar.position);g.collisionSystem.checkCollisions(g.playerCar,g.trafficManager,.016);return {state:g.gameState.currentState,high:g.gameState.highScore,saved:localStorage.getItem('tws_highway_racer_high_score'),modal:!g.hud.gameoverModal.classList.contains('hidden')};})()`);
    assert('Collision ends race and persists high score',crash.state==='GAMEOVER' && crash.high>0 && +crash.saved===crash.high && crash.modal,crash);
    await snap('collision-gameover');
    await run('document.getElementById("btn-restart-game").click()');
    assert('Game-over restart works',await run('highwayRacerGame.gameState.isPlaying() && highwayRacerGame.gameState.score<1'));
    const resetHud=await run('({comboHidden:highwayRacerGame.hud.hudComboBadge.classList.contains("hidden"),best:highwayRacerGame.hud.hudBestScore.textContent,expected:highwayRacerGame.gameState.highScore.toLocaleString()})');
    assert('Restart clears combo popup and refreshes best score',resetHud.comboHidden && resetHud.best===resetHud.expected,resetHud);
    const sound=await run('highwayRacerGame.gameState.soundEnabled');
    await run('document.getElementById("btn-hud-sound").click()');
    assert('Sound toggle works',await run('highwayRacerGame.gameState.soundEnabled')!==sound);
    const audio=await run('({state:highwayRacerGame.audio.ctx?.state || highwayRacerGame.audio.context?.state})');
    checks.push({name:'Audio context',passed:audio.state==='running',details:audio});
    await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
    await cdp('Emulation.setTouchEmulationEnabled',{enabled:true});
    await run('highwayRacerGame.startNewRace()');
    const touchPoint = await run(`(() => {const b=document.getElementById('touch-throttle').getBoundingClientRect();return {x:b.x+b.width/2,y:b.y+b.height/2,visible:b.width>0&&b.bottom<=innerHeight};})()`);
    assert('Mobile pedals fit portrait screen',touchPoint.visible,touchPoint);
    await cdp('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:touchPoint.x,y:touchPoint.y}]});
    await sleep(1100);
    const mobileSpeed=await run('highwayRacerGame.playerCar.speedKmh');
    await cdp('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    assert('Real touch throttle accelerates',mobileSpeed>10,{mobileSpeed});
    await snap('mobile-portrait');
    await run('document.getElementById("btn-hud-camera").click()');
    assert('Mobile camera button works',await run('highwayRacerGame.cameraController.mode===1'));
    await run('document.getElementById("btn-hud-pause").click();document.getElementById("btn-menu-from-pause").click()');
    assert('Return to menu works',await run('highwayRacerGame.gameState.isMenu()'));
    assert('Menu hides instruments and touch pedals',await run('getComputedStyle(highwayRacerGame.hud.hudLayer).display==="none"'));
    await snap('mobile-menu');
    await cdp('Emulation.setDeviceMetricsOverride',{width:844,height:390,deviceScaleFactor:1,mobile:true});
    await run('document.getElementById("btn-start-game").click()');
    await sleep(900);
    await snap('mobile-landscape');
    const recycle=await run(`(() => {const g=highwayRacerGame;for(let z=0;z<=5000;z+=50)g.environment.update(z);return g.environment.segments.map(s=>s.position.z).sort((a,b)=>a-b);})()`);
    assert('5km road recycling preserves continuous road around player',recycle[0]<=5000 && recycle[recycle.length-1]>5400 && recycle.every((z,i)=>i===0||Math.abs(z-recycle[i-1]-120)<.01),recycle);
    assert('No browser exceptions or failed requests',errors.length===0,errors);
  }
  const report={phase,telemetry,performance:performanceSample,checks,errors,warnings};
  fs.writeFileSync(path.join(output,'results.json'), JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
} catch (e) { const report={checks,errors,warnings,failure:String(e)};fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(report,null,2));console.error(e,JSON.stringify(report,null,2));process.exitCode=1; }
finally { ws?.close(); chrome.kill(); }
