import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const phase=process.argv[2]||'after';
const out=path.join(root,'review/traffic',process.argv[3]||phase);
fs.mkdirSync(out,{recursive:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const browser=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',[
  '--headless=new','--remote-debugging-port=9335','--no-first-run','--no-default-browser-check',
  '--autoplay-policy=no-user-gesture-required',`--user-data-dir=${path.join(root,'.chrome-traffic-review')}`,'about:blank'
],{stdio:'ignore'});
const report={phase,checks:[],errors:[],warnings:[],performance:[]};let ws;
const check=(name,pass,details)=>{report.checks.push({name,passed:!!pass,details});if(!pass)throw Error(name+': '+JSON.stringify(details));};
try {
  let pages;
  for(let i=0;i<40;i++){try{pages=await(await fetch('http://127.0.0.1:9335/json/list')).json();break;}catch{await sleep(250);}}
  ws=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);
  const requests=new Map();let id=0;
  ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){requests.get(m.id)?.(m);requests.delete(m.id);}
    if(m.method==='Runtime.exceptionThrown')report.errors.push(m.params.exceptionDetails);
    if(m.method==='Network.responseReceived'&&m.params.response.status>=400)report.errors.push({url:m.params.response.url,status:m.params.response.status});
    if(m.method==='Runtime.consoleAPICalled'&&['warning','error'].includes(m.params.type))report.warnings.push(m.params.args.map(a=>a.value||a.description).join(' '));};
  await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
  const cdp=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;const t=setTimeout(()=>reject(Error(method+' timeout')),30000);requests.set(n,m=>{clearTimeout(t);m.error?reject(Error(JSON.stringify(m.error))):resolve(m.result);});ws.send(JSON.stringify({id:n,method,params}));});
  const run=async expression=>{const r=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result?.value;};
  const snap=async name=>{const r=await cdp('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(out,name+'.png'),Buffer.from(r.data,'base64'));};
  const key=(code,down)=>cdp('Input.dispatchKeyEvent',{type:down?'keyDown':'keyUp',key:code,code});
  await cdp('Runtime.enable');await cdp('Network.enable');await cdp('Page.enable');
  await cdp('Emulation.setDeviceMetricsOverride',{width:1600,height:1000,deviceScaleFactor:1,mobile:false});
  await cdp('Page.navigate',{url:process.env.HIGHWAY_TEST_URL||'http://127.0.0.1:5173/games/highway-racer/'});
  for(let i=0;i<120;i++){if(await run('!!window.highwayRacerGame'))break;await sleep(500);}
  check('Game and assets initialize',await run('!!window.highwayRacerGame'));
  // Identical twelve-vehicle driving fixture before and after. AI movement, physics,
  // rendering and collision code run normally; the player occupies the fourth lane.
  const fixture=async()=>run(`(()=>{const g=highwayRacerGame;g.startNewRace();g.trafficManager.reset();const old=Math.random;let seed=1729;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};const types=['SEDAN','SUV','SPORTS','VAN','TRUCK','SEDAN','SUV','SPORTS','VAN','TRUCK','SEDAN','SUV'];for(let i=0;i<12;i++){const v=g.trafficManager.factory.createVehicle(types[i]);v.mesh.position.set([1.9,5.7,-5.7][i%3],0,[13,22,30,52,68,84,110,133,153,180,210,238][i]);v.baseSpeedKmh=100;v.preferredSpeedMs=100/3.6;v.speedMs=100/3.6;v.nearMissChecked=false;g.sceneManager.scene.add(v.mesh);g.trafficManager.activeVehicles.push(v);}Math.random=old;g.playerCar.velocity.z=100/3.6;g.playerCar.speedKmh=100;g.cameraController.mode=0;g.hud.setCameraMode("CHASE");g.cameraController.reset(g.playerCar.position);return g.trafficManager.activeVehicles.length;})()`);
  check('Fixture contains twelve traffic vehicles',await fixture()===12);
  await sleep(600);await snap('traffic-chase');
  await run('highwayRacerGame.cameraController.mode=2;highwayRacerGame.hud.setCameraMode("CINEMATIC")');await sleep(800);await snap('traffic-cinematic');
  for(const view of [0,1]) {
    await fixture();await run(`highwayRacerGame.cameraController.mode=${view}`);await sleep(900);
    const sample=await run(`new Promise(resolve=>{const g=highwayRacerGame,r=g.sceneManager.renderer,frames=[],calls=[],tris=[],start=performance.now();let last=start;function frame(t){frames.push(t-last);last=t;calls.push(r.info.render.calls);tris.push(r.info.render.triangles);if(t-start<5000)requestAnimationFrame(frame);else{const a=frames.slice(3).sort((a,b)=>a-b),avg=a.reduce((s,x)=>s+x,0)/a.length,gl=r.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');resolve({camera:${view},fps:1000/avg,meanFrameMs:avg,p95FrameMs:a[Math.floor(a.length*.95)],frames:a.length,meanDrawCalls:calls.reduce((s,x)=>s+x,0)/calls.length,maxDrawCalls:Math.max(...calls),meanTriangles:tris.reduce((s,x)=>s+x,0)/tris.length,state:g.gameState.currentState,speed:g.playerCar.speedKmh,traffic:g.trafficManager.activeVehicles.length,gpu:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)});}}requestAnimationFrame(frame)})`);
    report.performance.push(sample);check('Benchmark is live driving '+view,sample.state==='PLAYING'&&sample.speed>50&&sample.traffic===12,sample);
  }
  // Source-model close-ups are staged in-engine for a clear geometry comparison.
  await run('highwayRacerGame.isRunning=false');await sleep(120);
  for(const type of ['SEDAN','SUV','SPORTS','VAN','TRUCK']) {
    await run(`(()=>{const g=highwayRacerGame;g.trafficManager.reset();g.playerCar.group.visible=false;document.getElementById('ui-container').style.display='none';const v=g.trafficManager.factory.createVehicle('${type}');v.mesh.position.set(0,0,0);g.sceneManager.scene.add(v.mesh);g.trafficManager.activeVehicles.push(v);g.environment.reset();g.sceneManager.update(0);const c=g.sceneManager.camera;const truck='${type}'==='TRUCK';c.fov=truck?51:45;c.position.set(truck?12:6.4,truck?5:2.5,truck?13:7);c.lookAt(0,truck?1.5:.7,0);c.updateProjectionMatrix();g.sceneManager.scene.updateMatrixWorld(true);g.trafficManager.updateVisuals?.(c);v.mesh.update?.(c);g.sceneManager.render();})()`);
    await snap(type.toLowerCase());
  }
  if(phase==='after') {
    const assets=await run(`(()=>{const g=highwayRacerGame;return g.trafficManager.factory.describeAssets();})()`);
    report.assets=assets;check('All five classes use loaded GLB LODs',assets.length===5&&assets.every(a=>a.levels===3&&a.wheels>=4),assets);
    const pool=await run(`(()=>{const f=highwayRacerGame.trafficManager.factory;const a=f.createVehicle('SEDAN');const id=a.mesh.uuid;f.release(a);const b=f.createVehicle('SEDAN');const reused=b.mesh.uuid===id;f.release(b);return {reused,stats:f.stats};})()`);
    check('Vehicle pool reuses released instances',pool.reused,pool);
    // Test each actual imported collider and near-miss state independently.
    for(const type of ['SEDAN','SUV','SPORTS','VAN','TRUCK']) {
      const result=await run(`(()=>{const g=highwayRacerGame;g.startNewRace();g.trafficManager.reset();const v=g.trafficManager.factory.createVehicle('${type}');v.mesh.position.copy(g.playerCar.position);v.speedMs=0;v.nearMissChecked=false;g.sceneManager.scene.add(v.mesh);g.trafficManager.activeVehicles.push(v);g.collisionSystem.checkCollisions(g.playerCar,g.trafficManager,.008);return {state:g.gameState.currentState,width:v.width,length:v.length,height:v.height};})()`);
      check(type+' collision triggers game over',result.state==='GAMEOVER',result);
    }
    const near=await run(`(()=>{const g=highwayRacerGame;g.startNewRace();g.trafficManager.reset();const v=g.trafficManager.factory.createVehicle('SEDAN');v.mesh.position.set(g.playerCar.position.x+2.05,0,0);v.nearMissChecked=false;g.trafficManager.activeVehicles.push(v);g.sceneManager.scene.add(v.mesh);g.playerCar.speedKmh=100;g.collisionSystem.checkCollisions(g.playerCar,g.trafficManager,.008);g.collisionSystem.checkCollisions(g.playerCar,g.trafficManager,.008);return {state:g.gameState.currentState,misses:g.gameState.nearMisses,score:g.gameState.score};})()`);
    check('Near miss scores once and avoids false collision',near.state==='PLAYING'&&near.misses===1&&near.score>250,near);
    const lod=await run(`(()=>{const g=highwayRacerGame,f=g.trafficManager.factory,v=f.createVehicle('SEDAN'),c=g.sceneManager.camera;g.sceneManager.scene.add(v.mesh);v.mesh.position.set(0,0,0);v.wheelDistance=10;const selected=[];for(const distance of [10,100,250]){c.position.set(0,2,-distance);f.updateVisual(v,c);selected.push(v.lod.getCurrentLevel());}const rotations=v.wheelSets.map(w=>w[0].rotation.x),expected=10/v.wheelRadii[0];v.nearMissChecked=true;f.release(v);const restored=f.createVehicle('SEDAN');const fresh=!restored.nearMissChecked&&restored.wheelDistance===0;f.release(restored);return {selected,rotations,expected,fresh};})()`);
    check('Distance LOD selects near, medium and far meshes',lod.selected.join(',')==='0,1,2',lod);
    check('All LOD wheel poses roll from tire radius without snapping',lod.rotations.every(r=>Math.abs(r-lod.expected)<.00001)&&lod.fresh,lod);
    const following=await run(`(()=>{const g=highwayRacerGame,t=g.trafficManager;g.startNewRace();t.reset();const rear=t.factory.createVehicle('SPORTS'),front=t.factory.createVehicle('TRUCK');rear.mesh.position.set(5.7,0,50);front.mesh.position.set(5.7,0,95);rear.speedMs=rear.preferredSpeedMs=35;front.speedMs=front.preferredSpeedMs=20;g.sceneManager.scene.add(rear.mesh,front.mesh);t.activeVehicles.push(rear,front);t.spawnTimer=-100000;let minimum=Infinity;for(let i=0;i<1800;i++){const player=i/120*20;t.update(player,1/120);minimum=Math.min(minimum,front.mesh.position.z-rear.mesh.position.z-(front.length+rear.length)/2);}return {minimumGap:minimum,rearSpeed:rear.speedMs,leaderSpeed:front.speedMs,braking:rear.braking,lane:rear.mesh.position.x};})()`);
    check('Faster coupe follows a slower semi without overlap or lane changes',following.minimumGap>2&&following.rearSpeed<22&&following.lane===5.7,following);
    const lifecycle=await run(`(()=>{const g=highwayRacerGame,t=g.trafficManager;t.reset();for(let i=0;i<60;i++)t.spawnVehicle(0);const count=t.activeVehicles.length;const lanes=t.activeVehicles.every(v=>t.laneCenters.some(x=>Math.abs(x-v.mesh.position.x)<.001));const spacing=t.activeVehicles.every((v,i)=>t.activeVehicles.every((o,j)=>i===j||Math.abs(o.mesh.position.x-v.mesh.position.x)>1||Math.abs(o.mesh.position.z-v.mesh.position.z)>=35));t.spawnTimer=-100000;t.update(1000,.008);const despawned=t.activeVehicles.length;t.reset();const before=t.factory.stats.created;for(let i=0;i<200;i++)for(const type of ['SEDAN','SUV','SPORTS','VAN','TRUCK']){const v=t.factory.createVehicle(type);t.factory.release(v);}return {count,lanes,spacing,despawned,createdDuringReuse:t.factory.stats.created-before,pools:[...t.factory.pool.values()].map(p=>p.length),stats:t.factory.stats};})()`);
    check('Spawn cap, assigned lanes and 35m clearance remain intact',lifecycle.count<=12&&lifecycle.count>0&&lifecycle.lanes&&lifecycle.spacing,lifecycle);
    check('Despawn releases traffic and the pool stays bounded over 1000 reuses',lifecycle.despawned===0&&lifecycle.createdDuringReuse<=5&&lifecycle.pools.every(n=>n<=4),lifecycle);
    // A genuine moving collision driven through the normal requestAnimationFrame loop.
    await run(`(()=>{const g=highwayRacerGame;g.startNewRace();g.trafficManager.reset();const v=g.trafficManager.factory.createVehicle('SEDAN');v.mesh.position.set(g.playerCar.position.x,0,16);v.speedMs=v.preferredSpeedMs=0;g.sceneManager.scene.add(v.mesh);g.trafficManager.activeVehicles.push(v);g.trafficManager.spawnTimer=-100000;g.playerCar.group.visible=true;document.getElementById('ui-container').style.display='';g.playerCar.velocity.z=100/3.6;g.playerCar.speedKmh=100;g.cameraController.mode=0;g.cameraController.reset(g.playerCar.position);g.isRunning=true;g.lastTime=performance.now();requestAnimationFrame(t=>g.loop(t));})()`);
    await key('ArrowUp',true);await sleep(1000);await key('ArrowUp',false);
    const movingCrash=await run('({state:highwayRacerGame.gameState.currentState,distance:highwayRacerGame.gameState.distance,highScore:highwayRacerGame.gameState.highScore,saved:localStorage.getItem("tws_highway_racer_high_score")})');
    check('Actual driving collision ends the race and keeps saved scores',movingCrash.state==='GAMEOVER'&&movingCrash.distance>5&&+movingCrash.saved===movingCrash.highScore,movingCrash);
    await snap('moving-collision');
    await key('KeyR',true);await key('KeyR',false);
    check('Restart reseeds the imported fleet',await run('highwayRacerGame.gameState.isPlaying()&&highwayRacerGame.trafficManager.activeVehicles.length===3'));
  }
  check('No browser exceptions or failed asset requests',report.errors.length===0,report.errors);
} catch(e) {report.failure=String(e);process.exitCode=1;}
finally {fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({phase,checks:report.checks.length,failed:report.checks.filter(c=>!c.passed),performance:report.performance,errors:report.errors,warnings:report.warnings,failure:report.failure},null,2));ws?.close();browser.kill();}
