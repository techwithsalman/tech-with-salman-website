import * as THREE from 'three';

export class CameraController {
  constructor(camera) {
    this.camera = camera;
    this.mode = 0;
    this.modes = ['CHASE', 'COCKPIT', 'CINEMATIC'];
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

  setMenuMode() {
    this.camera.fov = 46;
    this.camera.updateProjectionMatrix();
  }

  switchMode(hasInterior = true) {
    this.mode = (this.mode + 1) % this.modes.length;
    if (this.mode === 1 && !hasInterior) this.mode = 2;
    this.transitionRemaining = 0.65;
    this.onModeChanged?.(this.modes[this.mode]);
    return this.modes[this.mode];
  }

  updateMenu(p, dt) {
    this.menuAngle += dt * 0.075;
    this.camera.position.set(p.x + Math.sin(this.menuAngle) * 7, 1.75, p.z - Math.cos(this.menuAngle) * 7);
    const offset = innerWidth > 850 ? 1.3 : 0;
    this.camera.lookAt(p.x - Math.cos(this.menuAngle) * offset, 0.65, p.z - Math.sin(this.menuAngle) * offset);
  }

  updateChase(p, steer, speed, dt, player, traffic = []) {
    this.elapsed += dt;
    const ratio = THREE.MathUtils.clamp(speed / 230, 0, 1);
    const heading = player?.heading || 0;
    const isReversing = player?.gear === 'R';

    // Heading directional unit vectors
    const fwdX = -Math.sin(heading);
    const fwdZ = Math.cos(heading);
    const rightX = Math.cos(heading);
    const rightZ = Math.sin(heading);

    let fov = 56 + ratio * 7;

    if (this.mode === 1 && player?.hasInterior) {
      // Cockpit View: fixed to Ferrari interior seat, transforms with 360° heading automatically
      player.getCockpitPose(this.targetPos, this.targetLook);
      fov = 78 + ratio * 4;
    } else if (this.mode === 2) {
      // Cinematic View: dynamic side-quarter tracking relative to car heading
      const camSide = this.cinematicSide * 6.0;
      this.targetPos.set(
        p.x + rightX * camSide - fwdX * 5.5,
        2.25,
        p.z + rightZ * camSide - fwdZ * 5.5
      );
      this.targetLook.set(
        p.x + fwdX * 6.0,
        0.85,
        p.z + fwdZ * 6.0
      );
      fov = 54;
    } else {
      // Chase View: follows actual car heading through curves, U-turns, and reverse
      const camDist = isReversing ? 6.5 : (7.2 + ratio * 0.55);
      const camHeight = isReversing ? 3.1 : (2.6 - ratio * 0.15);
      const lookDist = isReversing ? -10.0 : (12.0 + ratio * 5.0);

      // Camera stays behind current heading (or flips over rear if in reverse)
      const dirMult = isReversing ? -1.0 : 1.0;
      this.targetPos.set(
        p.x - fwdX * camDist * dirMult - rightX * (steer * 0.65),
        camHeight,
        p.z - fwdZ * camDist * dirMult - rightZ * (steer * 0.65)
      );

      this.targetLook.set(
        p.x + fwdX * lookDist + rightX * (steer * 0.35),
        0.95,
        p.z + fwdZ * lookDist + rightZ * (steer * 0.35)
      );
    }

    const rate = this.transitionRemaining > 0 ? 8 : (this.mode === 1 ? 32 : 10);
    this.transitionRemaining = Math.max(0, this.transitionRemaining - dt);
    this.currentPos.lerp(this.targetPos, 1 - Math.exp(-rate * dt));
    this.currentLookAt.lerp(this.targetLook, 1 - Math.exp(-rate * dt));

    if (this.mode === 1 && this.transitionRemaining === 0) {
      this.currentPos.copy(this.targetPos);
      this.currentLookAt.copy(this.targetLook);
    }

    this.camera.fov = THREE.MathUtils.damp(this.camera.fov, fov, 6, dt);
    this.camera.updateProjectionMatrix();
    this.camera.position.copy(this.currentPos);

    const shake = Math.min(this.mode === 1 ? 0.06 : 0.25, this.shakeIntensity);
    this.camera.position.x += Math.sin(this.elapsed * 63) * shake;
    this.camera.position.y += Math.cos(this.elapsed * 51) * shake * 0.5;
    this.shakeIntensity = Math.max(0, this.shakeIntensity - dt * 3);
    this.camera.lookAt(this.currentLookAt);
  }

  addShake(amount = 0.5) {
    this.shakeIntensity = Math.min(1.2, this.shakeIntensity + amount);
  }

  reset(p, heading = 0) {
    const fwdX = -Math.sin(heading);
    const fwdZ = Math.cos(heading);
    this.currentPos.set(p.x - fwdX * 7.2, 2.6, p.z - fwdZ * 7.2);
    this.currentLookAt.set(p.x + fwdX * 12, 0.95, p.z + fwdZ * 12);
    this.targetPos.copy(this.currentPos);
    this.targetLook.copy(this.currentLookAt);
    this.camera.position.copy(this.currentPos);
    this.camera.lookAt(this.currentLookAt);
    this.shakeIntensity = this.elapsed = 0;
    this.transitionRemaining = 0.65;
  }
}
