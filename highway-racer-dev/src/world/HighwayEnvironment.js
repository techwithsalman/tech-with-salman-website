// Highway Racer 3D - Infinite Recycled Highway Environment

import * as THREE from 'three';
import { CONSTANTS } from '../utils/constants.js';

export class HighwayEnvironment {
  constructor(scene) {
    this.scene = scene;
    this.segments = [];
    this.segmentLength = CONSTANTS.SEGMENT_LENGTH;
    this.numSegments = CONSTANTS.VISIBLE_SEGMENTS;

    this.sharedMaterials = this.createMaterials();
    this.sharedGeometries = this.createGeometries();

    this.initSegments();
  }

  createMaterials() {
    return {
      asphalt: new THREE.MeshStandardMaterial({
        color: CONSTANTS.COLORS.ASPHALT,
        roughness: 0.75,
        metalness: 0.15
      }),
      shoulder: new THREE.MeshStandardMaterial({
        color: CONSTANTS.COLORS.SHOULDER,
        roughness: 0.9,
        metalness: 0.05
      }),
      marking: new THREE.MeshStandardMaterial({
        color: CONSTANTS.COLORS.LANE_MARKING,
        roughness: 0.4,
        metalness: 0.1
      }),
      barrier: new THREE.MeshStandardMaterial({
        color: CONSTANTS.COLORS.BARRIER,
        roughness: 0.45,
        metalness: 0.8
      }),
      reflector: new THREE.MeshStandardMaterial({
        color: CONSTANTS.COLORS.BARRIER_REFLECTOR,
        emissive: 0xff2211,
        emissiveIntensity: 0.7
      }),
      pole: new THREE.MeshStandardMaterial({
        color: 0x4a4d57,
        roughness: 0.5,
        metalness: 0.7
      }),
      lampGlow: new THREE.MeshBasicMaterial({
        color: 0xffeedd
      }),
      signGreen: new THREE.MeshStandardMaterial({
        color: 0x005a36,
        roughness: 0.6,
        metalness: 0.3
      }),
      grass: new THREE.MeshStandardMaterial({
        color: 0x141f17,
        roughness: 0.95,
        metalness: 0.0
      }),
      building: new THREE.MeshStandardMaterial({
        color: 0x12141c,
        roughness: 0.8,
        metalness: 0.4
      }),
      windowYellow: new THREE.MeshBasicMaterial({
        color: 0xffd27d
      }),
      treeTrunk: new THREE.MeshStandardMaterial({
        color: 0x2d1f18,
        roughness: 0.9
      }),
      treeLeaves: new THREE.MeshStandardMaterial({
        color: 0x1a3622,
        roughness: 0.85
      })
    };
  }

  createGeometries() {
    const roadWidth = CONSTANTS.ROAD_WIDTH;
    const len = this.segmentLength;

    return {
      road: new THREE.PlaneGeometry(roadWidth, len),
      shoulder: new THREE.PlaneGeometry(CONSTANTS.SHOULDER_WIDTH, len),
      solidLine: new THREE.PlaneGeometry(0.18, len),
      dashLine: new THREE.PlaneGeometry(0.16, 5.0),
      barrierRail: new THREE.BoxGeometry(0.25, 0.45, len),
      barrierPost: new THREE.CylinderGeometry(0.06, 0.06, 0.85, 8),
      reflector: new THREE.BoxGeometry(0.08, 0.12, 0.3),
      ground: new THREE.PlaneGeometry(160, len)
    };
  }

