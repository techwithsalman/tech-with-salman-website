import * as THREE from 'three';
import { CONSTANTS } from '../utils/constants.js';

const damp = (a, b, rate, dt) => THREE.MathUtils.damp(a, b, rate, dt);

// Ferrari 458 Italia - High-Performance Sports Car with Assisted Arcade Driving
export class PlayerCar {
  constructor(scene, source) {
    // Driving Mode: 'ARCADE' (Assisted Arcade Driving - DEFAULT) or 'ADVANCED' (Freestyle 360°)
    this.driveMode = 'ARCADE';

    // Position along road spline
    // Right carriageway forward lanes: inner lane u = 3.5m, outer lane u = 6.8m
    this.currentS = 10;
    this.currentU = 4.8; // Centered in right carriageway forward lanes
    this.position = new THREE.Vector3(4.8, 0, 10);
    this.velocity = new THREE.Vector3();
    this.lateralVelocity = 0; // Lateral velocity for smooth lane changes

    // Forward physics
    this.speed = 0; // Signed forward speed in m/s (positive = forward, negative = reverse)
    this.speedKmh = 0;
    this.gear = 'D'; // 'D' (Drive) or 'R' (Reverse)
    this.steerAngle = 0;
    this.heading = 0; // World yaw angle in radians

    // Nitro & Drift
    this.nitro = 100;
    this.isNitroActive = false;
    this.isDrifting = false;
    this.driftScore = 0;

    // Advanced mode tracking
    this.wheelbase = 2.65;
    this.isWrongWay = false;
    this.wrongWayTimer = 0;

    // Body dynamics (roll & pitch)
    this.rollAngle = this.pitchAngle = 0;
    this.rollVelocity = this.pitchVelocity = this.elapsed = 0;

    // 3D Model Hierarchy
    this.group = new THREE.Group();
    this.carBodyGroup = new THREE.Group();
    this.group.add(this.carBodyGroup);

    this.model = source.clone(true);
    this.model.rotation.y = Math.PI; // Source model faces -Z internally
    const box = new THREE.Box3().setFromObject(this.model);
    const scale = 4.527 / box.getSize(new THREE.Vector3()).z;
    this.model.scale.setScalar(scale);
    box.setFromObject(this.model);
    const center = box.getCenter(new THREE.Vector3());
    this.model.position.set(-center.x, -box.min.y + 0.025, -center.z);
    this.carBodyGroup.add(this.model);
    box.setFromObject(this.model);
    const size = box.getSize(new THREE.Vector3());

    this.visualWidth = size.x;
    this.width = CONSTANTS.PLAYER.WIDTH;
    this.height = size.y;
    this.length = size.z;

    this.wheels = [];
    this.frontWheelHolders = [];

    // PBR Materials
    this.paintMat = new THREE.MeshPhysicalMaterial({
      color: 0xb70924, metalness: 0.72, roughness: 0.24,
      clearcoat: 1, clearcoatRoughness: 0.1, envMapIntensity: 1.25
    });
    this.glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xb9d6dc, metalness: 0.05, roughness: 0.08, transparent: true,
      opacity: 0.22, depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 0.65
    });
    this.taillightMat = new THREE.MeshStandardMaterial({
      color: 0xad050c, emissive: 0xff0a04, emissiveIntensity: 0.65, roughness: 0.24, metalness: 0.15
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
        o.material.color.setHex(0x4a4d4e); o.material.roughness = 0.75; o.material.metalness = 0.1;
      }
      if (o.name === 'body') o.material = this.paintMat;
      if (o.name === 'glass') { o.material = this.glassMat; o.castShadow = false; }
      if (o.name === 'lights_red') o.material = this.taillightMat;
      if (/rim_/.test(o.name))
        o.material = new THREE.MeshStandardMaterial({ color: 0xc1c4c5, metalness: 1, roughness: 0.22 });
      if (/tire/i.test(o.name)) { o.material.color.setHex(0x18191a); o.material.roughness = 0.96; }
      if (o.name === 'leds') { o.material.emissive.setHex(0xe5f4ff); o.material.emissiveIntensity = 2; }
    });
    this.model.updateMatrixWorld(true);

    // Axles & Wheel Spin Nodes
    for (const name of ['wheel_fl', 'wheel_fr', 'wheel_rl', 'wheel_rr']) {
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

  setDriveMode(mode) {
    this.driveMode = mode;
  }

  toggleDriveMode() {
    this.driveMode = this.driveMode === 'ARCADE' ? 'ADVANCED' : 'ARCADE';
    return this.driveMode;
  }

  toggleGear() {
    if (Math.abs(this.speed) < 12 / 3.6) {
      this.gear = this.gear === 'D' ? 'R' : 'D';
      this.speed = 0;
    }
  }

  update(dt, input, spline = null) {
    const p = CONSTANTS.PLAYER;
    this.elapsed += dt;

    // 1. Nitro Boost System
    this.isNitroActive = false;
    let nitroThrust = 0;
    if (input.nitro > 0.5 && this.nitro > 5 && this.gear === 'D' && this.speed > 5) {
      this.isNitroActive = true;
      this.nitro = Math.max(0, this.nitro - 25.0 * dt);
      nitroThrust = 16.0;
    } else {
      this.nitro = Math.min(100, this.nitro + 5.0 * dt);
    }

    // 2. Forward / Reverse Speed & Transmission
    const isBraking = input.brake > 0.05;
    const isHandbraking = input.handbrake > 0.1;
    const topForwardSpeed = (this.isNitroActive ? 260 : p.MAX_SPEED_KMH) / 3.6;
    const topReverseSpeed = 48 / 3.6;
    const speedRatio = THREE.MathUtils.clamp(Math.abs(this.speed) / (p.MAX_SPEED_KMH / 3.6), 0, 1);

    if (this.gear === 'D') {
      if (input.throttle > 0.05) {
        const engineTorque = input.throttle * (p.ACCELERATION + nitroThrust) * (1 - 0.45 * speedRatio);
        this.speed = Math.min(topForwardSpeed, this.speed + engineTorque * dt);
      } else if (isBraking) {
        if (this.speed > 0.6) {
          this.speed = Math.max(0, this.speed - input.brake * p.BRAKING * dt);
        } else {
          // Holding brake when stopped automatically engages Reverse gear!
          this.gear = 'R';
          this.speed = -0.5;
        }
      } else {
        // Natural aerodynamic rolling resistance
        const drag = 0.8 + 0.00065 * (this.speed ** 2);
        this.speed = Math.max(0, this.speed - drag * dt);
      }

      if (isHandbraking) {
        this.speed = Math.max(0, this.speed - p.HANDBRAKE_DECEL * dt);
      }
    } else {
      // Reverse gear transmission
      if (input.throttle > 0.1 && Math.abs(this.speed) < 1.0) {
        // Holding gas when stopped in reverse smoothly shifts back into Drive!
        this.gear = 'D';
        this.speed = 0.5;
      } else if (isBraking || input.throttle < 0.05) {
        // In reverse, pressing brake / down accelerates backwards
        const revAcc = (input.brake > 0.05 ? input.brake : 0.8) * 8.5;
        this.speed = Math.max(-topReverseSpeed, this.speed - revAcc * dt);
      } else {
        this.speed = Math.min(0, this.speed + 12.0 * dt);
      }
    }
    this.speedKmh = this.speed * 3.6;

    let distanceDelta = this.speed * dt;

    // 3. STEERING & LATERAL KINEMATICS
    if (this.driveMode === 'ARCADE' || !spline) {
      // =========================================================================
      // ASSISTED ARCADE DRIVING (DEFAULT)
      // Intuitive, stable handling from previous production build:
      // - Left/Right provides smooth, predictable lane changes
      // - Auto-follows highway curvature with ZERO user effort
      // - Releasing steering instantly stabilizes the car in its current lane
      // - Steering sensitivity automatically tapers at high speeds
      // - Strictly clamped to drivable roadway surface (cannot enter grass)
      // =========================================================================
      const grip = THREE.MathUtils.smoothstep(Math.abs(this.speedKmh), 0, 32);

      // Target lateral speed:
      // In Frenet frame (s, u), road normal N points to driver's LEFT (+X at heading 0).
      // Left input (steer > 0): shifts car LEFT (increases u towards outer guardrail)
      // Right input (steer < 0): shifts car RIGHT (decreases u towards inner median)
      // Sensitivity decreases with speed for rock-solid highway stability
      const steerSpeed = (p.STEER_SPEED - speedRatio * 2.2) * grip;
      const targetLateralVel = input.steer * steerSpeed;

      // Strong lateral damping when steering is released: eliminates residual velocity smoothly without snap
      if (Math.abs(input.steer) < 0.01) {
        this.lateralVelocity = damp(this.lateralVelocity, 0, 18.0, dt);
        if (Math.abs(this.lateralVelocity) < 0.01) {
          this.lateralVelocity = 0;
        }
      } else {
        this.lateralVelocity = damp(this.lateralVelocity, targetLateralVel, 7.5, dt);
      }

      // Handbrake drift responsiveness (Drifting ONLY activates through explicit handbrake input!)
      this.isDrifting = isHandbraking && Math.abs(this.speedKmh) > 40 && Math.abs(input.steer) > 0.15;
      if (this.isDrifting) {
        this.lateralVelocity *= 1.15;
      }

      // Integrate lateral position across road
      this.currentU += this.lateralVelocity * dt;

      // Strict road boundary enforcement without elastic impulses:
      // Right carriageway forward lanes:
      // Left outer guardrail is at u = 8.6m, Right inner median curb is at u = 1.8m.
      const minU = 1.8;
      const maxU = 8.6;

      if (this.currentU >= maxU) {
        this.currentU = maxU;
        if (this.lateralVelocity > 0) {
          this.lateralVelocity = 0; // Immediate halt to outward lateral drift; no elastic bouncing
        }
        this.speed = Math.max(0, this.speed - 4.5 * dt);
      } else if (this.currentU <= minU) {
        this.currentU = minU;
        if (this.lateralVelocity < 0) {
          this.lateralVelocity = 0; // Immediate halt to inward lateral drift; no elastic bouncing
        }
        this.speed = Math.max(0, this.speed - 4.5 * dt);
      }

      // Advance along road spline
      this.currentS = Math.max(0, this.currentS + distanceDelta);

      // Compute 3D World Transformation from Road Spline
      let frame;
      if (spline) {
        frame = spline.getFrameAt(this.currentS);
        const worldPos = spline.getPointAt(this.currentS, this.currentU, 0);
        this.position.copy(worldPos);

        // Visual steering yaw: gentle tilt during lane changes (returns to 0 when released)
        // Shifting left (lateralVelocity > 0) tilts nose left (negative yaw)
        // Shifting right (lateralVelocity < 0) tilts nose right (positive yaw)
        const visualYaw = -Math.atan2(this.lateralVelocity, Math.max(16, Math.abs(this.speed))) * 0.45;
        this.heading = frame.heading + visualYaw;
      } else {
        this.position.set(this.currentU, 0, this.currentS);
        this.heading = 0;
      }

      this.isWrongWay = false;

      // Wheel turn angle (for visual front wheels: steer > 0 turns wheels left)
      this.steerAngle = damp(this.steerAngle, input.steer * p.MAX_STEER_ANGLE * grip / (1 + speedRatio * 1.5), 14, dt);

      // Centrifugal curve roll & steering roll
      const curveRoll = THREE.MathUtils.clamp((this.speed ** 2) * (frame?.curvature || 0) * -0.003, -0.05, 0.05);
      const steerRoll = THREE.MathUtils.clamp(this.lateralVelocity * 0.008, -0.04, 0.04);
      this.rollAngle = damp(this.rollAngle, curveRoll + steerRoll, 8, dt);

      // Pitch dynamics (acceleration squat, brake dive)
      const targetPitch = THREE.MathUtils.clamp(isBraking ? 0.04 : (input.throttle ? -0.025 : 0), -0.035, 0.05);
      this.pitchAngle = damp(this.pitchAngle, targetPitch, 8, dt);

    } else {
      // =========================================================================
      // OPTIONAL ADVANCED / FREESTYLE MODE (Bicycle Kinematics, 360° Heading)
      // For optional freestyle U-turns and wrong-way driving
      // =========================================================================
      const speedAbs = Math.abs(this.speed);
      const maxSteerLimit = 0.55 - speedRatio * 0.35;
      const targetSteerAngle = -input.steer * maxSteerLimit; // Left input turns heading left
      this.steerAngle = damp(this.steerAngle, targetSteerAngle, Math.abs(input.steer) < 0.01 ? 16.0 : 9.0, dt);

      const yawRate = (this.speed / this.wheelbase) * Math.tan(this.steerAngle);
      this.heading += yawRate * dt;

      const fwdX = -Math.sin(this.heading);
      const fwdZ = Math.cos(this.heading);
      this.position.x += fwdX * distanceDelta;
      this.position.z += fwdZ * distanceDelta;

      if (spline) {
        const proj = spline.project(this.position, this.currentS);
        this.currentS = proj.s;
        this.currentU = proj.u;

        // Boundary clamp
        if (Math.abs(proj.u) > 10.05) {
          const side = Math.sign(proj.u);
          this.position.copy(spline.getPointAt(proj.s, side * 10.05, 0));
          this.speed *= 0.85;
        }

        const frame = spline.getFrameAt(this.currentS);
        let headingDiff = Math.abs(this.heading - frame.heading);
        if (headingDiff > Math.PI) headingDiff = 2 * Math.PI - headingDiff;
        this.isWrongWay = (proj.u > 0.8 && headingDiff > Math.PI * 0.55 && speedAbs > 6) ||
                          (proj.u < -0.8 && headingDiff < Math.PI * 0.45 && speedAbs > 6);
      }

      this.isDrifting = isHandbraking && speedAbs > 12;
      this.rollAngle = damp(this.rollAngle, THREE.MathUtils.clamp(-yawRate * 0.05, -0.065, 0.065), 8, dt);
      this.pitchAngle = damp(this.pitchAngle, THREE.MathUtils.clamp(isBraking ? 0.04 : -0.02, -0.035, 0.05), 8, dt);
    }

    // 4. Update 3D Transformations
    this.group.position.copy(this.position);
    this.group.rotation.y = this.heading;
    this.carBodyGroup.rotation.set(this.pitchAngle, 0, this.rollAngle);

    // Wheel spin & steer rotations (wheels turn visibly in steering direction)
    const visualSteerAngle = this.driveMode === 'ARCADE' ? this.steerAngle : -this.steerAngle;
    for (const wheel of this.wheels) wheel.rotation.x += distanceDelta / 0.345;
    for (const holder of this.frontWheelHolders) holder.rotation.y = visualSteerAngle;

    // Interior steering wheel rotation
    if (this.steeringWheel) {
      this.steeringWheel.quaternion.copy(this.steeringBase);
      this.steeringWheel.rotateX(-visualSteerAngle * 2.2);
    }

    this.taillightMat.emissiveIntensity = (isBraking || this.gear === 'R') ? 3.2 : 0.65;

    return {
      distanceDelta: Math.abs(distanceDelta),
      speedKmh: Math.abs(this.speedKmh),
      gear: this.gear,
      isBraking,
      isSkidding: this.isDrifting,
      isNitroActive: this.isNitroActive,
      isWrongWay: this.isWrongWay
    };
  }

  getCockpitPose(position, target) {
    this.carBodyGroup.updateWorldMatrix(true, false);
    position.set(0.37, 1.05, 0.05).applyMatrix4(this.carBodyGroup.matrixWorld);
    target.set(0.37, 0.95, 25).applyMatrix4(this.carBodyGroup.matrixWorld);
  }

  reset() {
    this.currentS = 10;
    this.currentU = 4.8;
    this.position.set(4.8, 0, 10);
    this.velocity.set(0, 0, 0);
    this.lateralVelocity = 0;
    this.heading = 0;
    this.speed = 0;
    this.speedKmh = 0;
    this.gear = 'D';
    this.steerAngle = 0;
    this.nitro = 100;
    this.isNitroActive = false;
    this.isDrifting = false;
    this.driftScore = 0;
    this.isWrongWay = false;
    this.wrongWayTimer = 0;
    this.group.position.copy(this.position);
    this.group.rotation.set(0, 0, 0);
    this.carBodyGroup.rotation.set(0, 0, 0);
    for (const w of this.wheels) w.rotation.x = 0;
    for (const w of this.frontWheelHolders) w.rotation.y = 0;
  }
}
