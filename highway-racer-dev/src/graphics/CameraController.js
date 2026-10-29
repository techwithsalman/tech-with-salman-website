import * as THREE from 'three';
export class CameraController {
  constructor(camera) {
    this.camera = camera;
    this.mode = 0;
    this.modes = ['CHASE','COCKPIT','CINEMATIC'];
    this.currentPos = new THREE.Vector3();
    this.currentLookAt = new THREE.Vector3();
    this.targetPos = new THREE.Vector3();
    this.targetLook = new THREE.Vector3();
    this.shakeIntensity = 0;
    this.menuAngle = -0.75;
    this.elapsed = 0;
    this.transitionRemaining = 0;
    this.onModeChanged = null;
    this.cinematicSide = 1;
    this.occlusionBox = new THREE.Box3();
    this.occlusionRay = new THREE.Ray();
    this.occlusionHit = new THREE.Vector3();
  }
  setMenuMode() { this.camera.fov = 46; this.camera.updateProjectionMatrix(); }
  switchMode(hasInterior = true) {
    this.mode = (this.mode + 1) % this.modes.length;
    if (this.mode === 1 && !hasInterior) this.mode = 2;
    this.transitionRemaining = 0.65;
    this.onModeChanged?.(this.modes[this.mode]);
    return this.modes[this.mode];
  }
  updateMenu(p,dt) {
    this.menuAngle += dt * 0.075;
    this.camera.position.set(p.x + Math.sin(this.menuAngle) * 7,1.75,p.z - Math.cos(this.menuAngle) * 7);
    const offset = innerWidth > 850 ? 1.3 : 0;
    this.camera.lookAt(p.x - Math.cos(this.menuAngle) * offset,0.65,p.z - Math.sin(this.menuAngle) * offset);
  }
  updateChase(p,steer,speed,dt,player,traffic = []) {
    this.elapsed += dt;
    const ratio = THREE.MathUtils.clamp(speed / 230,0,1);
    let fov = 56 + ratio * 7;
    if (this.mode === 1 && player?.hasInterior) {
      player.getCockpitPose(this.targetPos,this.targetLook);
      fov = 78 + ratio * 3;
    } else if (this.mode === 2) {
      this.targetPos.set(p.x + this.cinematicSide * 5.8,2.25,p.z - 5.8);
      if (this.isObstructed(p,this.targetPos,traffic)) {
        const alternate = new THREE.Vector3(p.x - this.cinematicSide * 5.8,2.25,p.z - 5.8);
        if (!this.isObstructed(p,alternate,traffic)) {
          this.cinematicSide *= -1;
          this.targetPos.copy(alternate);
        } else {
          this.targetPos.y = Math.max(4.8,...traffic.filter(v=>Math.abs(v.mesh.position.z-p.z)<12).map(v=>v.height+1.8));
        }
      }
      this.targetLook.set(p.x * 0.7,0.85,p.z + 6.0);
      fov = 54;
    } else {
      this.targetPos.set(p.x - steer * 0.65,2.6 - ratio * 0.15,p.z - 7.1 - ratio * 0.55);
      this.targetLook.set(p.x + steer * 0.3,0.95,p.z + 11 + ratio * 5);
    }
    // Follow the car's forward travel without introducing a speed-dependent lag error.
    this.currentPos.z += speed / 3.6 * dt;
    this.currentLookAt.z += speed / 3.6 * dt;
    const rate = this.transitionRemaining > 0 ? 7 : (this.mode === 1 ? 30 : 9);
    this.transitionRemaining = Math.max(0,this.transitionRemaining - dt);
    this.currentPos.lerp(this.targetPos,1 - Math.exp(-rate * dt));
    this.currentLookAt.lerp(this.targetLook,1 - Math.exp(-rate * dt));
    // A smooth blend remains active during a view switch; cabin tracking is exact afterwards.
    if (this.mode === 1 && this.transitionRemaining === 0) {
      this.currentPos.copy(this.targetPos); this.currentLookAt.copy(this.targetLook);
    }
    this.camera.fov = THREE.MathUtils.damp(this.camera.fov,fov,6,dt);
    this.camera.updateProjectionMatrix();
    this.camera.position.copy(this.currentPos);
    const shake = Math.min(this.mode === 1 ? 0.06 : 0.25,this.shakeIntensity);
    this.camera.position.x += Math.sin(this.elapsed * 63) * shake;
    this.camera.position.y += Math.cos(this.elapsed * 51) * shake * 0.5;
    this.shakeIntensity = Math.max(0,this.shakeIntensity - dt * 3);
    this.camera.lookAt(this.currentLookAt);
  }
  isObstructed(p,camera,traffic) {
    const focus = new THREE.Vector3(p.x,0.7,p.z);
    const direction = camera.clone().sub(focus);
    const distance = direction.length();
    this.occlusionRay.set(focus,direction.normalize());
    for(const v of traffic) {
      if (Math.abs(v.mesh.position.z-p.z)>15) continue;
      this.occlusionBox.setFromCenterAndSize(
        new THREE.Vector3(v.mesh.position.x,v.height/2,v.mesh.position.z),
        new THREE.Vector3(v.width+0.8,v.height+0.8,v.length+0.8)
      );
      const hit = this.occlusionRay.intersectBox(this.occlusionBox,this.occlusionHit);
      if (hit && hit.distanceTo(focus)<distance+0.6) return true;
    }
    return false;
  }
  addShake(amount = 0.5) { this.shakeIntensity = Math.min(1.2,this.shakeIntensity + amount); }
  reset(p) {
    this.currentPos.set(p.x,2.6,p.z - 7.1);
    this.currentLookAt.set(p.x,0.95,p.z + 11);
    this.camera.position.copy(this.currentPos); this.camera.lookAt(this.currentLookAt);
    this.shakeIntensity = this.elapsed = 0;
    this.transitionRemaining = 0.65;
  }
}
