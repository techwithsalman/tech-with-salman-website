import * as THREE from 'three';

export const VEHICLE_TYPES = { SPORTS:'SPORTS', SEDAN:'SEDAN', SUV:'SUV', TRUCK:'TRUCK', VAN:'VAN' };
const TYPES = ['SEDAN','SUV','SPORTS','TRUCK','VAN'];
const WEIGHTS = [0.3,0.25,0.2,0.15,0.1];
const COLORS = [0x194867,0x8c2230,0xd9dedb,0x8d969b,0x20272b,0x355044,0x895633,0x4c5963];
const SPEEDS = {SEDAN:[85,25],SUV:[90,20],SPORTS:[105,30],VAN:[80,20],TRUCK:[75,15]};
const POOL_LIMIT = 4;

// Artist-authored CC0 GLBs, locally optimized and rigged. No procedural car fallback.
export class VehicleFactory {
  constructor(assets) {
    if (!assets || assets.length !== 5) throw new Error('The five licensed traffic models must load before starting.');
    this.assets = new Map(assets.map(a=>[a.type,a]));
    this.pool = new Map(TYPES.map(type=>[type,[]]));
    this.stats = {created:0,reused:0,released:0,discarded:0};
    this.sharedMaterials = new Map();
  }
  createVehicle(type = null) {
    if (!type) {
      const roll=Math.random();let total=0;
      type=TYPES[TYPES.length-1];
      for(let i=0;i<TYPES.length;i++){total+=WEIGHTS[i];if(roll<=total){type=TYPES[i];break;}}
    }
    if (!this.assets.has(type)) throw new Error('Unknown traffic type: '+type);
    let vehicle=this.pool.get(type).pop();
    if (vehicle) this.stats.reused++;
    else vehicle=this.buildVehicle(type);
    vehicle.inPool=false;
    vehicle.width=vehicle.definition.width;vehicle.length=vehicle.definition.length;vehicle.height=vehicle.definition.height;
    vehicle.mesh.visible=true;vehicle.mesh.position.set(0,0,0);vehicle.mesh.rotation.set(0,0,0);
    vehicle.paintMaterial.color.setHex(COLORS[Math.floor(Math.random()*COLORS.length)]);
    const [minimum,range]=SPEEDS[type];
    vehicle.baseSpeedKmh=minimum+Math.random()*range;
    vehicle.speedMs=vehicle.preferredSpeedMs=vehicle.baseSpeedKmh/3.6;
    vehicle.nearMissChecked=false;vehicle.wheelDistance=0;
    vehicle.braking=false;vehicle.tailMaterial.emissiveIntensity=0.65;
    for (const wheels of vehicle.wheelSets) for (const wheel of wheels) wheel.rotation.x=0;
    vehicle.lod.levels.forEach((level,i)=>level.object.visible=i===0);
    return vehicle;
  }
  sharedMaterial(type,index,original) {
    const key=type+'|'+index+'|'+original.uuid;
    if(this.sharedMaterials.has(key))return this.sharedMaterials.get(key);
    const name=original.name.toLowerCase();
    let m=new THREE.MeshStandardMaterial({
      name:original.name,color:original.color,map:original.map,
      metalness:original.metalness,roughness:original.roughness,side:original.side
    });
    if(name.includes('glass')) {
      m.color.setHex(0x193540);m.map=null;m.metalness=0.4;m.roughness=0.13;
      m.transparent=true;m.opacity=0.8;m.depthWrite=false;
    } else if(name==='clearlens'||name==='lamp') {
      m.color.setHex(0xd9e8ec);m.map=null;m.metalness=0.25;m.roughness=0.16;
      m.emissive.setHex(0xd6e8ee);m.emissiveIntensity=0.12;
      if(name==='clearlens'){m.transparent=true;m.opacity=0.38;m.depthWrite=false;}
    } else if(name==='amber'||name==='orange') {
      if(name==='amber'){m.map=null;m.color.setHex(0xa64c0a);m.emissive.setHex(0xff880b);m.emissiveIntensity=0.45;}
    } else if(name.includes('rubber')) {m.metalness=0;m.roughness=0.94;}
    m.envMapIntensity=0.85;
    this.sharedMaterials.set(key,m);
    return m;
  }
  buildVehicle(type) {
    const definition=this.assets.get(type);
    const mesh=new THREE.Group();mesh.name='traffic_'+type;
    const lod=new THREE.LOD();lod.autoUpdate=false;mesh.add(lod);
    const paintMaterial=new THREE.MeshPhysicalMaterial({name:'Traffic paint',color:0x7a2736,metalness:0.64,roughness:0.26,clearcoat:0.85,clearcoatRoughness:0.16,envMapIntensity:1});
    const tailMaterial=new THREE.MeshStandardMaterial({name:'Traffic tail lamps',color:0x740a0c,emissive:0xff1608,emissiveIntensity:0.65,metalness:0.12,roughness:0.18});
    const wheelSets=[],casters=[];
    definition.scenes.forEach((source,index)=>{
      const object=source.clone(true),wheels=[];
      object.traverse(o=>{
        if(/^wheel_\d+$/.test(o.name))wheels[Number(o.name.slice(6))]=o;
        if(!o.isMesh)return;
        const name=o.material.name.toLowerCase();
        if(name==='paint'||(type==='TRUCK'&&name==='orange'))o.material=paintMaterial;
        else if(name==='redlens'||name==='tail')o.material=tailMaterial;
        else o.material=this.sharedMaterial(type,index,o.material);
        o.castShadow=!o.material.transparent;
        o.receiveShadow=false;
        o.updateMatrix();o.matrixAutoUpdate=false;
        if(o.castShadow)casters.push({mesh:o,level:index});
      });
      if(wheels.filter(Boolean).length!==definition.wheelCount)throw new Error(type+' wheel rig is incomplete at LOD '+index);
      wheelSets.push(wheels);
      lod.addLevel(object,[0,65,140][index],0.12);
    });
    this.stats.created++;
    return {type,mesh,lod,paintMaterial,tailMaterial,wheelSets,wheels:wheelSets[0],casters,
      wheelRadii:definition.wheelRadii,width:definition.width,length:definition.length,height:definition.height,
      inPool:false,definition};
  }
  release(vehicle) {
    if(vehicle.inPool)return;
    vehicle.mesh.removeFromParent();vehicle.mesh.visible=false;vehicle.inPool=true;
    this.stats.released++;
    const pool=this.pool.get(vehicle.type);
    if(pool.length<POOL_LIMIT)pool.push(vehicle);
    else {vehicle.paintMaterial.dispose();vehicle.tailMaterial.dispose();this.stats.discarded++;}
  }
  updateVisual(vehicle,camera) {
    camera.updateWorldMatrix(true,false);
    // Pose every LOD from the same distance counter to prevent a wheel snap on transitions.
    for(const wheels of vehicle.wheelSets)wheels.forEach((w,i)=>w.rotation.x=vehicle.wheelDistance/vehicle.wheelRadii[i]);
    vehicle.mesh.updateWorldMatrix(true,true);
    vehicle.lod.update(camera);
    const distance=vehicle.mesh.position.distanceTo(camera.position);
    const level=vehicle.lod.getCurrentLevel();
    for(const caster of vehicle.casters)caster.mesh.castShadow=caster.level===level&&distance<85;
    vehicle.tailMaterial.emissiveIntensity=vehicle.braking?2.4:0.65;
  }
  describeAssets() {
    return [...this.assets.values()].map(a=>({type:a.type,title:a.title,levels:a.scenes.length,wheels:a.wheelCount,
      length:a.length,width:a.width,height:a.height,triangles:a.levels.map(l=>l.triangles)}));
  }
}
