import * as THREE from 'three';

export class SceneManager {
  constructor(canvas, assets) {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0xc2cdd3,100,600);
    this.renderer = new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance',stencil:false});
    this.maxPixelRatio = window.matchMedia('(pointer: coarse)').matches ? 1.25 : 1.6;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,this.maxPixelRatio));
    this.renderer.setSize(innerWidth,innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.9;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.camera = new THREE.PerspectiveCamera(56,innerWidth / innerHeight,0.045,950);
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.environmentTarget = pmrem.fromEquirectangular(assets.sky);
    this.scene.environment = this.environmentTarget.texture;
    this.scene.environmentIntensity = 0.65;
    this.scene.background = assets.sky; this.scene.backgroundIntensity = 0.85;
    this.scene.backgroundRotation.y = Math.PI * 0.3;
    this.scene.environmentRotation.copy(this.scene.backgroundRotation);
    pmrem.dispose();
    this.scene.add(new THREE.HemisphereLight(0xd6e9f7,0x7c806b,0.75));
    this.sunLight = new THREE.DirectionalLight(0xffeed5,3);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(2048,2048);
    Object.assign(this.sunLight.shadow.camera,{left:-32,right:32,top:52,bottom:-24,near:1,far:180});
    this.sunLight.shadow.normalBias = 0.025;
    this.sunLight.shadow.bias = -0.00015; this.sunLight.shadow.radius = 3;
    this.scene.add(this.sunLight,this.sunLight.target);
    this.update(0);
    this.onResize = this.onResize.bind(this);
    window.addEventListener('resize',this.onResize);
  }
  update(z, x = 0) {
    this.sunLight.position.set(x - 42, 65, z - 32);
    this.sunLight.target.position.set(x, 0, z + 15);
    this.sunLight.target.updateMatrixWorld();
  }
  onResize() {
    this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix();
    this.renderer.setSize(innerWidth,innerHeight);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,this.maxPixelRatio));
  }
  render() { this.renderer.render(this.scene,this.camera); }
  destroy() {
    window.removeEventListener('resize',this.onResize);
    this.environmentTarget.dispose(); this.renderer.dispose();
  }
}
