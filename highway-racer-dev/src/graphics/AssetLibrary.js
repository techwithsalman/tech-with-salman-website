import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const base = import.meta.env.BASE_URL;
// Local licensed content only. See public/ASSET-LICENSES.md.
export async function loadAssets(onProgress = () => {}) {
  const manager = new THREE.LoadingManager();
  manager.onProgress = (url, done, total) => onProgress(done, total);
  const draco = new DRACOLoader(manager).setDecoderPath(`${base}decoders/draco/`);
  draco.setWorkerLimit(2);
  const loader = new GLTFLoader(manager).setDRACOLoader(draco).setMeshoptDecoder(MeshoptDecoder);
  const textures = new THREE.TextureLoader(manager);
  const trafficPromise = (async () => {
    const manifest = await new THREE.FileLoader(manager).setResponseType('json').loadAsync(`${base}models/traffic/manifest.json`);
    return Promise.all(manifest.vehicles.map(async definition => ({
      ...definition,
      scenes: await Promise.all(definition.levels.map(async level =>
        (await loader.loadAsync(`${base}models/traffic/${level.file}`)).scene))
    })));
  })();
  try {
    const [car, pines, shrub, sky, asphalt, normal, roughness, traffic] = await Promise.all([
      loader.loadAsync(`${base}models/ferrari-458.glb`),
      loader.loadAsync(`${base}models/pines.glb`),
      loader.loadAsync(`${base}models/shrub.glb`),
      new RGBELoader(manager).loadAsync(`${base}textures/daylight.hdr`),
      textures.loadAsync(`${base}textures/asphalt-diff.jpg`),
      textures.loadAsync(`${base}textures/asphalt-nor_gl.jpg`),
      textures.loadAsync(`${base}textures/asphalt-rough.jpg`),
      trafficPromise
    ]);
    sky.mapping = THREE.EquirectangularReflectionMapping;
    asphalt.colorSpace = THREE.SRGBColorSpace;
    for (const map of [asphalt, normal, roughness]) {
      map.wrapS = map.wrapT = THREE.RepeatWrapping;
      map.anisotropy = 8;
      map.repeat.set(15.2 / 3, 120 / 3);
    }
    return { car:car.scene, pines:pines.scene, shrub:shrub.scene, sky, asphalt, normal, roughness, traffic };
  } finally { draco.dispose(); }
}
