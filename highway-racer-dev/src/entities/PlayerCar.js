// Highway Racer 3D - High-Detail Sports Car Entity & Physics

import * as THREE from 'three';
import { CONSTANTS } from '../utils/constants.js';

export class PlayerCar {
  constructor(scene) {
    this.scene = scene;

    // Physics & State
    this.width = CONSTANTS.PLAYER.WIDTH;
    this.length = CONSTANTS.PLAYER.LENGTH;
    this.height = CONSTANTS.PLAYER.HEIGHT;

    this.position = new THREE.Vector3(0, 0, 0);
    this.velocity = new THREE.Vector3(0, 0, 0); // m/s
    this.speedKmh = 0;
    this.steerAngle = 0;
    this.rollAngle = 0;
    this.pitchAngle = 0;

    // Lateral boundaries (cannot drive off road barrier)
    this.maxLateralX = (CONSTANTS.ROAD_WIDTH / 2) + 0.8; // ~8.4m

    // Visual Mesh Container
    this.group = new THREE.Group();
    this.carBodyGroup = new THREE.Group(); // Handles roll & pitch independently of wheels
    this.group.add(this.carBodyGroup);

    // Wheels references for rotation
    this.wheels = [];
    this.frontWheelHolders = [];

    // Lighting references
    this.taillightMeshes = [];
    this.headlightBeams = [];

    this.buildCarModel();
    this.scene.add(this.group);
  }

