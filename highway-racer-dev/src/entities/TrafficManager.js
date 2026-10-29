// Highway Racer 3D - AI Traffic Manager on Curved Highway & Dual Carriageway

import * as THREE from 'three';
import { CONSTANTS } from '../utils/constants.js';
import { VehicleFactory } from './VehicleFactory.js';

export class TrafficManager {
  constructor(scene, gameState, assets, spline) {
    this.scene = scene;
    this.gameState = gameState;
    this.factory = new VehicleFactory(assets);
    this.spline = spline;

    this.activeVehicles = [];
    this.spawnTimer = 0;

    // Dual carriageway lanes:
    // Forward lanes (Right side): u = 3.5m (inner), u = 6.8m (outer)
    // Oncoming lanes (Left side / Wrong-way): u = -3.5m (inner), u = -6.8m (outer)
    this.forwardLanes = [3.5, 6.8];
    this.oncomingLanes = [-3.5, -6.8];
  }

  setSpline(spline) {
    this.spline = spline;
  }

  getSpawnInterval() {
    const level = this.gameState.difficultyLevel || 1;
    // Spawn rate ramps up with difficulty: 2.0s down to 0.7s
    return Math.max(0.7, 2.0 - (level - 1) * 0.28);
  }

  spawnVehicle(playerS, forceOncoming = false) {
    if (this.activeVehicles.length >= (CONSTANTS.TRAFFIC.MAX_ACTIVE_CARS || 14)) return;

    // 70% forward traffic on right carriageway, 30% oncoming traffic on left carriageway
    // (Or 50/50 if player is driving wrong way!)
    const isOncoming = forceOncoming || Math.random() < 0.35;
    const laneOptions = isOncoming ? this.oncomingLanes : this.forwardLanes;
    const targetU = laneOptions[Math.floor(Math.random() * laneOptions.length)];

    // Spawn distance: 100m to 250m ahead along road spline
    const spawnDist = 95 + Math.random() * 150;
    const targetS = playerS + spawnDist;

    // Ensure no other car is too close to targetS in same lane
    for (const v of this.activeVehicles) {
      if (Math.abs(v.u - targetU) < 1.0 && Math.abs(v.s - targetS) < 32.0) {
        return; // Lane occupied
      }
    }

    const vehicleData = this.factory.createVehicle();
    vehicleData.s = targetS;
    vehicleData.u = targetU;
    vehicleData.isOncoming = isOncoming;
    vehicleData.speedMs = vehicleData.baseSpeedKmh / 3.6;
    vehicleData.nearMissChecked = false;

    // Position & heading from spline
    const frame = this.spline.getFrameAt(targetS);
    const pos = this.spline.getPointAt(targetS, targetU, 0);
    vehicleData.mesh.position.copy(pos);
    vehicleData.mesh.rotation.y = frame.heading + (isOncoming ? Math.PI : 0);

    this.scene.add(vehicleData.mesh);
    this.activeVehicles.push(vehicleData);
  }

  update(playerS, delta) {
    // 1. Spawning
    this.spawnTimer += delta;
    if (this.spawnTimer >= this.getSpawnInterval()) {
      this.spawnTimer = 0;
      this.spawnVehicle(playerS);
    }

    // 2. Lifecycle & Movement along spline
    const despawnBehindS = playerS - 60;
    const despawnAheadS = playerS + 320;

    for (let i = this.activeVehicles.length - 1; i >= 0; i--) {
      const v = this.activeVehicles[i];

      // Forward traffic travels along +s; Oncoming traffic travels along -s
      if (v.isOncoming) {
        v.s -= v.speedMs * delta;
      } else {
        // Forward traffic: simple headway slowing behind other cars
        let targetSpeed = v.preferredSpeedMs || v.speedMs;
        for (const other of this.activeVehicles) {
          if (other === v || other.isOncoming || Math.abs(other.u - v.u) > 1.2) continue;
          const forwardGap = other.s - v.s;
          if (forwardGap > 0 && forwardGap < 25) {
            targetSpeed = Math.min(targetSpeed, other.speedMs * 0.95);
          }
        }
        v.speedMs += (targetSpeed - v.speedMs) * Math.min(1.0, delta * 2.0);
        v.s += v.speedMs * delta;
      }

      // Update 3D World Transformation from Spline
      const frame = this.spline.getFrameAt(v.s);
      const pos = this.spline.getPointAt(v.s, v.u, 0);
      v.mesh.position.copy(pos);
      v.mesh.rotation.y = frame.heading + (v.isOncoming ? Math.PI : 0);

      v.wheelDistance = (v.wheelDistance || 0) + v.speedMs * delta;

      // Despawn check
      if (v.s < despawnBehindS || v.s > despawnAheadS) {
        this.scene.remove(v.mesh);
        this.factory.release(v);
        this.activeVehicles.splice(i, 1);
      }
    }
  }

  updateVisuals(camera) {
    for (const vehicle of this.activeVehicles) {
      this.factory.updateVisual(vehicle, camera);
    }
  }

  reset(seedTraffic = false) {
    for (const v of this.activeVehicles) {
      this.scene.remove(v.mesh);
      this.factory.release(v);
    }
    this.activeVehicles = [];
    this.spawnTimer = 0;

    if (seedTraffic) {
      // Seed initial forward and oncoming traffic
      this.spawnVehicle(0, false);
      this.spawnVehicle(0, true);
      this.spawnVehicle(30, false);
    }
  }
}