  createSegment(index) {
    const group = new THREE.Group();
    const len = this.segmentLength;
    const roadWidth = CONSTANTS.ROAD_WIDTH;
    const halfRoad = roadWidth / 2;

    // 1. Main Asphalt Surface
    const roadMesh = new THREE.Mesh(this.sharedGeometries.road, this.sharedMaterials.asphalt);
    roadMesh.rotation.x = -Math.PI / 2;
    roadMesh.receiveShadow = true;
    group.add(roadMesh);

    // 2. Road Shoulders (Left & Right)
    const leftShoulder = new THREE.Mesh(this.sharedGeometries.shoulder, this.sharedMaterials.shoulder);
    leftShoulder.rotation.x = -Math.PI / 2;
    leftShoulder.position.set(-halfRoad - (CONSTANTS.SHOULDER_WIDTH / 2), 0.01, 0);
    leftShoulder.receiveShadow = true;
    group.add(leftShoulder);

    const rightShoulder = new THREE.Mesh(this.sharedGeometries.shoulder, this.sharedMaterials.shoulder);
    rightShoulder.rotation.x = -Math.PI / 2;
    rightShoulder.position.set(halfRoad + (CONSTANTS.SHOULDER_WIDTH / 2), 0.01, 0);
    rightShoulder.receiveShadow = true;
    group.add(rightShoulder);

    // 3. Surrounding Ground (Grass/Terrain)
    const leftTerrain = new THREE.Mesh(this.sharedGeometries.ground, this.sharedMaterials.grass);
    leftTerrain.rotation.x = -Math.PI / 2;
    leftTerrain.position.set(-halfRoad - CONSTANTS.SHOULDER_WIDTH - 80, -0.05, 0);
    group.add(leftTerrain);

    const rightTerrain = new THREE.Mesh(this.sharedGeometries.ground, this.sharedMaterials.grass);
    rightTerrain.rotation.x = -Math.PI / 2;
    rightTerrain.position.set(halfRoad + CONSTANTS.SHOULDER_WIDTH + 80, -0.05, 0);
    group.add(rightTerrain);

    // 4. Outer Solid Edge Lines
    const leftSolid = new THREE.Mesh(this.sharedGeometries.solidLine, this.sharedMaterials.marking);
    leftSolid.rotation.x = -Math.PI / 2;
    leftSolid.position.set(-halfRoad, 0.02, 0);
    group.add(leftSolid);

    const rightSolid = new THREE.Mesh(this.sharedGeometries.solidLine, this.sharedMaterials.marking);
    rightSolid.rotation.x = -Math.PI / 2;
    rightSolid.position.set(halfRoad, 0.02, 0);
    group.add(rightSolid);

    // 5. Dashed Lane Divider Lines (3 dividers for 4 lanes)
    const laneDividersX = [-3.8, 0, 3.8];
    const dashLength = 5.0;
    const dashGap = 6.0;
    const totalCycle = dashLength + dashGap;
    const dashesPerSegment = Math.floor(len / totalCycle);

    for (const divX of laneDividersX) {
      for (let d = 0; d < dashesPerSegment; d++) {
        const dashMesh = new THREE.Mesh(this.sharedGeometries.dashLine, this.sharedMaterials.marking);
        dashMesh.rotation.x = -Math.PI / 2;
        const zPos = -len / 2 + (d * totalCycle) + (dashLength / 2);
        dashMesh.position.set(divX, 0.02, zPos);
        group.add(dashMesh);
      }
    }

    // 6. Metal Guardrails / Barriers
    const barrierOffset = halfRoad + CONSTANTS.SHOULDER_WIDTH + 0.15;
    
    // Left barrier rail
    const leftRail = new THREE.Mesh(this.sharedGeometries.barrierRail, this.sharedMaterials.barrier);
    leftRail.position.set(-barrierOffset, 0.55, 0);
    leftRail.castShadow = true;
    group.add(leftRail);

    // Right barrier rail
    const rightRail = new THREE.Mesh(this.sharedGeometries.barrierRail, this.sharedMaterials.barrier);
    rightRail.position.set(barrierOffset, 0.55, 0);
    rightRail.castShadow = true;
    group.add(rightRail);

    // Barrier posts every 8 meters
    const postCount = Math.floor(len / 8);
    for (let p = 0; p < postCount; p++) {
      const pZ = -len / 2 + (p * 8);

      const postL = new THREE.Mesh(this.sharedGeometries.barrierPost, this.sharedMaterials.barrier);
      postL.position.set(-barrierOffset, 0.42, pZ);
      group.add(postL);

      const postR = new THREE.Mesh(this.sharedGeometries.barrierPost, this.sharedMaterials.barrier);
      postR.position.set(barrierOffset, 0.42, pZ);
      group.add(postR);

      // Reflectors on posts every 16 meters
      if (p % 2 === 0) {
        const refL = new THREE.Mesh(this.sharedGeometries.reflector, this.sharedMaterials.reflector);
        refL.position.set(-barrierOffset + 0.12, 0.65, pZ);
        group.add(refL);

        const refR = new THREE.Mesh(this.sharedGeometries.reflector, this.sharedMaterials.reflector);
        refR.position.set(barrierOffset - 0.12, 0.65, pZ);
        group.add(refR);
      }
    }

    // 7. Street Light Poles (Alternating left and right every 40m)
    for (let l = -len / 2 + 20; l < len / 2; l += 40) {
      const isRight = (Math.abs(l) % 80 === 20);
      const poleX = isRight ? (barrierOffset + 1.2) : (-barrierOffset - 1.2);
      this.addStreetLight(group, poleX, l, isRight);
    }

    // 8. Overhead Highway Gantry Sign (every 3rd segment)
    if (index % 3 === 0) {
      this.addOverheadGantry(group, barrierOffset, 0);
    }

    // 9. Roadside Scenery (Trees & Distant Skyline Buildings)
    this.addRoadsideScenery(group, barrierOffset, len);

    return group;
  }

