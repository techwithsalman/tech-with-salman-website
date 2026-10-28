// Highway Racer 3D - AI Traffic Vehicle Factory (Multiple vehicle classes & procedural models)

import * as THREE from 'three';

export const VEHICLE_TYPES = {
  SPORTS: 'SPORTS',
  SEDAN: 'SEDAN',
  SUV: 'SUV',
  TRUCK: 'TRUCK',
  VAN: 'VAN'
};

const TRAFFIC_PALETTE = [
  0x1a73e8, // Royal Blue
  0xd9381e, // Flame Red
  0xf4b400, // Canary Yellow
  0x137333, // British Racing Green
  0x202124, // Obsidian Black
  0xe8eaed, // Pearl White
  0x5f6368, // Gunmetal Gray
  0xff6d00  // Sunset Orange
];

export class VehicleFactory {
  constructor() {
    this.tireMat = new THREE.MeshStandardMaterial({ color: 0x18191c, roughness: 0.9 });
    this.rimMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8, roughness: 0.3 });
    this.glassMat = new THREE.MeshPhysicalMaterial({ color: 0x080c14, roughness: 0.1, metalness: 0.9, transparent: true, opacity: 0.9 });
    this.carbonMat = new THREE.MeshStandardMaterial({ color: 0x1f2228, roughness: 0.5 });
    this.headlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.taillightMat = new THREE.MeshBasicMaterial({ color: 0xff1e27 });
  }

  createVehicle(type = null) {
    if (!type) {
      const types = [VEHICLE_TYPES.SEDAN, VEHICLE_TYPES.SUV, VEHICLE_TYPES.SPORTS, VEHICLE_TYPES.TRUCK, VEHICLE_TYPES.VAN];
      const weights = [0.3, 0.25, 0.2, 0.15, 0.1];
      const r = Math.random();
      let acc = 0;
      for (let i = 0; i < types.length; i++) {
        acc += weights[i];
        if (r <= acc) {
          type = types[i];
          break;
        }
      }
    }

    const color = TRAFFIC_PALETTE[Math.floor(Math.random() * TRAFFIC_PALETTE.length)];
    const bodyMat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.25,
      metalness: 0.75
    });

    switch (type) {
      case VEHICLE_TYPES.TRUCK:
        return this.createSemiTruck(bodyMat);
      case VEHICLE_TYPES.SUV:
        return this.createSUV(bodyMat);
      case VEHICLE_TYPES.SPORTS:
        return this.createSportsCar(bodyMat);
      case VEHICLE_TYPES.VAN:
        return this.createVan(bodyMat);
      case VEHICLE_TYPES.SEDAN:
      default:
        return this.createSedan(bodyMat);
    }
  }

  createSedan(bodyMat) {
    const group = new THREE.Group();
    const wheels = [];

    // Dimensions: 1.85m W x 4.6m L x 1.4m H
    const width = 1.85, length = 4.6, height = 1.4;

    // Chassis / lower body
    const lowerGeo = new THREE.BoxGeometry(width, 0.5, length);
    const lower = new THREE.Mesh(lowerGeo, bodyMat);
    lower.position.y = 0.5;
    lower.castShadow = true;
    group.add(lower);

    // Cabin
    const cabinGeo = new THREE.BoxGeometry(width * 0.86, 0.52, length * 0.55);
    const cabin = new THREE.Mesh(cabinGeo, bodyMat);
    cabin.position.set(0, 0.98, -0.2);
    cabin.castShadow = true;
    group.add(cabin);

    // Windows
    const windshield = new THREE.Mesh(new THREE.PlaneGeometry(width * 0.82, 0.65), this.glassMat);
    windshield.position.set(0, 0.98, 1.1);
    windshield.rotation.x = -Math.PI / 3.2;
    group.add(windshield);

    const rearWin = new THREE.Mesh(new THREE.PlaneGeometry(width * 0.82, 0.6), this.glassMat);
    rearWin.position.set(0, 0.98, -1.5);
    rearWin.rotation.x = Math.PI / 3.4;
    rearWin.rotation.y = Math.PI;
    group.add(rearWin);

    // Headlights & Taillights
    this.addLights(group, width, length, 0.55);

    // Wheels
    const wR = 0.35, wW = 0.24, wX = width * 0.52;
    wheels.push(this.addWheel(group, -wX, wR, 1.4));
    wheels.push(this.addWheel(group, wX, wR, 1.4));
    wheels.push(this.addWheel(group, -wX, wR, -1.4));
    wheels.push(this.addWheel(group, wX, wR, -1.4));

    return {
      type: VEHICLE_TYPES.SEDAN,
      mesh: group,
      wheels,
      width,
      length,
      height,
      baseSpeedKmh: 75 + Math.random() * 20 // 75-95 km/h
    };
  }

  createSUV(bodyMat) {
    const group = new THREE.Group();
    const wheels = [];

    const width = 2.05, length = 4.85, height = 1.75;

    // Bulky body
    const lowerGeo = new THREE.BoxGeometry(width, 0.65, length);
    const lower = new THREE.Mesh(lowerGeo, bodyMat);
    lower.position.y = 0.62;
    lower.castShadow = true;
    group.add(lower);

    // Tall Cabin extending back
    const cabinGeo = new THREE.BoxGeometry(width * 0.9, 0.68, length * 0.68);
    const cabin = new THREE.Mesh(cabinGeo, bodyMat);
    cabin.position.set(0, 1.25, -0.4);
    cabin.castShadow = true;
    group.add(cabin);

    // Roof Rack Bars
    const rackGeo = new THREE.BoxGeometry(width * 0.75, 0.08, length * 0.6);
    const rack = new THREE.Mesh(rackGeo, this.carbonMat);
    rack.position.set(0, 1.64, -0.4);
    group.add(rack);

    // Windows
    const windshield = new THREE.Mesh(new THREE.PlaneGeometry(width * 0.85, 0.72), this.glassMat);
    windshield.position.set(0, 1.22, 1.25);
    windshield.rotation.x = -Math.PI / 3.0;
    group.add(windshield);

    this.addLights(group, width, length, 0.68);

    // Larger Wheels
    const wR = 0.42, wW = 0.28, wX = width * 0.52;
    wheels.push(this.addWheel(group, -wX, wR, 1.5));
    wheels.push(this.addWheel(group, wX, wR, 1.5));
    wheels.push(this.addWheel(group, -wX, wR, -1.5));
    wheels.push(this.addWheel(group, wX, wR, -1.5));

    return {
      type: VEHICLE_TYPES.SUV,
      mesh: group,
      wheels,
      width,
      length,
      height,
      baseSpeedKmh: 68 + Math.random() * 18 // 68-86 km/h
    };
  }

  createSportsCar(bodyMat) {
    const group = new THREE.Group();
    const wheels = [];

    const width = 1.9, length = 4.4, height = 1.22;

    const lowerGeo = new THREE.BoxGeometry(width, 0.38, length);
    const lower = new THREE.Mesh(lowerGeo, bodyMat);
    lower.position.y = 0.4;
    lower.castShadow = true;
    group.add(lower);

    // Sleek cockpit
    const cabinGeo = new THREE.BoxGeometry(width * 0.8, 0.44, length * 0.48);
    const cabin = new THREE.Mesh(cabinGeo, bodyMat);
    cabin.position.set(0, 0.78, -0.2);
    cabin.castShadow = true;
    group.add(cabin);

    // Small spoiler
    const wingGeo = new THREE.BoxGeometry(width * 0.88, 0.06, 0.3);
    const wing = new THREE.Mesh(wingGeo, this.carbonMat);
    wing.position.set(0, 0.95, -2.0);
    group.add(wing);

    this.addLights(group, width, length, 0.45);

    const wR = 0.34, wW = 0.25, wX = width * 0.52;
    wheels.push(this.addWheel(group, -wX, wR, 1.3));
    wheels.push(this.addWheel(group, wX, wR, 1.3));
    wheels.push(this.addWheel(group, -wX, wR, -1.3));
    wheels.push(this.addWheel(group, wX, wR, -1.3));

    return {
      type: VEHICLE_TYPES.SPORTS,
      mesh: group,
      wheels,
      width,
      length,
      height,
      baseSpeedKmh: 90 + Math.random() * 25 // 90-115 km/h
    };
  }

  createVan(bodyMat) {
    const group = new THREE.Group();
    const wheels = [];

    const width = 2.0, length = 5.2, height = 2.0;

    // Boxy utility body
    const bodyGeo = new THREE.BoxGeometry(width, 1.35, length);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.05;
    body.castShadow = true;
    group.add(body);

    // Windshield
    const winGeo = new THREE.PlaneGeometry(width * 0.88, 0.75);
    const windshield = new THREE.Mesh(winGeo, this.glassMat);
    windshield.position.set(0, 1.3, 2.61);
    windshield.rotation.x = -0.15;
    group.add(windshield);

    this.addLights(group, width, length, 0.65);

    const wR = 0.38, wW = 0.26, wX = width * 0.52;
    wheels.push(this.addWheel(group, -wX, wR, 1.7));
    wheels.push(this.addWheel(group, wX, wR, 1.7));
    wheels.push(this.addWheel(group, -wX, wR, -1.7));
    wheels.push(this.addWheel(group, wX, wR, -1.7));

    return {
      type: VEHICLE_TYPES.VAN,
      mesh: group,
      wheels,
      width,
      length,
      height,
      baseSpeedKmh: 70 + Math.random() * 16 // 70-86 km/h
    };
  }

  createSemiTruck(bodyMat) {
    const group = new THREE.Group();
    const wheels = [];

    // Giant 18-wheeler semi-truck: 2.6m W x 13.5m L x 3.8m H
    const width = 2.5, length = 13.0, height = 3.6;

    // 1. Front Cab (Tractor)
    const cabGeo = new THREE.BoxGeometry(width, 2.4, 3.2);
    const cab = new THREE.Mesh(cabGeo, bodyMat);
    cab.position.set(0, 1.7, 4.8);
    cab.castShadow = true;
    group.add(cab);

    // Cab windshield
    const cabWinGeo = new THREE.PlaneGeometry(width * 0.88, 1.1);
    const cabWin = new THREE.Mesh(cabWinGeo, this.glassMat);
    cabWin.position.set(0, 2.1, 6.42);
    group.add(cabWin);

    // Chrome Grill & Exhaust Stacks
    const grillGeo = new THREE.BoxGeometry(width * 0.65, 0.9, 0.1);
    const grill = new THREE.Mesh(grillGeo, this.rimMat);
    grill.position.set(0, 1.1, 6.42);
    group.add(grill);

    const stackGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.8, 8);
    const leftStack = new THREE.Mesh(stackGeo, this.rimMat);
    leftStack.position.set(-width * 0.52, 2.8, 3.3);
    group.add(leftStack);

    const rightStack = new THREE.Mesh(stackGeo, this.rimMat);
    rightStack.position.set(width * 0.52, 2.8, 3.3);
    group.add(rightStack);

    // 2. Huge Cargo Trailer Container
    const trailerMat = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      roughness: 0.5,
      metalness: 0.4
    });

    const trailerGeo = new THREE.BoxGeometry(width * 1.05, 2.8, 9.2);
    const trailer = new THREE.Mesh(trailerGeo, trailerMat);
    trailer.position.set(0, 2.2, -1.8);
    trailer.castShadow = true;
    group.add(trailer);

    // Lights
    this.addLights(group, width, length, 0.8);

    // Heavy Truck Wheels (6 dual pairs)
    const wR = 0.5, wW = 0.32, wX = width * 0.52;
    wheels.push(this.addWheel(group, -wX, wR, 5.2));
    wheels.push(this.addWheel(group, wX, wR, 5.2));
    wheels.push(this.addWheel(group, -wX, wR, 3.6));
    wheels.push(this.addWheel(group, wX, wR, 3.6));
    wheels.push(this.addWheel(group, -wX, wR, -5.2));
    wheels.push(this.addWheel(group, wX, wR, -5.2));
    wheels.push(this.addWheel(group, -wX, wR, -4.0));
    wheels.push(this.addWheel(group, wX, wR, -4.0));

    return {
      type: VEHICLE_TYPES.TRUCK,
      mesh: group,
      wheels,
      width: width * 1.05,
      length,
      height,
      baseSpeedKmh: 50 + Math.random() * 15 // 50-65 km/h
    };
  }

  addLights(group, width, length, y) {
    const halfW = width / 2;
    const halfL = length / 2;

    // Headlights (Front, z = +halfL)
    const hlGeo = new THREE.BoxGeometry(0.32, 0.14, 0.08);
    const leftHl = new THREE.Mesh(hlGeo, this.headlightMat);
    leftHl.position.set(-halfW + 0.3, y, halfL + 0.02);
    group.add(leftHl);

    const rightHl = new THREE.Mesh(hlGeo, this.headlightMat);
    rightHl.position.set(halfW - 0.3, y, halfL + 0.02);
    group.add(rightHl);

    // Taillights (Rear, z = -halfL)
    const tlGeo = new THREE.BoxGeometry(0.35, 0.12, 0.08);
    const leftTl = new THREE.Mesh(tlGeo, this.taillightMat);
    leftTl.position.set(-halfW + 0.32, y, -halfL - 0.02);
    group.add(leftTl);

    const rightTl = new THREE.Mesh(tlGeo, this.taillightMat);
    rightTl.position.set(halfW - 0.32, y, -halfL - 0.02);
    group.add(rightTl);
  }

  addWheel(group, x, radius, z) {
    const wheel = new THREE.Group();
    wheel.position.set(x, radius, z);

    const tireGeo = new THREE.CylinderGeometry(radius, radius, 0.24, 14);
    const tire = new THREE.Mesh(tireGeo, this.tireMat);
    tire.rotation.z = Math.PI / 2;
    tire.castShadow = true;
    wheel.add(tire);

    const rimGeo = new THREE.CylinderGeometry(radius * 0.65, radius * 0.65, 0.25, 10);
    const rim = new THREE.Mesh(rimGeo, this.rimMat);
    rim.rotation.z = Math.PI / 2;
    wheel.add(rim);

    group.add(wheel);
    return wheel;
  }
}
