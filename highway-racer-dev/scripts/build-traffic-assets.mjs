// Offline preparation of downloaded CC0 meshes. This script creates no vehicle primitives.
// Usage: node scripts/build-traffic-assets.mjs <node_modules containing @gltf-transform/* and meshoptimizer>
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const toolchain=process.argv[2];
if(!toolchain)throw Error('Provide the glTF Transform toolchain node_modules path. See traffic license/readme.');
const requireTool=createRequire(path.join(path.resolve(toolchain),'package.json'));
const {Document,NodeIO}=requireTool('@gltf-transform/core');
const {ALL_EXTENSIONS}=requireTool('@gltf-transform/extensions');
const sharp=requireTool('sharp');
const {cloneDocument,copyToDocument,weld,simplify,prune,meshopt}=requireTool('@gltf-transform/functions');
const {MeshoptEncoder,MeshoptDecoder,MeshoptSimplifier}=await import(pathToFileURL(path.join(path.resolve(toolchain),'meshoptimizer/index.js')));
await Promise.all([MeshoptEncoder.ready,MeshoptDecoder.ready,MeshoptSimplifier.ready]);
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
const definitions=[
  {id:'sedan',type:'SEDAN',title:'Graphite four-door sedan',slug:'graphite-four-door-sedan-eed96d12',length:4.867,width:1.9},
  {id:'suv',type:'SUV',title:'Charcoal five-door crossover SUV',slug:'charcoal-five-door-crossover-suv-a1996830',length:4.786,width:1.98},
  {id:'sports',type:'SPORTS',title:'Generic 1990s Japanese-style sports coupe',slug:'generic-1990s-japanese-style-sports-coupe-ace64592',length:4.493,width:1.86},
  {id:'van',type:'VAN',title:'High-roof cargo panel van',slug:'high-roof-cargo-panel-van-c4d5145f',length:5.675,width:2.08},
  {id:'truck',type:'TRUCK',title:'Semi tractor and box trailer',slug:'semi-tractor-and-box-trailer-bc0bdac8',length:17,width:2.5}
];
const manifest={license:'CC0-1.0',author:'Innerscene',vehicles:[]};
for(const def of definitions){
  const input=path.join(root,'.asset-sources/traffic',def.id+'-original.glb');
  const src=await io.read(input);
  for(const texture of src.getRoot().listTextures())
    texture.setImage(await sharp(Buffer.from(texture.getImage())).resize({width:256,height:256,fit:'inside',withoutEnlargement:true}).png().toBuffer());
  const sourceTriangles=src.getRoot().listMeshes().reduce((s,m)=>s+m.listPrimitives().reduce((t,p)=>t+(p.getIndices()?.getCount()||p.getAttribute('POSITION').getCount())/3,0),0);
  const parts=[];
  for(const node of src.getRoot().listNodes()) for(const primitive of node.getMesh()?.listPrimitives()||[]){
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(primitive.getAttribute('POSITION').getArray().slice(),3));
    const normal=primitive.getAttribute('NORMAL');
    if(normal)g.setAttribute('normal',new THREE.Float32BufferAttribute(normal.getArray().slice(),3));
    for(const [source,target] of [['TEXCOORD_0','uv'],['TEXCOORD_1','uv1']]) {
      const a=primitive.getAttribute(source);
      g.setAttribute(target,new THREE.Float32BufferAttribute(a?a.getArray().slice():new Float32Array(g.getAttribute('position').count*2),2));
    }
    if(primitive.getIndices())g.setIndex(new THREE.BufferAttribute(primitive.getIndices().getArray().slice(),1));
    if(!normal)g.computeVertexNormals();
    g.applyMatrix4(new THREE.Matrix4().fromArray(node.getWorldMatrix()));
    parts.push({name:node.getName(),geometry:g,material:primitive.getMaterial()});
  }
  const bounds=new THREE.Box3();
  for(const p of parts){p.geometry.computeBoundingBox();bounds.union(p.geometry.boundingBox);}
  const raw=bounds.getSize(new THREE.Vector3());
  const front=parts.filter(p=>/headlamp|headlight/i.test(p.name));
  const frontCenter=front.reduce((v,p)=>v.add(p.geometry.boundingBox.getCenter(new THREE.Vector3())),new THREE.Vector3()).multiplyScalar(1/front.length);
  const longX=raw.x>raw.z;
  const angle=longX?(frontCenter.x>0?-Math.PI/2:Math.PI/2):(frontCenter.z>0?0:Math.PI);
  const rotation=new THREE.Matrix4().makeRotationY(angle);
  bounds.makeEmpty();for(const p of parts){p.geometry.applyMatrix4(rotation);p.geometry.computeBoundingBox();bounds.union(p.geometry.boundingBox);}
  const center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3()),scale=def.length/size.z;
  const translation=new THREE.Matrix4().makeTranslation(-center.x,-bounds.min.y,-center.z);
  for(const p of parts){
    p.geometry.applyMatrix4(translation);p.geometry.scale(scale,scale,scale);
    // Original semi is a static-display assembly. Raise only the supplied landing gear for travel.
    if(def.type==='TRUCK'&&/Landing (leg|shoe)/i.test(p.name))p.geometry.translate(0,.55,0);
    p.geometry.computeBoundingBox();
  }
  const tires=parts.filter(p=>/Sculpted_tyre|tyre carcass|wheel_tire/i.test(p.name));
  if(tires.length!==(def.type==='TRUCK'?12:4))throw Error(def.id+' has unexpected tire count: '+tires.length);
  const axles=tires.map(p=>({center:p.geometry.boundingBox.getCenter(new THREE.Vector3()),radius:p.geometry.boundingBox.getSize(new THREE.Vector3()).y/2}));
  if(def.type==='TRUCK') {
    const markerMaterial=src.getRoot().listMaterials().find(m=>m.getName()==='orange').clone().setName('amber');
    for(const p of parts)if(/Amber side marker/i.test(p.name))p.material=markerMaterial;
  }
  const buckets=new Map();
  const wheelPattern=/tyre|tire|alloy|wheel_(rim|spoke|hub|brake)|cast swept alloy spoke|wheel barrel|lug|ventilated brake rotor|brake rotor hat|rotor drill|siped tread/i;
  for(const p of parts){
    let wheel=-1;
    if(wheelPattern.test(p.name)&&!/steering|wheelhouse|wheel house|caliper/i.test(p.name)){
      const c=p.geometry.boundingBox.getCenter(new THREE.Vector3());
      let closest=Infinity;
      axles.forEach((a,i)=>{const d=c.distanceTo(a.center);if(d<closest){closest=d;wheel=i;}});
      if(closest>axles[wheel].radius*1.7)wheel=-1;
    }
    if(wheel>=0)p.geometry.translate(-axles[wheel].center.x,-axles[wheel].center.y,-axles[wheel].center.z);
    const key=wheel+'|'+p.material.getName();
    if(!buckets.has(key))buckets.set(key,{wheel,material:p.material,geometries:[]});
    buckets.get(key).geometries.push(p.geometry.index?p.geometry.toNonIndexed():p.geometry);
  }
  const prepared=new Document(),buffer=prepared.createBuffer(),scene=prepared.createScene(def.type);
  const materials=copyToDocument(prepared,src,src.getRoot().listMaterials());
  const body=prepared.createNode('body');scene.addChild(body);
  const wheelNodes=axles.map((a,i)=>{const n=prepared.createNode('wheel_'+i).setTranslation(a.center.toArray()).setExtras({radius:a.radius});scene.addChild(n);return n;});
  for(const bucket of buckets.values()){
    const sourceMat=bucket.material,name=sourceMat.getName();
    const g=mergeGeometries(bucket.geometries,false),count=g.getAttribute('position').count;
    const primitive=prepared.createPrimitive()
      .setAttribute('POSITION',prepared.createAccessor().setType('VEC3').setArray(g.getAttribute('position').array).setBuffer(buffer))
      .setAttribute('NORMAL',prepared.createAccessor().setType('VEC3').setArray(g.getAttribute('normal').array).setBuffer(buffer))
      .setAttribute('TEXCOORD_0',prepared.createAccessor().setType('VEC2').setArray(g.getAttribute('uv').array).setBuffer(buffer))
      .setAttribute('TEXCOORD_1',prepared.createAccessor().setType('VEC2').setArray(g.getAttribute('uv1').array).setBuffer(buffer))
      .setIndices(prepared.createAccessor().setType('SCALAR').setArray(Uint32Array.from({length:count},(_,i)=>i)).setBuffer(buffer))
      .setMaterial(materials.get(sourceMat));
    const node=prepared.createNode((bucket.wheel<0?'body':'wheelpart')+'_'+name).setMesh(prepared.createMesh().addPrimitive(primitive));
    (bucket.wheel<0?body:wheelNodes[bucket.wheel]).addChild(node);
  }
  Object.assign(prepared.getRoot().getAsset(),{version:'2.0',copyright:'Original Innerscene model, CC0 1.0; optimized and wheel-rigged for Highway Racer 3D.'});
  const levels=[];
  for(const [lod,ratio,error] of [[0,.36,.003],[1,.13,.012],[2,.035,.035]]){
    const doc=cloneDocument(prepared);
    if(lod===0)await doc.transform(weld(),simplify({simplifier:MeshoptSimplifier,ratio,error}));
    else {
      // At highway viewing distances use baked mean colors and position-only
      // simplification, allowing small disconnected hardware and UV seams to collapse.
      for(const material of doc.getRoot().listMaterials()) {
        const texture=material.getBaseColorTexture();
        if(texture){
          const pixel=await sharp(Buffer.from(texture.getImage())).resize(1,1).ensureAlpha().raw().toBuffer();
          const color=new THREE.Color().setRGB(pixel[0]/255,pixel[1]/255,pixel[2]/255,THREE.SRGBColorSpace);
          const f=material.getBaseColorFactor();material.setBaseColorFactor([f[0]*color.r,f[1]*color.g,f[2]*color.b,f[3]*pixel[3]/255]);
          material.setBaseColorTexture(null);
        }
      }
      for(const mesh of doc.getRoot().listMeshes())for(const p of mesh.listPrimitives()) {
        p.setAttribute('TEXCOORD_0',null).setAttribute('TEXCOORD_1',null);
        const indices=new Uint32Array(p.getIndices().getArray()),positions=p.getAttribute('POSITION').getArray();
        const remap=MeshoptSimplifier.generatePositionRemap(positions,3);
        for(let i=0;i<indices.length;i++)indices[i]=remap[indices[i]];
        const [reduced]=MeshoptSimplifier.simplify(indices,positions,3,Math.max(12,Math.floor(indices.length*ratio/3)*3),lod===1?0.02:0.06,['Permissive','Prune']);
        p.setIndices(doc.createAccessor().setType('SCALAR').setArray(reduced).setBuffer(doc.getRoot().listBuffers()[0]));
      }
    }
    await doc.transform(prune(),meshopt({encoder:MeshoptEncoder,level:'high'}));
    const file=def.id+'-lod'+lod+'.glb';
    await io.write(path.join(root,'public/models/traffic',file),doc);
    const triangles=doc.getRoot().listMeshes().reduce((sum,m)=>sum+m.listPrimitives().reduce((s,p)=>s+p.getIndices().getCount()/3,0),0);
    levels.push({file,triangles,bytes:fs.statSync(path.join(root,'public/models/traffic',file)).size});
  }
  const entry={...def,author:'Innerscene',license:'CC0-1.0',source:'https://www.innerscene.com/tools/library/3d-parts/'+def.slug,
    visualWidth:size.x*scale,height:size.y*scale,wheelCount:axles.length,wheelRadii:axles.map(a=>a.radius),levels,
    sourceTriangles,sourceSha256:createHash('sha256').update(fs.readFileSync(input)).digest('hex'),
    adaptations:['Reoriented to +Z and centered at ground level','Original wheel parts regrouped around physical axle centers','Fixed parts merged by material','Three mesh LOD tiers and Meshopt compression','Textures reduced to at most 256px; distant materials use baked mean colors',...(def.type==='TRUCK'?['Original landing gear raised for travel']:[])]};
  manifest.vehicles.push(entry);console.log(JSON.stringify(entry));
}
fs.writeFileSync(path.join(root,'public/models/traffic/manifest.json'),JSON.stringify(manifest,null,2));