  addStreetLight(group, x, z, isRight) {
    const poleGroup = new THREE.Group();
    poleGroup.position.set(x, 0, z);

    // Vertical pole
    const height = 9.5;
    const vertGeo = new THREE.CylinderGeometry(0.12, 0.18, height, 8);
    const vertMesh = new THREE.Mesh(vertGeo, this.sharedMaterials.pole);
    vertMesh.position.y = height / 2;
    vertMesh.castShadow = true;
    poleGroup.add(vertMesh);

    // Horizontal cantilever arm reaching out over the road shoulder
    const armLength = 4.2;
    const armGeo = new THREE.CylinderGeometry(0.08, 0.1, armLength, 8);
    const armMesh = new THREE.Mesh(armGeo, this.sharedMaterials.pole);
    armMesh.rotation.z = isRight ? (Math.PI / 2.3) : (-Math.PI / 2.3);
    const armDir = isRight ? -1 : 1;
    armMesh.position.set(armDir * 1.6, height - 0.5, 0);
    poleGroup.add(armMesh);

    // Light fixture head
    const headGeo = new THREE.BoxGeometry(0.6, 0.25, 1.2);
    const headMesh = new THREE.Mesh(headGeo, this.sharedMaterials.pole);
    headMesh.position.set(armDir * 3.2, height - 0.9, 0);
    poleGroup.add(headMesh);

    // Emissive bulb
    const bulbGeo = new THREE.PlaneGeometry(0.5, 1.0);
    const bulbMesh = new THREE.Mesh(bulbGeo, this.sharedMaterials.lampGlow);
    bulbMesh.rotation.x = Math.PI / 2;
    bulbMesh.position.set(armDir * 3.2, height - 1.04, 0);
    poleGroup.add(bulbMesh);

    group.add(poleGroup);
  }

  addOverheadGantry(group, barrierOffset, z) {
    const gantry = new THREE.Group();
    gantry.position.set(0, 0, z);

    const spanWidth = (barrierOffset + 1.5) * 2;
    const height = 8.5;

    // Left support pillar
    const pillarGeo = new THREE.BoxGeometry(0.6, height, 0.6);
    const leftPillar = new THREE.Mesh(pillarGeo, this.sharedMaterials.barrier);
    leftPillar.position.set(-spanWidth / 2, height / 2, 0);
    gantry.add(leftPillar);

    // Right support pillar
    const rightPillar = new THREE.Mesh(pillarGeo, this.sharedMaterials.barrier);
    rightPillar.position.set(spanWidth / 2, height / 2, 0);
    gantry.add(rightPillar);

    // Cross truss beam
    const beamGeo = new THREE.BoxGeometry(spanWidth, 0.8, 0.6);
    const beamMesh = new THREE.Mesh(beamGeo, this.sharedMaterials.barrier);
    beamMesh.position.set(0, height - 0.4, 0);
    gantry.add(beamMesh);

    // Overhead Directional Signs (2 green boards)
    const signGeo = new THREE.BoxGeometry(4.8, 2.2, 0.15);
    
    const sign1 = new THREE.Mesh(signGeo, this.sharedMaterials.signGreen);
    sign1.position.set(-3.5, height - 0.5, 0.4);
    gantry.add(sign1);

    const sign2 = new THREE.Mesh(signGeo, this.sharedMaterials.signGreen);
    sign2.position.set(3.5, height - 0.5, 0.4);
    gantry.add(sign2);

    group.add(gantry);
  }

