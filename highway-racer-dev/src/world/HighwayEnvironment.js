import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CONSTANTS } from '../utils/constants.js';

function random(seed) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s,1664525) + 1013904223) >>> 0; return s / 4294967296; };
}
function canvasTexture(width,height,draw) {
  const c = document.createElement('canvas'); c.width = width; c.height = height;
  draw(c.getContext('2d'),width,height);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8; return t;
}

// Every segment merges static geometry by material; scans use shared instanced meshes.
export class HighwayEnvironment {
  constructor(scene,assets) {
    this.scene = scene; this.assets = assets; this.segments = [];
    this.segmentLength = CONSTANTS.SEGMENT_LENGTH;
    this.numSegments = CONSTANTS.VISIBLE_SEGMENTS;
    this.materials = this.makeMaterials();
    this.treeParts = this.extractParts(assets.pines);
    this.shrubParts = this.extractParts(assets.shrub);
    for (let i = 0; i < this.numSegments; i++) {
      const s = this.createSegment(i);
      s.position.z = i * this.segmentLength;
      scene.add(s); this.segments.push(s);
    }
  }
  makeMaterials() {
    const a = this.assets;
    const noise = canvasTexture(256,256,(ctx,w,h) => {
      const r = random(52);
      ctx.fillStyle = '#717854'; ctx.fillRect(0,0,w,h);
      for (let i = 0; i < 26000; i++) {
        ctx.fillStyle = ['#626d45','#858563','#505f3c','#969274'][Math.floor(r()*4)];
        ctx.fillRect(r()*w,r()*h,1+r()*2,1+r()*4);
      }
    });
    noise.wrapS = noise.wrapT = THREE.RepeatWrapping; noise.repeat.set(35,18);
    const paint = canvasTexture(128,512,(ctx,w,h) => {
      ctx.fillStyle = '#e2e0d3'; ctx.fillRect(0,0,w,h);
      const r = random(100);
      for (let i=0;i<2000;i++) {
        ctx.fillStyle = 'rgba(60,57,50,0.14)'; ctx.fillRect(r()*w,r()*h,r()*4,1+r()*3);
      }
    });
    const m = {
      asphalt:new THREE.MeshStandardMaterial({map:a.asphalt,normalMap:a.normal,roughnessMap:a.roughness,normalScale:new THREE.Vector2(0.42,0.42),color:0x919598,roughness:0.9}),
      shoulder:new THREE.MeshStandardMaterial({map:a.asphalt,normalMap:a.normal,color:0x7f8283,roughness:0.94}),
      grass:new THREE.MeshStandardMaterial({map:noise,roughness:1}),
      white:new THREE.MeshStandardMaterial({map:paint,color:0xffffff,roughness:0.9}),
      yellow:new THREE.MeshStandardMaterial({map:paint,color:0xf2c84a,roughness:0.9}),
      concrete:new THREE.MeshStandardMaterial({color:0xbbbcb4,roughness:0.95}),
      steel:new THREE.MeshStandardMaterial({color:0x8d979d,metalness:0.8,roughness:0.42}),
      dark:new THREE.MeshStandardMaterial({color:0x3c454b,metalness:0.65,roughness:0.6}),
      lamp:new THREE.MeshStandardMaterial({color:0xe7ebea,emissive:0xd9e6e3,emissiveIntensity:0.3}),
      red:new THREE.MeshStandardMaterial({color:0xe04c2e,roughness:0.45}),
      glass:new THREE.MeshStandardMaterial({color:0x58737d,metalness:0.7,roughness:0.25}),
      stone:new THREE.MeshStandardMaterial({color:0xa2a7a1,roughness:0.85})
    };
    m.facades = Array.from({length:4},(_,i) => {
      const map = canvasTexture(512,1024,(ctx,w,h) => {
        const r = random(150+i), backgrounds = ['#a4aaa8','#a68165','#c3bfb1','#626c70'];
        ctx.fillStyle = backgrounds[i]; ctx.fillRect(0,0,w,h);
        if (i===1) {
          ctx.strokeStyle='#786a5d';ctx.lineWidth=1;
          for(let y=0;y<h;y+=10) {
            ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();
            for(let x=(y%20?15:0);x<w;x+=30) {ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+10);ctx.stroke();}
          }
        }
        for (let y=0;y<20;y++) for (let x=0;x<8;x++) {
          const px=x*64, py=y*51.2;
          const inset = i===1 ? 15 : i===2 ? 12 : 5;
          const span = 64 - inset * 2;
          ctx.fillStyle = '#414c51'; ctx.fillRect(px+inset,py+5,span,41);
          const grad=ctx.createLinearGradient(px,py,px+50,py+40);
          grad.addColorStop(0,r()>.8?'#b2aa8d':'#6a8b99');
          grad.addColorStop(.6,'#3e525b'); grad.addColorStop(1,'#809ba4');
          ctx.fillStyle=grad;ctx.fillRect(px+inset+3,py+7,span-6,36);
          ctx.fillStyle='#919c9f';ctx.fillRect(px+30,py+7,2,36);
          if (r()>.65) { ctx.fillStyle='rgba(208,201,171,.45)';ctx.fillRect(px+inset+3,py+7,span-6,12+r()*15); }
          ctx.fillStyle='#d0cec4';ctx.fillRect(px+inset-1,py+44,span+2,3);
          ctx.fillStyle='rgba(0,0,0,.25)';ctx.fillRect(px,py+48,64,3);
        }
      });
      map.wrapS = map.wrapT = THREE.RepeatWrapping;
      const material = new THREE.MeshStandardMaterial({map,roughness:i===1||i===2?0.82:0.48,metalness:i===1||i===2?0.05:0.28});
      material.userData.facade = true;
      return material;
    });
    return m;
  }
  extractParts(source) {
    // One model may contain several complete tree variations. Keep each hierarchy as a variant.
    return source.children.map(root => {
      root.updateWorldMatrix(true,true);
      const box = new THREE.Box3().setFromObject(root);
      const height = box.max.y - box.min.y;
      const scale = 1 / height;
      const parts = [];
      root.traverse(mesh => {
        if (!mesh.isMesh) return;
        const g = mesh.geometry.clone();
        // Optimized glTF uses normalized integer positions. Expand before baking
        // world transforms, otherwise typed integer writes wrap and tear foliage.
        for (const name of ['position','normal']) {
          const a = g.getAttribute(name);
          if (!a) continue;
          const expanded = new Float32Array(a.count * 3);
          for (let i=0;i<a.count;i++) expanded.set([a.getX(i),a.getY(i),a.getZ(i)],i*3);
          g.setAttribute(name,new THREE.Float32BufferAttribute(expanded,3));
        }
        g.applyMatrix4(mesh.matrixWorld);
        g.translate(-box.getCenter(new THREE.Vector3()).x,-box.min.y,-box.getCenter(new THREE.Vector3()).z);
        g.scale(scale,scale,scale);
        const mat = mesh.material;
        mat.side = THREE.DoubleSide; mat.alphaTest = 0.45; mat.transparent = false;
        if (mat.normalScale) mat.normalScale.setScalar(0.6);
        parts.push({geometry:g,material:mat});
      });
      return parts;
    });
  }
  createSegment(index) {
    const group = new THREE.Group(), batches = new Map(), r = random(index*991+4), m = this.materials;
    const add = (geometry,material,x=0,y=0,z=0,rx=0,ry=0,rz=0) => {
      const mesh = new THREE.Mesh(geometry,material);
      mesh.position.set(x,y,z);mesh.rotation.set(rx,ry,rz);mesh.updateMatrix();
      const g=geometry.index ? geometry.toNonIndexed() : geometry.clone();
      g.applyMatrix4(mesh.matrix);
      // Equal attributes allow merging boxes, cylinders and extrusions into one batch.
      for (const name of Object.keys(g.attributes)) if (!['position','normal','uv'].includes(name)) g.deleteAttribute(name);
      if (!batches.has(material)) batches.set(material,[]);
      batches.get(material).push(g);
      geometry.dispose();
    };
    const box=(w,h,d,mat,x,y,z) => {
      const geometry = new THREE.BoxGeometry(w,h,d);
      if (mat.userData.facade) {
        const uv = geometry.getAttribute('uv');
        for (let face=0;face<6;face++) for(let v=0;v<4;v++) {
          const n=face*4+v;
          uv.setXY(n,uv.getX(n)*(face<2?d:w)/16,uv.getY(n)*(face===2||face===3?d/16:h/60));
        }
      }
      add(geometry,mat,x,y,z);
    };
    const plane=(w,d,mat,x,y,z) => add(new THREE.PlaneGeometry(w,d),mat,x,y,z,-Math.PI/2);
    const cylinder=(radius,height,mat,x,y,z) => add(new THREE.CylinderGeometry(radius,radius,height,8),mat,x,y,z);
    plane(380,120,m.grass,0,-0.07,0);
    plane(15.2,120,m.asphalt,0,0,0);
    for (const side of [-1,1]) {
      plane(2.6,120,m.shoulder,side*8.9,0.005,0);
      plane(0.16,120,side<0?m.yellow:m.white,side*7.45,0.012,0);
      plane(0.12,120,m.white,side*10.05,0.012,0);
      // Corrugated W-beam, galvanized posts, reflectors and rumble-strip grooves.
      const profile = new THREE.Shape();
      profile.moveTo(-0.065,0.58);profile.lineTo(0.03,0.66);profile.lineTo(-0.035,0.76);
      profile.lineTo(0.045,0.87);profile.lineTo(-0.025,0.98);profile.lineTo(0.065,1.04);
      profile.lineTo(0.095,1.015);profile.lineTo(0.005,0.97);profile.lineTo(0.075,0.87);
      profile.lineTo(-0.005,0.76);profile.lineTo(0.06,0.66);profile.lineTo(-0.035,0.56);profile.closePath();
      add(new THREE.ExtrudeGeometry(profile,{depth:120,bevelEnabled:false,steps:1}),m.steel,side*10.42,0,-60);
      for (let z=-58;z<60;z+=4) {
        box(.13,.9,.14,m.dark,side*10.5,.45,z);
        box(.08,.12,.17,m.red,side*10.31,.94,z);
        for(let t=0;t<3;t++) box(.22,.008,.12,m.concrete,side*7.8,.016,z+t*.3);
      }
      for (let z=-36;z<60;z+=60) {
        cylinder(.085,9,m.steel,side*11.5,4.5,z);
        box(2.8,.1,.12,m.steel,side*10.2,8.95,z);
        box(.85,.12,.3,m.dark,side*8.95,8.9,z);
        box(.72,.025,.24,m.lamp,side*8.95,8.82,z);
        box(.35,.18,.35,m.concrete,side*11.5,.09,z);
      }
    }
    for (const x of [-3.8,0,3.8]) for(let z=-58;z<60;z+=15) {
      plane(.15,5.5,m.white,x,.014,z);
      box(.09,.012,.12,m.white,x,.018,z+6.7);
    }
    // Trees and shrubs: three scanned shapes, unequal spacing, scale and heading.
    const placements = this.treeParts.map(()=>[]);
    const shrubs = [];
    for (const side of [-1,1]) {
      for(let j=0;j<4;j++) placements[j%placements.length].push({
        x:side*(15+r()*12),z:-54+j*30+r()*8,height:5+r()*5,rotation:r()*Math.PI*2
      });
      for(let j=0;j<5;j++) shrubs.push({x:side*(12+r()*5),z:-50+j*23+r()*7,height:.7+r()*.7,rotation:r()*Math.PI*2});
      // Varied district silhouettes: offices, terraced apartments, rooftop plant and podiums.
      for(let j=0;j<3;j++) {
        const x=side*(38+r()*45),z=-45+j*42+r()*12,w=12+r()*13,d=12+r()*13,h=14+r()*48;
        const facade=m.facades[(index+j+(side>0?2:0))%4];
        const stepped = (index+j)%4===3;
        if (stepped) {
          box(w,h*.65,d,facade,x,h*.325,z);
          box(w*.68,h*.35,d*.78,facade,x,h*.825,z);
        } else box(w,h,d,facade,x,h/2,z);
        box(w+2,3,d+2,m.stone,x,1.5,z);
        box(w*(stepped ? 0.68 : 1)+.5,.4,d*(stepped ? 0.78 : 1)+.5,m.concrete,x,h,z);
        box(w*.45,3,d*.4,m.dark,x,h+1.5,z);
        for(let level=6;level<h;level+=6) {
          const upper = stepped && level>h*.65;
          box(w*(upper ? 0.68 : 1)+.35,.12,d*(upper ? 0.78 : 1)+.35,m.concrete,x,level,z);
          if ((index+j)%3===0 && !upper) {
            for(let bay=-w/2+1.5;bay<w/2;bay+=3.5)
              box(2.5,.12,1.2,m.concrete,x+bay,level,z-d/2-.6);
          }
        }
        const columnHeight = stepped?h*.65:h;
        for(let bay=-w/2+.5;bay<w/2;bay+=4) box(.16,columnHeight,.18,m.steel,x+bay,columnHeight/2,z-d/2-.05);
        if (j===1) {
          cylinder(.06,5,m.steel,x+w*.3,h+2.5,z);
          box(4,2,3,m.concrete,x-w*.2,h+1,z);
        }
      }
    }
    if (index%3===1) {
      const z=22;
      for(const x of [-10.6,10.6]) {
        cylinder(.15,7.6,m.steel,x,3.8,z);
        box(.8,.3,.8,m.concrete,x,.15,z);
      }
      box(21.5,.24,.24,m.steel,0,7.5,z);
      box(21.5,.16,.16,m.steel,0,6.25,z);
      const sign = canvasTexture(1024,256,(ctx,w,h)=>{
        ctx.fillStyle='#175943';ctx.fillRect(0,0,w,h);
        ctx.strokeStyle='#e4e9dc';ctx.lineWidth=5;ctx.strokeRect(10,10,w-20,h-20);
        ctx.fillStyle='#eff3e5';ctx.font='bold 27px Arial';ctx.fillText('M-2   /   NORTHBOUND',35,54);
        ctx.font='bold 55px Arial';ctx.fillText(index%2?'Islamabad':'City Centre',35,125);
        ctx.font='26px Arial';ctx.fillText('THROUGH LANES',35,176);ctx.fillText('2 km',880,54);
        ctx.font='66px Arial';ctx.fillText('↓       ↓       ↓',420,218);
      });
      const signMesh = new THREE.Mesh(new THREE.PlaneGeometry(13,3.1),new THREE.MeshStandardMaterial({map:sign,roughness:.75}));
      signMesh.rotation.y=Math.PI;signMesh.position.set(0,6.2,z-.17);group.add(signMesh);
      box(13.1,3.2,.16,m.dark,0,6.2,z);
    }
    // Batch static road and architecture into ~15 draws instead of thousands.
    for(const [material,geometries] of batches) {
      const merged=mergeGeometries(geometries,false);
      if (!merged) throw new Error('Unable to batch highway geometry');
      const mesh=new THREE.Mesh(merged,material);
      mesh.receiveShadow=true; mesh.castShadow=![m.grass,m.asphalt,m.shoulder,m.white,m.yellow].includes(material);
      mesh.userData.shadowCaster = mesh.castShadow;
      group.add(mesh);geometries.forEach(g=>g.dispose());
    }
    const instanceParts=(parts,places) => {
      for(const part of parts) {
        const mesh = new THREE.InstancedMesh(part.geometry,part.material,places.length);
        const dummy = new THREE.Object3D();
        places.forEach((p,i)=>{
          dummy.position.set(p.x,0,p.z);dummy.rotation.y=p.rotation;dummy.scale.setScalar(p.height);
          dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
        });
        mesh.castShadow=true;mesh.receiveShadow=true;
        mesh.userData.foliage = true;
        mesh.userData.shadowCaster = true;
        mesh.computeBoundingSphere();group.add(mesh);
      }
    };
    placements.forEach((places,i)=>instanceParts(this.treeParts[i],places));
    instanceParts(this.shrubParts[0],shrubs);
    return group;
  }
  update(playerZ) {
    const threshold=playerZ-this.segmentLength*1.5;
    for (const segment of this.segments) if(segment.position.z<threshold) {
      segment.position.z=Math.max(...this.segments.map(s=>s.position.z))+this.segmentLength;
    }
    for(const segment of this.segments) for(const mesh of segment.children) {
      const distance = Math.abs(segment.position.z - playerZ);
      if (mesh.userData.foliage) mesh.visible = distance < 410;
      if (mesh.userData.shadowCaster) mesh.castShadow = distance < 120;
    }
  }
  reset() { this.segments.forEach((s,i)=>s.position.z=i*this.segmentLength); this.update(0); }
}
