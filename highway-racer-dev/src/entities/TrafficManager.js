// Highway Racer 3D - AI Traffic Manager on 5-Lane Highway
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

    // 5 clearly marked forward highway lanes:
    // Lane 1 (Leftmost / Fast): u = +7.4m
    // Lane 2:                   u = +3.7m
    // Lane 3 (Center):          u = 0.0m
    // Lane 4:                   u = -3.7m
    // Lane 5 (Rightmost / Slow):u = -7.4m
    this.lanes = [7.4, 3.7, 0.0, -3.7, -7.4];
  }

  setSpline(spline) {
    this.spline = spline;
  }

  getSpawnInterval() {
    const level = this.gameState.difficultyLevel || 1;
    // Level 1: 2.5s, Level 2: 1.9s, Level 3: 1.4s, Level 4: 1.1s, Level 5+: 0.9s
    return Math.max(0.85, 2.6 - (level - 1) * 0.42);
  }

  getMaxActiveVehicles() {
    const level = this.gameState.difficultyLevel || 1;
    switch (level) {
      case 1: return 6;
      case 2: return 8;
      case 3: return 11;
      case 4: return 13;
      default: return 14;
    }
  }

  getSpeedRangeForLevel() {
    const level = this.gameState.difficultyLevel || 1;
    switch (level) {
      case 1: return { min: 65, max: 85 };  // Easy: slow, relaxed cruising
      case 2: return { min: 72, max: 100 }; // Normal: standard motorway speeds
      case 3: return { min: 78, max: 112 }; // Hard: dynamic speed variation
      case 4: return { min: 82, max: 122 }; // Expert: fast, tight traffic
      default: return { min: 85, max: 128 }; // Level 5+: high-speed challenge
    }
  }

  spawnVehicle(playerS) {
    if (this.activeVehicles.length >= this.getMaxActiveVehicles()) return;

    // Pick lane randomly with slight bias toward outer lanes (slower traffic on rights, faster on left)
    const targetU = this.lanes[Math.floor(Math.random() * this.lanes.length)];

    // Spawn distance: 105m to 260m ahead along road spline
    const spawnDist = 105 + Math.random() * 155;
    const targetS = playerS + spawnDist;

    // Safety check: ensure at least 38m longitudinal clearance in the same lane
    for (const v of this.activeVehicles) {
      if (Math.abs(v.u - targetU) < 1.8 && Math.abs(v.s - targetS) < 38.0) {
        return; // Lane temporarily occupied at targetS
      }
    }

    const vehicleData = this.factory.createVehicle();
    vehicleData.s = targetS;
    vehicleData.u = targetU;
    vehicleData.targetU = targetU;
    vehicleData.laneChangeTimer = 0;
    vehicleData.isOncoming = false; // Strictly one-way forward highway traffic!

    // Speed tuned by difficulty level and lane (Lane 1 fast, Lane 5 slow)
    const speedRange = this.getSpeedRangeForLevel();
    const laneSpeedBonus = (targetU / 7.4) * 12; // Far left lane drives up to 12 km/h faster
    const baseKmh = speedRange.min + Math.random() * (speedRange.max - speedRange.min) + laneSpeedBonus;
    vehicleData.speedMs = Math.max(50, baseKmh) / 3.6;
    vehicleData.preferredSpeedMs = vehicleData.speedMs;
    vehicleData.nearMissChecked = false;

    // Position & heading from spline (Three.js makeRotationY(-h) aligns local +Z with RoadSpline tangent)
    const frame = this.spline.getFrameAt(targetS);
    const pos = this.spline.getPointAt(targetS, targetU, 0);
    vehicleData.mesh.position.copy(pos);
    vehicleData.mesh.rotation.y = -frame.heading; // Forward along road tangent

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
    const despawnAheadS = playerS + 340;

    for (let i = this.activeVehicles.length - 1; i >= 0; i--) {
      const v = this.activeVehicles[i];

      // Safe headway tracking: slow down behind vehicles ahead in same lane
      let targetSpeed = v.preferredSpeedMs;
      for (const other of this.activeVehicles) {
        if (other === v || Math.abs(other.u - v.u) > 1.8) continue;
        const forwardGap = other.s - v.s;
        if (forwardGap > 0 && forwardGap < 28) {
          // Match speed of vehicle ahead
          targetSpeed = Math.min(targetSpeed, other.speedMs * 0.96);
        }
      }

      // Smooth acceleration / braking
      v.braking = targetSpeed < v.speedMs - 0.6;
      v.speedMs += (targetSpeed - v.speedMs) * Math.min(1.0, delta * 2.2);
      v.s += v.speedMs * delta;

      // Handle smooth lane changes if initiated
      let laneChangeVel = 0;
      if (Math.abs(v.u - v.targetU) > 0.05) {
        const stepU = Math.sign(v.targetU - v.u) * Math.min(Math.abs(v.targetU - v.u), 2.2 * delta);
        laneChangeVel = delta > 0.0001 ? (stepU / delta) : 0;
        v.u += stepU;
      } else {
        v.u = v.targetU;
      }

      // Occasional smart lane change if stuck behind a slower car
      v.laneChangeTimer += delta;
      if (v.laneChangeTimer > 4.0 && targetSpeed < v.preferredSpeedMs * 0.85) {
        v.laneChangeTimer = 0;
        // Try shifting to an adjacent lane
        const currentLaneIdx = this.lanes.findIndex(l => Math.abs(l - v.u) < 0.8);
        if (currentLaneIdx !== -1) {
          const possibleLanes = [];
          if (currentLaneIdx > 0) possibleLanes.push(this.lanes[currentLaneIdx - 1]);
          if (currentLaneIdx < this.lanes.length - 1) possibleLanes.push(this.lanes[currentLaneIdx + 1]);

          for (const candU of possibleLanes) {
            // Check if candidate lane has safe gap
            const isClear = this.activeVehicles.every(other => {
              if (other === v || Math.abs(other.u - candU) > 1.8) return true;
              return Math.abs(other.s - v.s) > 28;
            });
            if (isClear) {
              v.targetU = candU;
              break;
            }
          }
        }
      }

      // Update 3D World Transformation from Spline (aligned with road curve)
      // Three.js makeRotationY(-heading) maps local +Z to (-sin(heading), 0, cos(heading)) = frame.tangent
      const frame = this.spline.getFrameAt(v.s);
      const pos = this.spline.getPointAt(v.s, v.u, 0);
      const laneYaw = -Math.atan2(laneChangeVel, Math.max(18, v.speedMs)) * 0.25;
      v.mesh.position.copy(pos);
      v.mesh.rotation.y = -(frame.heading + laneYaw);

      // Spin wheels
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
      // Seed forward traffic across lanes
      this.spawnVehicle(0);
      this.spawnVehicle(40);
      this.spawnVehicle(80);
    }
  }
}