  buildCarModel() {
    // High-end sports car materials
    const paintColor = 0xe62438; // Racing Crimson Red
    const bodyMat = new THREE.MeshPhysicalMaterial({
      color: paintColor,
      roughness: 0.18,
      metalness: 0.85,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1
    });

    const carbonMat = new THREE.MeshStandardMaterial({
      color: 0x111317,
      roughness: 0.45,
      metalness: 0.7
    });

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x05070d,
      roughness: 0.1,
      metalness: 0.9,
      transmission: 0.35,
      transparent: true,
      opacity: 0.92
    });

    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xdddddd,
      roughness: 0.15,
      metalness: 0.95
    });

    const tireMat = new THREE.MeshStandardMaterial({
      color: 0x1c1d21,
      roughness: 0.85,
      metalness: 0.1
    });

    const rimMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37, // Satin Gold Rims
      roughness: 0.25,
      metalness: 0.9
    });

    const headlightMat = new THREE.MeshBasicMaterial({
      color: 0xffffff
    });

    this.taillightMat = new THREE.MeshBasicMaterial({
      color: CONSTANTS.COLORS.TAILLIGHT_GLOW
    });

    // 1. Lower Chassis & Side Skirts
    const chassisGeo = new THREE.BoxGeometry(1.85, 0.32, 4.3);
    const chassisMesh = new THREE.Mesh(chassisGeo, carbonMat);
    chassisMesh.position.y = 0.28;
    chassisMesh.castShadow = true;
    this.carBodyGroup.add(chassisMesh);

    // Front Splitter
    const splitterGeo = new THREE.BoxGeometry(1.88, 0.08, 0.65);
    const splitter = new THREE.Mesh(splitterGeo, carbonMat);
    splitter.position.set(0, 0.16, 2.15);
    this.carBodyGroup.add(splitter);

    // Rear Diffuser
    const diffuserGeo = new THREE.BoxGeometry(1.82, 0.18, 0.5);
    const diffuser = new THREE.Mesh(diffuserGeo, carbonMat);
    diffuser.position.set(0, 0.24, -2.15);
    this.carBodyGroup.add(diffuser);

    // 2. Main Sculpted Car Hood & Body
    const bodyGeo = new THREE.BoxGeometry(1.8, 0.46, 2.4);
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.position.set(0, 0.56, 0.1);
    bodyMesh.castShadow = true;
    this.carBodyGroup.add(bodyMesh);

    // Sloped Hood
    const hoodGeo = new THREE.BoxGeometry(1.72, 0.24, 1.35);
    const hood = new THREE.Mesh(hoodGeo, bodyMat);
    hood.position.set(0, 0.54, 1.45);
    hood.rotation.x = -0.12; // Slopes forward
    hood.castShadow = true;
    this.carBodyGroup.add(hood);

    // Hood Air Intake Scoop
    const scoopGeo = new THREE.BoxGeometry(0.65, 0.08, 0.7);
    const scoop = new THREE.Mesh(scoopGeo, carbonMat);
    scoop.position.set(0, 0.68, 1.3);
    this.carBodyGroup.add(scoop);

    // 3. Cabin Cockpit & Roof
    const cabinGeo = new THREE.BoxGeometry(1.42, 0.48, 1.75);
    const cabin = new THREE.Mesh(cabinGeo, bodyMat);
    cabin.position.set(0, 0.94, -0.15);
    cabin.castShadow = true;
    this.carBodyGroup.add(cabin);

    // Windshield (Front)
    const windshieldGeo = new THREE.PlaneGeometry(1.35, 0.75);
    const windshield = new THREE.Mesh(windshieldGeo, glassMat);
    windshield.position.set(0, 0.92, 0.82);
    windshield.rotation.x = -Math.PI / 3.4;
    this.carBodyGroup.add(windshield);

    // Rear Window
    const rearWindowGeo = new THREE.PlaneGeometry(1.32, 0.65);
    const rearWindow = new THREE.Mesh(rearWindowGeo, glassMat);
    rearWindow.position.set(0, 0.92, -1.05);
    rearWindow.rotation.x = Math.PI / 3.6;
    rearWindow.rotation.y = Math.PI;
    this.carBodyGroup.add(rearWindow);

    // Side Windows
    const sideWinGeo = new THREE.PlaneGeometry(1.4, 0.4);
    const leftWin = new THREE.Mesh(sideWinGeo, glassMat);
    leftWin.position.set(-0.72, 0.95, -0.15);
    leftWin.rotation.y = -Math.PI / 2;
    this.carBodyGroup.add(leftWin);

    const rightWin = new THREE.Mesh(sideWinGeo, glassMat);
    rightWin.position.set(0.72, 0.95, -0.15);
    rightWin.rotation.y = Math.PI / 2;
    this.carBodyGroup.add(rightWin);

    // Side Mirrors
    const mirrorGeo = new THREE.BoxGeometry(0.24, 0.12, 0.18);
    const leftMirror = new THREE.Mesh(mirrorGeo, carbonMat);
    leftMirror.position.set(-0.85, 0.85, 0.65);
    this.carBodyGroup.add(leftMirror);

    const rightMirror = new THREE.Mesh(mirrorGeo, carbonMat);
    rightMirror.position.set(0.85, 0.85, 0.65);
    this.carBodyGroup.add(rightMirror);

    // 4. Rear GT Racing Spoiler Wing
    const spoilerWingGeo = new THREE.BoxGeometry(1.8, 0.08, 0.42);
    const spoilerWing = new THREE.Mesh(spoilerWingGeo, carbonMat);
    spoilerWing.position.set(0, 1.25, -2.05);
    spoilerWing.castShadow = true;
    this.carBodyGroup.add(spoilerWing);

    // Spoiler Upright Struts
    const strutGeo = new THREE.BoxGeometry(0.06, 0.38, 0.18);
    const leftStrut = new THREE.Mesh(strutGeo, carbonMat);
    leftStrut.position.set(-0.55, 1.05, -2.0);
    this.carBodyGroup.add(leftStrut);

    const rightStrut = new THREE.Mesh(strutGeo, carbonMat);
    rightStrut.position.set(0.55, 1.05, -2.0);
    this.carBodyGroup.add(rightStrut);

    // 5. Headlights
    const hlGeo = new THREE.BoxGeometry(0.38, 0.12, 0.12);
    const leftHl = new THREE.Mesh(hlGeo, headlightMat);
    leftHl.position.set(-0.68, 0.58, 2.12);
    this.carBodyGroup.add(leftHl);

    const rightHl = new THREE.Mesh(hlGeo, headlightMat);
    rightHl.position.set(0.68, 0.58, 2.12);
    this.carBodyGroup.add(rightHl);

    // Headlight Spot Beams illuminating road forward
    this.createHeadlightBeam(-0.68, 0.55, 2.1);
    this.createHeadlightBeam(0.68, 0.55, 2.1);

    // 6. Rear LED Taillight Strip
    const tlGeo = new THREE.BoxGeometry(0.72, 0.1, 0.08);
    const leftTl = new THREE.Mesh(tlGeo, this.taillightMat);
    leftTl.position.set(-0.5, 0.62, -2.14);
    this.carBodyGroup.add(leftTl);
    this.taillightMeshes.push(leftTl);

    const rightTl = new THREE.Mesh(tlGeo, this.taillightMat);
    rightTl.position.set(0.5, 0.62, -2.14);
    this.carBodyGroup.add(rightTl);
    this.taillightMeshes.push(rightTl);

    // 7. Dual Chrome Exhaust Tips
    const exhaustGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.35, 12);
    const leftExhaust = new THREE.Mesh(exhaustGeo, chromeMat);
    leftExhaust.rotation.x = Math.PI / 2;
    leftExhaust.position.set(-0.45, 0.28, -2.18);
    this.carBodyGroup.add(leftExhaust);

    const rightExhaust = new THREE.Mesh(exhaustGeo, chromeMat);
    rightExhaust.rotation.x = Math.PI / 2;
    rightExhaust.position.set(0.45, 0.28, -2.18);
    this.carBodyGroup.add(rightExhaust);

    // 8. Four 3D Alloy Wheels
    const wheelRadius = 0.36;
    const wheelWidth = 0.26;
    const wheelX = 0.94;
    const frontZ = 1.35;
    const rearZ = -1.35;

    // Front Left (steers)
    this.flHolder = new THREE.Group();
    this.flHolder.position.set(-wheelX, wheelRadius, frontZ);
    this.flWheel = this.createWheelMesh(wheelRadius, wheelWidth, tireMat, rimMat);
    this.flHolder.add(this.flWheel);
    this.group.add(this.flHolder);
    this.wheels.push(this.flWheel);
    this.frontWheelHolders.push(this.flHolder);

    // Front Right (steers)
    this.frHolder = new THREE.Group();
    this.frHolder.position.set(wheelX, wheelRadius, frontZ);
    this.frWheel = this.createWheelMesh(wheelRadius, wheelWidth, tireMat, rimMat);
    this.frHolder.add(this.frWheel);
    this.group.add(this.frHolder);
    this.wheels.push(this.frWheel);
    this.frontWheelHolders.push(this.frHolder);

    // Rear Left
    const rlWheel = this.createWheelMesh(wheelRadius, wheelWidth, tireMat, rimMat);
    rlWheel.position.set(-wheelX, wheelRadius, rearZ);
    this.group.add(rlWheel);
    this.wheels.push(rlWheel);

    // Rear Right
    const rrWheel = this.createWheelMesh(wheelRadius, wheelWidth, tireMat, rimMat);
    rrWheel.position.set(wheelX, wheelRadius, rearZ);
    this.group.add(rrWheel);
    this.wheels.push(rrWheel);
  }

  createHeadlightBeam(x, y, z) {
    const spot = new THREE.SpotLight(0xfff7e6, 4.5, 60, Math.PI / 6, 0.45, 1.2);
    spot.position.set(x, y, z);
    spot.target.position.set(x, 0, z + 25);
    this.carBodyGroup.add(spot);
    this.carBodyGroup.add(spot.target);
    this.headlightBeams.push(spot);
  }

  createWheelMesh(radius, width, tireMat, rimMat) {
    const wheelGroup = new THREE.Group();

    // Rubber Tire
    const tireGeo = new THREE.CylinderGeometry(radius, radius, width, 18);
    const tire = new THREE.Mesh(tireGeo, tireMat);
    tire.rotation.z = Math.PI / 2;
    tire.castShadow = true;
    wheelGroup.add(tire);

    // Rim Hub
    const rimGeo = new THREE.CylinderGeometry(radius * 0.68, radius * 0.68, width + 0.02, 14);
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.rotation.z = Math.PI / 2;
    wheelGroup.add(rim);

    // Center Cap
    const capGeo = new THREE.CylinderGeometry(radius * 0.22, radius * 0.22, width + 0.04, 10);
    const cap = new THREE.Mesh(capGeo, new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.9 }));
    cap.rotation.z = Math.PI / 2;
    wheelGroup.add(cap);

    return wheelGroup;
  }

  update(delta, input) {
    const p = CONSTANTS.PLAYER;

    // 1. Longitudinal Acceleration & Braking
    const maxSpeedMs = p.MAX_SPEED_KMH / 3.6; // ~63.8 m/s
    const isBraking = input.brake > 0.05 || input.handbrake > 0.05;

    if (input.throttle > 0.05) {
      this.velocity.z += input.throttle * p.ACCELERATION * delta;
    } else {
      // Natural rolling friction
      if (this.velocity.z > 0) {
        this.velocity.z = Math.max(0, this.velocity.z - (p.NATURAL_FRICTION * delta));
      }
    }

    if (input.brake > 0.05) {
      this.velocity.z = Math.max(0, this.velocity.z - (input.brake * p.BRAKING * delta));
    }

    if (input.handbrake > 0.05) {
      this.velocity.z = Math.max(0, this.velocity.z - (p.HANDBRAKE_DECEL * delta));
    }

    this.velocity.z = Math.min(this.velocity.z, maxSpeedMs);
    this.speedKmh = this.velocity.z * 3.6;

    // 2. Lateral Steering Dynamics (steering responsiveness scales with speed)
    const steerResponsiveness = Math.min(1.0, this.speedKmh / 35.0); // No steering when stationary
    const targetLateralSpeed = input.steer * p.STEER_SPEED * steerResponsiveness;
    this.velocity.x += (targetLateralSpeed - this.velocity.x) * Math.min(1.0, delta * 14.0);

    // Apply movement
    this.position.z += this.velocity.z * delta;
    this.position.x += this.velocity.x * delta;

    // Clamp to highway barriers
    if (Math.abs(this.position.x) > this.maxLateralX) {
      this.position.x = Math.sign(this.position.x) * this.maxLateralX;
      this.velocity.x = 0;
    }

    this.group.position.copy(this.position);

    // 3. Wheel Rotations (Rolling forward proportional to speed)
    const wheelCircumference = 2 * Math.PI * 0.36;
    const distanceTraveled = this.velocity.z * delta;
    const rotationDelta = (distanceTraveled / wheelCircumference) * (Math.PI * 2);

    for (const wheel of this.wheels) {
      wheel.rotation.x += rotationDelta;
    }

    // Front Wheels Steer Angle
    const targetSteerAngle = -input.steer * p.MAX_STEER_ANGLE * steerResponsiveness;
    this.steerAngle += (targetSteerAngle - this.steerAngle) * Math.min(1.0, delta * 15.0);
    for (const holder of this.frontWheelHolders) {
      holder.rotation.y = this.steerAngle;
    }

    // 4. Car Body Roll & Pitch (Suspension simulation)
    // Roll leans into lateral acceleration
    const targetRoll = -this.velocity.x * p.BODY_ROLL_FACTOR * 0.12;
    this.rollAngle += (targetRoll - this.rollAngle) * Math.min(1.0, delta * 10.0);
    this.carBodyGroup.rotation.z = this.rollAngle;

    // Pitch tilts forward under braking, backward under hard throttle
    let targetPitch = 0;
    if (isBraking) {
      targetPitch = 0.04;
    } else if (input.throttle > 0.5 && this.speedKmh < 160) {
      targetPitch = -0.035;
    }
    this.pitchAngle += (targetPitch - this.pitchAngle) * Math.min(1.0, delta * 8.0);
    this.carBodyGroup.rotation.x = this.pitchAngle;

    // Slight vehicle yaw following turn
    this.carBodyGroup.rotation.y = -this.velocity.x * 0.025;

    // 5. Taillight brightness under braking
    const brakeActive = isBraking && this.speedKmh > 1.0;
    this.taillightMat.color.setHex(brakeActive ? CONSTANTS.COLORS.BRAKE_GLOW : CONSTANTS.COLORS.TAILLIGHT_GLOW);

    return {
      distanceDelta: this.velocity.z * delta,
      speedKmh: this.speedKmh,
      isBraking,
      isSkidding: Math.abs(input.steer) > 0.6 && this.speedKmh > 110
    };
  }

  getBoundingBox() {
    return new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(this.position.x, 0.6, this.position.z),
      new THREE.Vector3(this.width * 0.88, 1.1, this.length * 0.88)
    );
  }

  reset() {
    this.position.set(0, 0, 0);
    this.velocity.set(0, 0, 0);
    this.speedKmh = 0;
    this.steerAngle = 0;
    this.rollAngle = 0;
    this.pitchAngle = 0;
    this.group.position.set(0, 0, 0);
    this.group.rotation.set(0, 0, 0);
    this.carBodyGroup.rotation.set(0, 0, 0);
  }
}
