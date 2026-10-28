// Highway Racer 3D - AI Traffic Manager (Spawning, lane routing, speed regulation, lifecycle)

import * as THREE from 'three';
import { CONSTANTS } from '../utils/constants.js';
import { VehicleFactory } from './VehicleFactory.js';

export class TrafficManager {
  constructor(scene, gameState) {
    this.scene = scene;
    this.gameState = gameState;
    this.factory = new VehicleFactory();

    this.activeVehicles = [];
    this.spawnTimer = 0;

    this.laneCenters = CONSTANTS.LANE_CENTERS; // [-5.7, -1.9, 1.9, 5.7]
  }

  getSpawnInterval() {
    // Difficulty ramps up over 2 minutes: spawn rate from 1.8s down to 0.7s
    const progress = Math.min(1.0, this.gameState.timeElapsed / CONSTANTS.TRAFFIC.DIFFICULTY_RAMP_TIME);
    return CONSTANTS.TRAFFIC.INITIAL_SPAWN_RATE - (progress * (CONSTANTS.TRAFFIC.INITIAL_SPAWN_RATE - CONSTANTS.TRAFFIC.MIN_SPAWN_RATE));
  }

  spawnVehicle(playerZ) {
    if (this.activeVehicles.length >= CONSTANTS.TRAFFIC.MAX_ACTIVE_CARS) return;

    // Pick a randomized lane
    const availableLanes = [...this.laneCenters];
    // Shuffle lanes
    for (let i = availableLanes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [availableLanes[i], availableLanes[j]] = [availableLanes[j], availableLanes[i]];
    }

    const spawnDist = CONSTANTS.TRAFFIC.MIN_SPAWN_DIST + (Math.random() * (CONSTANTS.TRAFFIC.MAX_SPAWN_DIST - CONSTANTS.TRAFFIC.MIN_SPAWN_DIST));
    const targetZ = playerZ + spawnDist;

    // Find a lane without a car too close to targetZ
    let selectedLaneX = null;
    for (const laneX of availableLanes) {
      let isClear = true;
      for (const v of this.activeVehicles) {
        if (Math.abs(v.mesh.position.x - laneX) < 1.0 && Math.abs(v.mesh.position.z - targetZ) < 35.0) {
          isClear = false;
          break;
        }
      }
      if (isClear) {
        selectedLaneX = laneX;
        break;
      }
    }

    if (selectedLaneX === null) return; // All candidate positions currently occupied

    const vehicleData = this.factory.createVehicle();
    vehicleData.mesh.position.set(selectedLaneX, 0, targetZ);
    vehicleData.speedMs = vehicleData.baseSpeedKmh / 3.6;
    vehicleData.nearMissChecked = false;

    this.scene.add(vehicleData.mesh);
    this.activeVehicles.push(vehicleData);
  }

  update(playerZ, delta) {
    // 1. Spawning timer
    this.spawnTimer += delta;
    if (this.spawnTimer >= this.getSpawnInterval()) {
      this.spawnTimer = 0;
      this.spawnVehicle(playerZ);
    }

    // 2. Update active traffic positions & wheel rotations
    const despawnZ = playerZ - CONSTANTS.TRAFFIC.DESPAWN_BEHIND_DIST;

    for (let i = this.activeVehicles.length - 1; i >= 0; i--) {
      const v = this.activeVehicles[i];

      // Forward movement
      v.mesh.position.z += v.speedMs * delta;

      // Wheel rotation
      const dist = v.speedMs * delta;
      const rotDelta = (dist / (2 * Math.PI * 0.35)) * (Math.PI * 2);
      for (const wheel of v.wheels) {
        wheel.rotation.x += rotDelta;
      }

      // Check despawn
      if (v.mesh.position.z < despawnZ || v.mesh.position.z > (playerZ + CONSTANTS.TRAFFIC.MAX_SPAWN_DIST + 80)) {
        this.scene.remove(v.mesh);
        this.activeVehicles.splice(i, 1);
      }
    }
  }

  reset() {
    for (const v of this.activeVehicles) {
      this.scene.remove(v.mesh);
    }
    this.activeVehicles = [];
    this.spawnTimer = 0;
  }
}
