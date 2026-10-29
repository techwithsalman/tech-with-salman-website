// Highway Racer 3D - Multi-Angle Collision & Near-Miss Detection System

import * as THREE from 'three';
import { CONSTANTS } from '../utils/constants.js';

export class CollisionSystem {
  constructor(gameState, audioSystem, cameraController) {
    this.gameState = gameState;
    this.audio = audioSystem;
    this.cameraController = cameraController;
  }

  checkCollisions(playerCar, trafficManager, delta) {
    if (!this.gameState.isPlaying()) return false;

    const playerPos = playerCar.position;
    const playerHeading = playerCar.heading;
    const playerSpeedKmh = playerCar.speedKmh;

    // Player bounding dimensions
    const pHalfLen = playerCar.length * 0.44;
    const pHalfWid = playerCar.width * 0.42;

    for (const v of trafficManager.activeVehicles) {
      const vPos = v.mesh.position;
      const distSq = playerPos.distanceToSquared(vPos);

      // Broadphase: skip distant vehicles
      if (distSq > 350.0) continue;

      const dist = Math.sqrt(distSq);
      const vHalfLen = v.length * 0.45;
      const vHalfWid = v.width * 0.44;

      // 1. Direct Collision Check (2D Oriented Intersection in XZ plane)
      const collisionThreshold = (pHalfLen + vHalfLen) * 0.88;
      if (dist < collisionThreshold) {
        // Transform relative delta into car's local space
        const dx = vPos.x - playerPos.x;
        const dz = vPos.z - playerPos.z;

        // Rotate by -playerHeading
        const cosH = Math.cos(-playerHeading);
        const sinH = Math.sin(-playerHeading);
        const localX = dx * cosH - dz * sinH;
        const localZ = dx * sinH + dz * cosH;

        if (Math.abs(localX) < (pHalfWid + vHalfWid) * 0.92 && Math.abs(localZ) < (pHalfLen + vHalfLen) * 0.88) {
          this.handleCrash(playerCar, v);
          return true;
        }
      }

      // 2. Near-Miss Detection
      // Occurs when player passes vehicle closely (< 2.6m lateral) at high speed (> 75 km/h)
      if (!v.nearMissChecked && playerSpeedKmh > 75 && dist < 4.2) {
        const dx = vPos.x - playerPos.x;
        const dz = vPos.z - playerPos.z;
        const cosH = Math.cos(-playerHeading);
        const sinH = Math.sin(-playerHeading);
        const localX = Math.abs(dx * cosH - dz * sinH);
        const localZ = Math.abs(dx * sinH + dz * cosH);

        if (localX < 2.5 && localZ < (pHalfLen + vHalfLen + 1.0)) {
          v.nearMissChecked = true;
          this.handleNearMiss(localX);
        }
      }
    }

    return false;
  }

  handleCrash(playerCar, trafficVehicle) {
    this.cameraController.addShake(1.3);
    this.audio.playCrash();

    // High score save
    this.gameState.saveHighScore(this.gameState.score, this.gameState.distance);
    this.gameState.setState('GAMEOVER');
  }

  handleNearMiss(lateralDist) {
    this.cameraController.addShake(0.2);
    this.audio.playNearMiss();

    // Near miss bonus with combo multiplier
    const closenessBonus = Math.floor((2.6 - lateralDist) * 160);
    const totalBonus = CONSTANTS.SCORING.NEAR_MISS_BASE_POINTS + closenessBonus;

    this.gameState.addNearMiss(totalBonus);
  }
}
