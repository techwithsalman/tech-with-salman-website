import * as THREE from 'three';
import { CONSTANTS } from '../utils/constants.js';

const damp = (a, b, rate, dt) => THREE.MathUtils.damp(a, b, rate, dt);

// Ferrari 458 Italia by vicent091036, CC BY 4.0.
export class PlayerCar {
  constructor(scene, source) {
    this.position = new THREE.Vector3(3.8, 0, 10); // Start in right carriageway forward lane
    this.velocity = new THREE.Vector3();
    this.heading = 0; // Yaw angle in radians (0 = facing +Z)
    this.speed = 0; // Signed forward speed in m/s (positive = forward, negative = reverse)
    this.speedKmh = 0;
    this.gear = 'D'; // 'D' (Drive) or 'R' (Reverse)
    this.steerAngle = 0;
    this.wheelbase = 2.65;
    this.lateralSlip = 0; // Lateral slide velocity during drift

    // Nitro & Drift
    this.nitro = 100; // 0 to 100%
    this.isNitroActive = false;
    this.isDrifting = false;
    this.driftScore = 0;
    this.driftTimer = 0;

    // Road Spline Tracking & Wrong Way
    this.currentS = 10;
    this.currentU = 3.8;
    this.isWrongWay = false;
    this.wrongWayTimer = 0;

    // Body dynamics
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

  toggleGear() {
    if (Math.abs(this.speed) < 12 / 3.6) {
      this.gear = this.gear === 'D' ? 'R' : 'D';
      this.speed = 0;
    }
  }

  update(dt, input, spline = null) {
    const p = CONSTANTS.PLAYER;
    this.elapsed += dt;

    // 1. Steering sensitivity based on speed:
    //    Full lock (0.65 rad / ~37 deg) at low speeds allows agile U-turns!
    //    Smoothly tapers at 200+ km/h for high-speed highway stability.
    const speedAbs = Math.abs(this.speed);
    const speedRatio = Math.min(1.0, speedAbs / (230 / 3.6));
    const maxSteerLimit = 0.65 - speedRatio * 0.43; // 0.65 rad down to 0.22 rad
    const targetSteerAngle = input.steer * maxSteerLimit;

    const steerSmoothing = input.steer === 0 ? 15.0 : 10.0;
    this.steerAngle += (targetSteerAngle - this.steerAngle) * Math.min(1.0, dt * steerSmoothing);

    // 2. Nitro Management
    this.isNitroActive = false;
    let nitroThrust = 0;
    if (input.nitro > 0.5 && this.nitro > 5 && this.gear === 'D' && this.speed > 5) {
      this.isNitroActive = true;
      this.nitro = Math.max(0, this.nitro - 25.0 * dt);
      nitroThrust = 16.0;
    } else {
      this.nitro = Math.min(100, this.nitro + 4.5 * dt);
    }

    // 3. Acceleration, Braking and Gear Shift (Automatic Drive / Reverse)
    const isBraking = input.brake > 0.05;
    const isHandbraking = input.handbrake > 0.1;
    const topForwardSpeed = (this.isNitroActive ? 260 : p.MAX_SPEED_KMH) / 3.6;
    const topReverseSpeed = 65 / 3.6;

    if (this.gear === 'D') {
      if (input.throttle > 0.05) {
        const engineTorque = input.throttle * (p.ACCELERATION + nitroThrust) * (1 - 0.42 * (this.speed / topForwardSpeed));
        this.speed = Math.min(topForwardSpeed, this.speed + engineTorque * dt);
      } else if (isBraking) {
        if (this.speed > 0.6) {
          this.speed = Math.max(0, this.speed - input.brake * p.BRAKING * dt);
        } else {
          // Automatic shift to Reverse when stopped and brake held
          this.gear = 'R';
          this.speed = 0;
        }
      } else {
        // Natural rolling friction & aerodynamic drag
        const drag = 0.8 + 0.0006 * this.speed ** 2;
        this.speed = Math.max(0, this.speed - drag * dt);
      }
    } else if (this.gear === 'R') {
      if (isBraking) {
        // Reverse throttle
        const revThrust = input.brake * 9.5 * (1 - 0.4 * (Math.abs(this.speed) / topReverseSpeed));
        this.speed = Math.max(-topReverseSpeed, this.speed - revThrust * dt);
      } else if (input.throttle > 0.05) {
        if (this.speed < -0.6) {
          this.speed = Math.min(0, this.speed + input.throttle * p.BRAKING * dt);
        } else {
          // Automatic shift back to Drive
          this.gear = 'D';
          this.speed = 0;
        }
      } else {
        this.speed = Math.min(0, this.speed + 4.0 * dt);
      }
    }

    if (isHandbraking && speedAbs > 1) {
      this.speed = Math.sign(this.speed) * Math.max(0, speedAbs - p.HANDBRAKE_DECEL * dt);
    }

    this.speedKmh = this.speed * 3.6;

    // 4. Free-Steering Heading & Slip Dynamics
    // Kinematic bicycle yaw rate: omega = (v / L) * tan(delta)
    let gripFactor = THREE.MathUtils.smoothstep(speedAbs, 0, 8);
    let driftMultiplier = 1.0;

    this.isDrifting = false;
    if (isHandbraking && speedAbs > 12) {
      this.isDrifting = true;
      driftMultiplier = 1.85; // Tail kicks out into slide
      this.driftTimer += dt;
      this.driftScore += Math.floor(speedAbs * 12 * dt);
    } else {
      this.driftTimer = Math.max(0, this.driftTimer - dt * 2);
    }

    if (speedAbs > 0.1) {
      const yawRate = (this.speed / this.wheelbase) * Math.tan(this.steerAngle) * gripFactor * driftMultiplier;
      this.heading += yawRate * dt;
    }

    // Keep heading in [-PI, PI]
    this.heading = (this.heading + Math.PI) % (2 * Math.PI) - Math.PI;

    // 5. Position Integration (World Coordinates)
    // Forward unit vector in Three.js coordinate system (facing -Z when yaw=0? Or facing +Z?)
    // In our verified system: forward is (+Z), Left is (+X), Right is (-X).
    // Vector for heading:
    const fwdX = -Math.sin(this.heading);
    const fwdZ = Math.cos(this.heading);

    const distanceDelta = this.speed * dt;
    this.position.x += fwdX * distanceDelta;
    this.position.z += fwdZ * distanceDelta;

    // 6. Spline Projection, Wrong-Way Logic & Barrier Collisions
    if (spline) {
      const proj = spline.project(this.position, this.currentS);
      this.currentS = proj.s;
      this.currentU = proj.u;

      const frame = proj.frame;
      if (frame) {
        // Wrong-way check:
        // Forward road tangent heading
        const roadHeading = frame.heading;
        let headingDiff = Math.abs(this.heading - roadHeading);
        if (headingDiff > Math.PI) headingDiff = 2 * Math.PI - headingDiff;

        // On right carriageway (u > 0), player should be driving in road heading direction (diff < 90 deg)
        // On left carriageway (u < 0), oncoming traffic flows opposite (diff > 90 deg is normal for oncoming, but diff < 90 deg is driving against oncoming traffic!)
        if (proj.u > 0.8 && headingDiff > Math.PI * 0.55 && speedAbs > 4) {
          this.isWrongWay = true;
          this.wrongWayTimer += dt;
        } else if (proj.u < -0.8 && headingDiff < Math.PI * 0.45 && speedAbs > 4) {
          // Driving forward in opposite carriageway into oncoming traffic!
          this.isWrongWay = true;
          this.wrongWayTimer += dt;
        } else {
          this.isWrongWay = false;
        }

        // Road Boundary & Barrier Collisions:
        // Outer Guardrails at |u| = 10.1m
        const maxRoadU = 10.05;
        if (Math.abs(proj.u) > maxRoadU) {
          const side = Math.sign(proj.u);
          const clampedPos = spline.getPointAt(proj.s, side * maxRoadU, this.position.y);
          this.position.copy(clampedPos);
          // Elastic bounce inward
          this.speed *= 0.82;
          this.rollVelocity += side * 2.2;
        }

        // Center Median Barrier:
        // Median is from u = -0.5m to +0.5m.
        // If frame.isMedianOpen is FALSE: solid concrete barrier blocks crossing!
        if (!frame.isMedianOpen && Math.abs(proj.u) < 0.6) {
          const side = proj.u >= 0 ? 1 : -1;
          const clampedPos = spline.getPointAt(proj.s, side * 0.75, this.position.y);
          this.position.copy(clampedPos);
          this.speed *= 0.85;
          this.rollVelocity -= side * 2.0;
        }
      }
    }

    // 7. Update 3D Transformations
    this.group.position.copy(this.position);
    this.group.rotation.y = this.heading;

    // Wheel animation
    for (const wheel of this.wheels) wheel.rotation.x += distanceDelta / 0.345;
    for (const holder of this.frontWheelHolders) holder.rotation.y = this.steerAngle;

    // Body roll (centrifugal tilt into turns) & pitch (acceleration squat, brake dive)
    const lateralAccel = (speedAbs * (this.speed / this.wheelbase) * Math.tan(this.steerAngle));
    const targetRoll = THREE.MathUtils.clamp(-lateralAccel * 0.003, -0.065, 0.065);
    const accelForward = (distanceDelta / Math.max(dt, 0.001));
    const targetPitch = THREE.MathUtils.clamp(this.gear === 'D' ? (input.throttle ? -0.025 : isBraking ? 0.045 : 0) : (isBraking ? -0.025 : 0.02), -0.04, 0.05);

    this.rollAngle = damp(this.rollAngle, targetRoll, 8, dt);
    this.pitchAngle = damp(this.pitchAngle, targetPitch, 8, dt);
    this.carBodyGroup.rotation.set(this.pitchAngle, 0, this.rollAngle);

    // Interior steering wheel rotation
    if (this.steeringWheel) {
      this.steeringWheel.quaternion.copy(this.steeringBase);
      this.steeringWheel.rotateX(-this.steerAngle * 2.2);
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
    this.position.set(3.8, 0, 10);
    this.velocity.set(0, 0, 0);
    this.heading = 0;
    this.speed = 0;
    this.speedKmh = 0;
    this.gear = 'D';
    this.steerAngle = 0;
    this.nitro = 100;
    this.driftScore = 0;
    this.currentS = 10;
    this.currentU = 3.8;
    this.isWrongWay = false;
    this.wrongWayTimer = 0;
    this.group.position.copy(this.position);
    this.group.rotation.set(0, 0, 0);
    this.carBodyGroup.rotation.set(0, 0, 0);
    for (const w of this.wheels) w.rotation.x = 0;
    for (const w of this.frontWheelHolders) w.rotation.y = 0;
  }
}
