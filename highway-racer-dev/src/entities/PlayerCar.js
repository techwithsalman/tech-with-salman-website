import * as THREE from 'three';
import { CONSTANTS } from '../utils/constants.js';

const damp = (a, b, rate, dt) => THREE.MathUtils.damp(a, b, rate, dt);

// Ferrari 458 Italia by vicent091036, CC BY 4.0. No primitive fallback.
export class PlayerCar {
  constructor(scene, source) {
    this.position = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.speedKmh = this.steerAngle = this.rollAngle = this.pitchAngle = 0;
    this.rollVelocity = this.pitchVelocity = this.elapsed = 0;
    this.group = new THREE.Group();
    this.carBodyGroup = new THREE.Group();
    this.group.add(this.carBodyGroup);
    this.model = source.clone(true);
    this.model.rotation.y = Math.PI;
    const box = new THREE.Box3().setFromObject(this.model);
    const scale = 4.527 / box.getSize(new THREE.Vector3()).z;
    this.model.scale.setScalar(scale);
    box.setFromObject(this.model);
    const center = box.getCenter(new THREE.Vector3());
    this.model.position.set(-center.x, -box.min.y + 0.025, -center.z);
    this.carBodyGroup.add(this.model);
    box.setFromObject(this.model);
    const size = box.getSize(new THREE.Vector3());
    this.visualWidth = size.x; // Mirrors extend beyond the collision body.
    // The source body mesh includes mirrors; retain the established body collider.
    this.width = CONSTANTS.PLAYER.WIDTH;
    this.height = size.y; this.length = size.z;
    this.maxLateralX = CONSTANTS.ROAD_WIDTH / 2 + CONSTANTS.SHOULDER_WIDTH - this.width / 2 - 0.35;
    this.wheels = [];
    this.frontWheelHolders = [];
    this.paintMat = new THREE.MeshPhysicalMaterial({
      color:0xb70924, metalness:0.72, roughness:0.24,
      clearcoat:1, clearcoatRoughness:0.1, envMapIntensity:1.25
    });
    this.glassMat = new THREE.MeshPhysicalMaterial({
      color:0xb9d6dc, metalness:0.05, roughness:0.08, transparent:true,
      opacity:0.22, depthWrite:false, side:THREE.DoubleSide, envMapIntensity:0.65
    });
    this.taillightMat = new THREE.MeshStandardMaterial({
      color:0xad050c, emissive:0xff0a04, emissiveIntensity:0.65, roughness:0.24, metalness:0.15
    });
    this.model.traverse(o => {
      if (!o.isMesh) return;
      o.castShadow = true; o.receiveShadow = false;
      o.material = o.material.clone();
      if (/Leather|Interior_dark|Carpet|Carbon_Fiber/.test(o.material.name)) {
        o.material.color.setHex(o.material.name === 'Leather' ? 0x242627 : 0x15191c);
        o.material.roughness = 0.8;
        o.material.metalness = 0.05;
      }
      if (o.material.name === 'Interior_light') {
        o.material.color.setHex(0x4a4d4e);o.material.roughness = 0.75;o.material.metalness = 0.1;
      }
      if (o.name === 'body') o.material = this.paintMat;
      if (o.name === 'glass') { o.material = this.glassMat; o.castShadow = false; }
      if (o.name === 'lights_red') o.material = this.taillightMat;
      if (/rim_/.test(o.name))
        o.material = new THREE.MeshStandardMaterial({color:0xc1c4c5,metalness:1,roughness:0.22});
      if (/tire/i.test(o.name)) { o.material.color.setHex(0x18191a); o.material.roughness = 0.96; }
      if (o.name === 'leds') { o.material.emissive.setHex(0xe5f4ff); o.material.emissiveIntensity = 2; }
    });
    this.model.updateMatrixWorld(true);
    // World-aligned axle pivots preserve the source mesh orientations.
    for (const name of ['wheel_fl','wheel_fr','wheel_rl','wheel_rr']) {
      const mesh = this.model.getObjectByName(name);
      if (!mesh) throw new Error('Required model wheel missing: ' + name);
      const holder = new THREE.Group();
      holder.position.copy(this.carBodyGroup.worldToLocal(mesh.getWorldPosition(new THREE.Vector3())));
      this.carBodyGroup.add(holder); holder.attach(mesh);
      const spin = new THREE.Group();
      holder.add(spin); spin.attach(mesh);
      this.wheels.push(spin);
      if (name.startsWith('wheel_f')) this.frontWheelHolders.push(holder);
    }
    this.steeringWheel = this.model.getObjectByName('steering_wheel');
    this.steeringBase = this.steeringWheel?.quaternion.clone();
    this.hasInterior = !!(this.steeringWheel && this.model.getObjectByName('interior_dark'));
    scene.add(this.group);
  }
  update(dt, input) {
    const p = CONSTANTS.PLAYER;
    this.elapsed += dt;
    const previousForward = this.velocity.z, previousLateral = this.velocity.x;
    const isBraking = input.brake > 0.05 || input.handbrake > 0.05;
    const speedRatio = this.velocity.z / (p.MAX_SPEED_KMH / 3.6);
    const thrust = input.throttle * (1 - Math.max(input.brake,input.handbrake)) * p.ACCELERATION * (1 - 0.5 * speedRatio);
    const drag = this.velocity.z > 0 ? 0.6 + 0.00065 * this.velocity.z ** 2 : 0;
    const decel = input.brake * p.BRAKING + input.handbrake * p.HANDBRAKE_DECEL;
    this.velocity.z = THREE.MathUtils.clamp(this.velocity.z + (thrust - drag - decel) * dt, 0, p.MAX_SPEED_KMH / 3.6);
    this.speedKmh = this.velocity.z * 3.6;
    const grip = THREE.MathUtils.smoothstep(this.speedKmh,0,35);
    this.velocity.x = damp(this.velocity.x, input.steer * (p.STEER_SPEED - speedRatio * 1.8) * grip,
      input.handbrake > 0.1 ? 3 : 6.5, dt);
    this.position.x = THREE.MathUtils.clamp(this.position.x + this.velocity.x * dt,-this.maxLateralX,this.maxLateralX);
    if (Math.abs(this.position.x) >= this.maxLateralX) this.velocity.x = 0;
    const distanceDelta = this.velocity.z * dt;
    this.position.z += distanceDelta;
    this.group.position.copy(this.position);
    for (const wheel of this.wheels) wheel.rotation.x += distanceDelta / 0.345;
    this.steerAngle = damp(this.steerAngle,input.steer * p.MAX_STEER_ANGLE * grip / (1 + speedRatio * 1.6),12,dt);
    for (const holder of this.frontWheelHolders) holder.rotation.y = this.steerAngle;
    const ax = (this.velocity.x - previousLateral) / Math.max(dt,0.001);
    const az = (this.velocity.z - previousForward) / Math.max(dt,0.001);
    const targetRoll = THREE.MathUtils.clamp(-ax * 0.003,-0.055,0.055);
    const targetPitch = THREE.MathUtils.clamp(-az * 0.0024,-0.035,0.055);
    const steps = Math.max(1,Math.ceil(dt / 0.008)), h = dt / steps;
    for (let i = 0; i < steps; i++) {
      this.rollVelocity += ((targetRoll - this.rollAngle) * 100 - this.rollVelocity * 16) * h;
      this.pitchVelocity += ((targetPitch - this.pitchAngle) * 110 - this.pitchVelocity * 17) * h;
      this.rollAngle += this.rollVelocity * h; this.pitchAngle += this.pitchVelocity * h;
    }
    this.carBodyGroup.rotation.set(this.pitchAngle,Math.atan2(this.velocity.x,Math.max(18,this.velocity.z)) * 0.45,this.rollAngle);
    this.carBodyGroup.position.y = Math.sin(this.elapsed * 27) * 0.002 * speedRatio;
    if (this.steeringWheel) {
      this.steeringWheel.quaternion.copy(this.steeringBase);
      this.steeringWheel.rotateX(-this.steerAngle * 2.2);
    }
    this.taillightMat.emissiveIntensity = isBraking ? 3 : 0.65;
    return {distanceDelta,speedKmh:this.speedKmh,isBraking,isSkidding:input.handbrake > 0.2 && this.speedKmh > 65};
  }
  getCockpitPose(position,target) {
    this.carBodyGroup.updateWorldMatrix(true,false);
    position.set(0.37,1.05,0.05).applyMatrix4(this.carBodyGroup.matrixWorld);
    target.set(0.37,0.91,25).applyMatrix4(this.carBodyGroup.matrixWorld);
  }
  reset() {
    this.position.set(-1.9,0,0); this.velocity.set(0,0,0);
    this.speedKmh = this.steerAngle = this.rollAngle = this.pitchAngle = 0;
    this.rollVelocity = this.pitchVelocity = this.elapsed = 0;
    this.group.position.copy(this.position); this.group.rotation.set(0,0,0);
    this.carBodyGroup.rotation.set(0,0,0); this.carBodyGroup.position.y = 0;
    for (const w of this.wheels) w.rotation.x = 0;
    for (const w of this.frontWheelHolders) w.rotation.y = 0;
  }
}