  addRoadsideScenery(group, barrierOffset, len) {
    // 1. Low-poly stylized trees spaced naturally along the roadside
    const treeCount = 6;
    for (let i = 0; i < treeCount; i++) {
      const z = -len / 2 + (i * (len / treeCount)) + (Math.random() * 8);

      // Left tree
      const xLeft = -barrierOffset - 3.5 - (Math.random() * 6);
      this.createTree(group, xLeft, z);

      // Right tree
      const xRight = barrierOffset + 3.5 + (Math.random() * 6);
      this.createTree(group, xRight, z);
    }

    // 2. Distant Skyline Buildings (Silhouettes with glowing illuminated windows)
    const buildingCount = 4;
    for (let b = 0; b < buildingCount; b++) {
      const z = -len / 2 + (b * (len / buildingCount));

      // Left building
      const widthL = 14 + Math.random() * 12;
      const heightL = 25 + Math.random() * 50;
      const depthL = 14 + Math.random() * 10;
      const xL = -barrierOffset - 35 - (Math.random() * 30);
      this.createBuilding(group, xL, z, widthL, heightL, depthL);

      // Right building
      const widthR = 14 + Math.random() * 12;
      const heightR = 25 + Math.random() * 50;
      const depthR = 14 + Math.random() * 10;
      const xR = barrierOffset + 35 + (Math.random() * 30);
      this.createBuilding(group, xR, z, widthR, heightR, depthR);
    }
  }

  createTree(group, x, z) {
    const tree = new THREE.Group();
    tree.position.set(x, 0, z);

    // Trunk
    const trunkGeo = new THREE.CylinderGeometry(0.25, 0.4, 2.5, 6);
    const trunk = new THREE.Mesh(trunkGeo, this.sharedMaterials.treeTrunk);
    trunk.position.y = 1.25;
    trunk.castShadow = true;
    tree.add(trunk);

    // Foliage (low-poly cones)
    const foliageGeo = new THREE.ConeGeometry(2.0, 4.5, 6);
    const foliage = new THREE.Mesh(foliageGeo, this.sharedMaterials.treeLeaves);
    foliage.position.y = 4.2;
    foliage.castShadow = true;
    tree.add(foliage);

    group.add(tree);
  }

  createBuilding(group, x, z, w, h, d) {
    const bldg = new THREE.Group();
    bldg.position.set(x, h / 2, z);

    const bldgGeo = new THREE.BoxGeometry(w, h, d);
    const bldgMesh = new THREE.Mesh(bldgGeo, this.sharedMaterials.building);
    bldg.add(bldgMesh);

    // Add randomized illuminated window clusters on the facade facing the highway
    const windowRows = 5;
    const windowCols = 4;
    for (let r = 0; r < windowRows; r++) {
      for (let c = 0; c < windowCols; c++) {
        if (Math.random() > 0.45) {
          const winGeo = new THREE.PlaneGeometry(1.2, 1.8);
          const winMesh = new THREE.Mesh(winGeo, this.sharedMaterials.windowYellow);
          
          // Face towards road
          const isLeft = x < 0;
          winMesh.rotation.y = isLeft ? (Math.PI / 2) : (-Math.PI / 2);
          const winX = isLeft ? (w / 2 + 0.05) : (-w / 2 - 0.05);
          const winY = -h / 2 + 6 + (r * 7);
          const winZ = -d / 2 + 3 + (c * 3.5);

          winMesh.position.set(winX, winY, winZ);
          bldg.add(winMesh);
        }
      }
    }

    group.add(bldg);
  }

  initSegments() {
    for (let i = 0; i < this.numSegments; i++) {
      const segment = this.createSegment(i);
      segment.position.z = i * this.segmentLength;
      this.scene.add(segment);
      this.segments.push(segment);
    }
  }

  update(playerZ) {
    // When a road segment falls well behind the player, move it to the front
    const threshold = playerZ - this.segmentLength * 1.5;

    for (let i = 0; i < this.segments.length; i++) {
      const segment = this.segments[i];
      if (segment.position.z < threshold) {
        // Find furthest segment Z
        let maxZ = -Infinity;
        for (const seg of this.segments) {
          if (seg.position.z > maxZ) maxZ = seg.position.z;
        }

        segment.position.z = maxZ + this.segmentLength;
      }
    }
  }

  reset() {
    for (let i = 0; i < this.segments.length; i++) {
      this.segments[i].position.z = i * this.segmentLength;
    }
  }
}
