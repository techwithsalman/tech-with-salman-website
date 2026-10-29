import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(await fs.readFile(path.join(root,'public/models/traffic/manifest.json'),'utf8'));
const target=path.join(root,'.asset-sources/traffic');await fs.mkdir(target,{recursive:true});
for(const asset of manifest.vehicles){
  const file=path.join(target,asset.id+'-original.glb');
  let data;try{data=await fs.readFile(file);}catch{}
  if(data&&createHash('sha256').update(data).digest('hex')===asset.sourceSha256){console.log(asset.id+': source already verified');continue;}
  const response=await fetch('https://www.innerscene.com/api/library/'+asset.slug+'/download');
  if(!response.ok)throw Error(asset.id+': HTTP '+response.status);
  data=Buffer.from(await response.arrayBuffer());
  if(createHash('sha256').update(data).digest('hex')!==asset.sourceSha256)throw Error(asset.id+': upstream source changed; review provenance before replacing the pinned asset');
  await fs.writeFile(file,data);console.log(asset.id+': downloaded and SHA-256 verified');
}
