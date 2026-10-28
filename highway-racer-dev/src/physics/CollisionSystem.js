// Highway Racer 3D - High-Precision Collision & Near-Miss Detection System

import * as THREE from 'three';
import { CONSTANTS } from '../utils/constants.js';

export class CollisionSystem {
  constructor(gameState, audioSystem, cameraController) {
    this.gameState = gameState;
    this.audio = audioSystem;
    this.cameraController = cameraController;

    this.playerBox = new THREE.Box3();
    this.trafficBox = new THREE.Box3();
  }

  checkCollisions(playerCar, trafficManager, delta) {
    if (!this.gameState.isPlaying()) return false;

    const playerPos = playerCar.position;
    const playerSpeedKmh = playerCar.speedKmh;

    // Player collision volume (slightly padded for generous gameplay feel)
    this.playerBox.setFromCenterAndSize(
      new THREE.Vector3(playerPos.x, 0.6, playerPos.z),
      new THREE.Vector3(playerCar.width * 0.82, 1.0, playerCar.length * 0.82)
    );

    for (const v of trafficManager.activeVehicles) {
      const vPos = v.mesh.position;

      // Quick broadphase check: skip vehicles far away
      if (Math.abs(vPos.z - playerPos.z) > 18.0) continue;

      this.trafficBox.setFromCenterAndSize(
        new THREE.Vector3(vPos.x, v.height / 2, vPos.z),
        new THREE.Vector3(v.width * 0.86, v.height * 0.9, v.length * 0.86)
      );

      // 1. Direct Collision
      if (this.playerBox.intersectsBox(this.trafficBox)) {
        this.handleCrash(playerCar, v);
        return true;
      }

      // 2. Near-Miss Detection
      // Occurs when player passes vehicle closely (< 2.3m lateral) at high speed (> 80 km/h)
      if (!v.nearMissChecked && playerSpeedKmh > 75) {
        const lateralDist = Math.abs(playerPos.x - vPos.x);
        const zDist = Math.abs(playerPos.z - vPos.z);
        
        // When player's front overtakes vehicle center
        if (lateralDist < CONSTANTS.SCORING.NEAR_MISS_DISTANCE && zDist < (playerCar.length / 2 + v.length / 2)) {
          v.nearMissChecked = true;
          this.handleNearMiss(lateralDist);
        }
      }
    }

    return false;
  }

  handleCrash(playerCar, trafficVehicle) {
    this.cameraController.addShake(1.2);
    this.audio.playCrash();
    
    // Save high score if achieved
    this.gameState.saveHighScore(this.gameState.score, this.gameState.distance);
    this.gameState.setState('GAMEOVER');
  }

  handleNearMiss(lateralDist) {
    this.cameraController.addShake(0.18);
    this.audio.playNearMiss();
    
    // Bonus scales with proximity: closer = more points!
    const closenessBonus = Math.floor((CONSTANTS.SCORING.NEAR_MISS_DISTANCE - lateralDist) * 150);
    const totalBonus = CONSTANTS.SCORING.NEAR_MISS_BASE_POINTS + closenessBonus;

    this.gameState.addNearMiss(totalBonus);
  }
}
