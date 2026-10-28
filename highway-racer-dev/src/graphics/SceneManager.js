// Highway Racer 3D - Scene & Rendering Pipeline

import * as THREE from 'three';
import { CONSTANTS } from '../utils/constants.js';

export class SceneManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    
    // Atmospheric fog for depth & smooth highway rendering
    this.scene.fog = new THREE.FogExp2(CONSTANTS.COLORS.FOG, 0.0035);
    this.scene.background = new THREE.Color(CONSTANTS.COLORS.FOG);

    // Renderer with optimized settings
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true
    });

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    // Camera setup
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.2,
      900
    );

    this.setupLighting();
    this.setupSkyDome();

    window.addEventListener('resize', () => this.handleResize());
  }

  setupLighting() {
    // 1. Ambient baseline
    this.ambientLight = new THREE.AmbientLight(0x2a2d3d, 1.2);
    this.scene.add(this.ambientLight);

    // 2. Hemisphere light (sky vs ground bounce)
    this.hemiLight = new THREE.HemisphereLight(0x445577, 0x111115, 0.8);
    this.scene.add(this.hemiLight);

    // 3. Main directional sun/moonlight casting dynamic shadows
    this.sunLight = new THREE.DirectionalLight(0xffeedd, 2.2);
    this.sunLight.position.set(40, 60, -30);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 160;
    
    const d = 35;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0005;

    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);
  }

  setupSkyDome() {
    // Large hemisphere with vertical color gradient for highway sunset aesthetic
    const vertexShader = `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform float offset;
      uniform float exponent;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition + offset).y;
        gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
      }
    `;

    const uniforms = {
      topColor: { value: new THREE.Color(CONSTANTS.COLORS.SKY_TOP) },
      bottomColor: { value: new THREE.Color(CONSTANTS.COLORS.SKY_BOTTOM) },
      offset: { value: 30 },
      exponent: { value: 0.6 }
    };

    const skyGeo = new THREE.SphereGeometry(600, 32, 15);
    const skyMat = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
      side: THREE.BackSide,
      depthWrite: false
    });

    this.skyDome = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(this.skyDome);
  }

  update(playerZ) {
    // Keep directional shadow camera centered over the player
    if (this.sunLight) {
      this.sunLight.position.z = playerZ - 20;
      this.sunLight.target.position.z = playerZ + 20;
      this.sunLight.target.updateMatrixWorld();
    }

    if (this.skyDome) {
      this.skyDome.position.z = playerZ;
    }
  }

  handleResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    window.removeEventListener('resize', this.handleResize);
    this.renderer.dispose();
  }
}
