// Highway Racer 3D - Smooth Third-Person Chase Camera

import * as THREE from 'three';

export class CameraController {
  constructor(camera) {
    this.camera = camera;

    // Follow target offsets
    this.offset = new THREE.Vector3(0, 2.7, -6.8); // Behind and slightly elevated
    this.lookOffset = new THREE.Vector3(0, 1.2, 8.0); // Looking forward past the car hood

    // Current smoothed camera positions
    this.currentPos = new THREE.Vector3(0, 3.0, -8.0);
    this.currentLookAt = new THREE.Vector3(0, 1.2, 5.0);

    // Dynamic camera effects
    this.fovBase = 60;
    this.fovTarget = 60;
    this.shakeIntensity = 0;
    this.shakeDecay = 4.0;
    this.shakeOffset = new THREE.Vector3();

    // Menu preview orbit
    this.menuAngle = 0;
  }

  setMenuMode() {
    this.camera.fov = 50;
    this.camera.updateProjectionMatrix();
  }

  updateMenu(carPosition, delta) {
    this.menuAngle += delta * 0.35;
    const radius = 6.5;
    const height = 1.9;

    this.camera.position.set(
      carPosition.x + Math.sin(this.menuAngle) * radius,
      carPosition.y + height,
      carPosition.z + Math.cos(this.menuAngle) * radius
    );

    this.camera.lookAt(carPosition.x, carPosition.y + 0.9, carPosition.z);
  }

  updateChase(carPosition, carSteer, speedKmh, delta) {
    const speedRatio = Math.max(0, Math.min(1.0, speedKmh / 230));

    // 1. Dynamic FOV expansion with speed (sense of hyper-speed)
    this.fovTarget = this.fovBase + (speedRatio * 16);
    this.camera.fov += (this.fovTarget - this.camera.fov) * Math.min(1.0, delta * 4.0);
    this.camera.updateProjectionMatrix();

    // 2. Camera position with lateral lag (sway behind turns)
    const lateralSway = carSteer * 0.65;
    const heightDrop = speedRatio * 0.25; // Lower slightly at high speed for aggression
    const distPull = speedRatio * 0.8;    // Pull back slightly

    const targetPos = new THREE.Vector3(
      carPosition.x * 0.82 + lateralSway,
      carPosition.y + this.offset.y - heightDrop,
      carPosition.z + this.offset.z - distPull
    );

    const targetLookAt = new THREE.Vector3(
      carPosition.x * 0.9 + (carSteer * 0.4),
      carPosition.y + this.lookOffset.y,
      carPosition.z + this.lookOffset.z + (speedRatio * 6.0)
    );

    // 3. Smooth exponential interpolation
    const followLag = 9.5;
    this.currentPos.lerp(targetPos, Math.min(1.0, delta * followLag));
    this.currentLookAt.lerp(targetLookAt, Math.min(1.0, delta * (followLag * 1.2)));

    // 4. Camera Shake (for crashes or high-speed rumble)
    if (this.shakeIntensity > 0.001) {
      this.shakeOffset.set(
        (Math.random() - 0.5) * 2 * this.shakeIntensity,
        (Math.random() - 0.5) * 2 * this.shakeIntensity,
        (Math.random() - 0.5) * 2 * this.shakeIntensity
      );
      this.shakeIntensity = Math.max(0, this.shakeIntensity - (delta * this.shakeDecay));
    } else {
      this.shakeOffset.set(0, 0, 0);
    }

    // Apply combined position and orientation
    this.camera.position.copy(this.currentPos).add(this.shakeOffset);
    this.camera.lookAt(this.currentLookAt.clone().add(this.shakeOffset));
  }

  addShake(amount = 0.5) {
    this.shakeIntensity = Math.min(this.shakeIntensity + amount, 1.2);
  }

  reset(carPosition) {
    this.currentPos.set(carPosition.x, carPosition.y + this.offset.y, carPosition.z + this.offset.z);
    this.currentLookAt.set(carPosition.x, carPosition.y + this.lookOffset.y, carPosition.z + this.lookOffset.z);
    this.camera.position.copy(this.currentPos);
    this.camera.lookAt(this.currentLookAt);
    this.shakeIntensity = 0;
  }
}
