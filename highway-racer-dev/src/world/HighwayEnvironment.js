import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CONSTANTS } from '../utils/constants.js';
import { RoadSpline } from './RoadSpline.js';

function random(seed) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}

function canvasTexture(width, height, draw) {
  const c = document.createElement('canvas'); c.width = width; c.height = height;
  draw(c.getContext('2d'), width, height);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8; return t;
}

export class HighwayEnvironment {
  constructor(scene, assets, spline = null) {
    this.scene = scene;
    this.assets = assets;
    this.spline = spline || new RoadSpline();
    if (this.spline.points.length === 0) {
      this.spline.generateInitial(3200);
    }

    this.segmentLength = CONSTANTS.SEGMENT_LENGTH || 120; // 120 meters per segment
    this.numSegments = CONSTANTS.VISIBLE_SEGMENTS || 8; // 8 visible segments = 960m continuous view
    this.materials = this.makeMaterials();
    this.treeParts = this.extractParts(assets.pines);
    this.shrubParts = this.extractParts(assets.shrub);

    this.segments = [];
    this.segmentIndices = []; // Stores the spline segment index for each group

    for (let i = 0; i < this.numSegments; i++) {
      const segGroup = this.createCurvedSegment(i);
      this.scene.add(segGroup);
      this.segments.push(segGroup);
      this.segmentIndices.push(i);
    }
  }

  makeMaterials() {
    const a = this.assets;
    const noise = canvasTexture(256, 256, (ctx, w, h) => {
      const r = random(52);
      ctx.fillStyle = '#717854'; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 26000; i++) {
        ctx.fillStyle = ['#626d45', '#858563', '#505f3c', '#969274'][Math.floor(r() * 4)];
        ctx.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 4);
      }
    });
    noise.wrapS = noise.wrapT = THREE.RepeatWrapping; noise.repeat.set(35, 18);

    const paint = canvasTexture(128, 512, (ctx, w, h) => {
      ctx.fillStyle = '#e2e0d3'; ctx.fillRect(0, 0, w, h);
      const r = random(100);
      for (let i = 0; i < 2000; i++) {
        ctx.fillStyle = 'rgba(60,57,50,0.14)'; ctx.fillRect(r() * w, r() * h, r() * 4, 1 + r() * 3);
      }
    });

    const m = {
      asphalt: new THREE.MeshStandardMaterial({
        map: a.asphalt, normalMap: a.normal, roughnessMap: a.roughness,
        normalScale: new THREE.Vector2(0.42, 0.42), color: 0x919598, roughness: 0.9
      }),
      shoulder: new THREE.MeshStandardMaterial({
        map: a.asphalt, normalMap: a.normal, color: 0x7f8283, roughness: 0.94
      }),
      grass: new THREE.MeshStandardMaterial({ map: noise, roughness: 1 }),
      white: new THREE.MeshStandardMaterial({ map: paint, color: 0xffffff, roughness: 0.9 }),
      yellow: new THREE.MeshStandardMaterial({ map: paint, color: 0xf2c84a, roughness: 0.9 }),
      concrete: new THREE.MeshStandardMaterial({ color: 0xbbbcb4, roughness: 0.95 }),
      steel: new THREE.MeshStandardMaterial({ color: 0x8d979d, metalness: 0.8, roughness: 0.42 }),
      dark: new THREE.MeshStandardMaterial({ color: 0x3c454b, metalness: 0.65, roughness: 0.6 }),
      lamp: new THREE.MeshStandardMaterial({ color: 0xe7ebea, emissive: 0xd9e6e3, emissiveIntensity: 0.3 }),
      red: new THREE.MeshStandardMaterial({ color: 0xe04c2e, roughness: 0.45 }),
      glass: new THREE.MeshStandardMaterial({ color: 0x58737d, metalness: 0.7, roughness: 0.25 }),
      stone: new THREE.MeshStandardMaterial({ color: 0xa2a7a1, roughness: 0.85 })
    };

    m.facades = Array.from({ length: 4 }, (_, i) => {
      const map = canvasTexture(512, 1024, (ctx, w, h) => {
        const r = random(150 + i), backgrounds = ['#a4aaa8', '#a68165', '#c3bfb1', '#626c70'];
        ctx.fillStyle = backgrounds[i]; ctx.fillRect(0, 0, w, h);
        if (i === 1) {
          ctx.strokeStyle = '#786a5d'; ctx.lineWidth = 1;
          for (let y = 0; y < h; y += 10) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
            for (let x = (y % 20 ? 15 : 0); x < w; x += 30) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 10); ctx.stroke(); }
          }
        }
        for (let y = 0; y < 20; y++) for (let x = 0; x < 8; x++) {
          const px = x * 64, py = y * 51.2;
          const inset = i === 1 ? 15 : i === 2 ? 12 : 5;
          const span = 64 - inset * 2;
          ctx.fillStyle = '#414c51'; ctx.fillRect(px + inset, py + 5, span, 41);
          const grad = ctx.createLinearGradient(px, py, px + 50, py + 40);
          grad.addColorStop(0, r() > .8 ? '#b2aa8d' : '#6a8b99');
          grad.addColorStop(.6, '#3e525b'); grad.addColorStop(1, '#809ba4');
          ctx.fillStyle = grad; ctx.fillRect(px + inset + 3, py + 7, span - 6, 36);
          ctx.fillStyle = '#919c9f'; ctx.fillRect(px + 30, py + 7, 2, 36);
          if (r() > .65) { ctx.fillStyle = 'rgba(208,201,171,.45)'; ctx.fillRect(px + inset + 3, py + 7, span - 6, 12 + r() * 15); }
          ctx.fillStyle = '#d0cec4'; ctx.fillRect(px + inset - 1, py + 44, span + 2, 3);
          ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(px, py + 48, 64, 3);
        }
      });
      map.wrapS = map.wrapT = THREE.RepeatWrapping;
      const material = new THREE.MeshStandardMaterial({
        map, roughness: i === 1 || i === 2 ? 0.82 : 0.48, metalness: i === 1 || i === 2 ? 0.05 : 0.28
      });
      material.userData.facade = true;
      return material;
    });

    return m;
  }

  extractParts(source) {
    return source.children.map(root => {
      root.updateWorldMatrix(true, true);
      const box = new THREE.Box3().setFromObject(root);
      const height = box.max.y - box.min.y;
      const scale = 1 / height;
      const parts = [];
      root.traverse(mesh => {
        if (!mesh.isMesh) return;
        const g = mesh.geometry.clone();
        for (const name of ['position', 'normal']) {
          const a = g.getAttribute(name);
          if (!a) continue;
          const expanded = new Float32Array(a.count * 3);
          for (let i = 0; i < a.count; i++) expanded.set([a.getX(i), a.getY(i), a.getZ(i)], i * 3);
          g.setAttribute(name, new THREE.Float32BufferAttribute(expanded, 3));
        }
        g.applyMatrix4(mesh.matrixWorld);
        g.scale(scale, scale, scale);
        const mat = mesh.material.clone();
        mat.side = THREE.DoubleSide; mat.alphaTest = 0.45; mat.transparent = false;
        if (mat.normalScale) mat.normalScale.setScalar(0.6);
        parts.push({ geometry: g, material: mat });
      });
      return parts;
    });
  }

  // Create curved road ribbon geometry along spline between startS and endS
  createRibbonGeometry(startS, endS, crossProfile, steps = 24) {
    const geom = new THREE.BufferGeometry();
    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];

    const numU = crossProfile.length;

    for (let i = 0; i <= steps; i++) {
      const s = startS + (i / steps) * (endS - startS);
      const frame = this.spline.getFrameAt(s);

      for (let j = 0; j < numU; j++) {
        const { u, y, uvU } = crossProfile[j];
        const x = frame.pos.x + frame.normal.x * u;
        const posY = frame.pos.y + y;
        const z = frame.pos.z + frame.normal.z * u;

        positions.push(x, posY, z);
        normals.push(0, 1, 0);
        uvs.push(uvU, s / 12);
      }
    }

    for (let i = 0; i < steps; i++) {
      for (let j = 0; j < numU - 1; j++) {
        const row1 = i * numU;
        const row2 = (i + 1) * numU;
        const a = row1 + j;
        const b = row1 + j + 1;
        const c = row2 + j;
        const d = row2 + j + 1;

        indices.push(a, c, b);
        indices.push(b, c, d);
      }
    }

    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geom.setIndex(indices);
    geom.computeVertexNormals();

    return geom;
  }

  createCurvedSegment(segIndex) {
    const group = new THREE.Group();
    const batches = new Map();
    const r = random(segIndex * 991 + 4);
    const m = this.materials;
    const startS = segIndex * this.segmentLength;
    const endS = startS + this.segmentLength;

    group.userData.startS = startS;
    group.userData.endS = endS;
    group.userData.segIndex = segIndex;

    const add = (geometry, material) => {
      const g = geometry.index ? geometry.toNonIndexed() : geometry.clone();
      for (const name of Object.keys(g.attributes)) {
        if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
      }
      if (!batches.has(material)) batches.set(material, []);
      batches.get(material).push(g);
      geometry.dispose();
    };

    // 1. Terrain Grass Ribbon (Extends 380m wide across the curve)
    const grassProfile = [
      { u: -190, y: -0.07, uvU: 0 },
      { u: 190, y: -0.07, uvU: 10 }
    ];
    add(this.createRibbonGeometry(startS, endS, grassProfile, 20), m.grass);

    // 2. Dual Carriageway Asphalt Road Surface (|u| <= 10.2m)
    const asphaltProfile = [
      { u: -10.2, y: 0.005, uvU: 0 },
      { u: 10.2, y: 0.005, uvU: 2.8 }
    ];
    add(this.createRibbonGeometry(startS, endS, asphaltProfile, 24), m.asphalt);

    // 3. Paved Shoulders
    const shoulderLeft = [
      { u: -10.2, y: 0.008, uvU: 0 },
      { u: -8.0, y: 0.008, uvU: 0.4 }
    ];
    const shoulderRight = [
      { u: 8.0, y: 0.008, uvU: 0 },
      { u: 10.2, y: 0.008, uvU: 0.4 }
    ];
    add(this.createRibbonGeometry(startS, endS, shoulderLeft, 20), m.shoulder);
    add(this.createRibbonGeometry(startS, endS, shoulderRight, 20), m.shoulder);

    // 4. Road Markings along the curve:
    // Outer Solid lines (Yellow left at u = -8.0, White right at u = +8.0)
    const lineYellowLeft = [
      { u: -8.08, y: 0.015, uvU: 0 },
      { u: -7.92, y: 0.015, uvU: 1 }
    ];
    const lineWhiteRight = [
      { u: 7.92, y: 0.015, uvU: 0 },
      { u: 8.08, y: 0.015, uvU: 1 }
    ];
    add(this.createRibbonGeometry(startS, endS, lineYellowLeft, 20), m.yellow);
    add(this.createRibbonGeometry(startS, endS, lineWhiteRight, 20), m.white);

    // Broken Lane Dividers (Dashes every 15m)
    for (let s = startS; s < endS; s += 15) {
      for (const u of [-4.6, 4.6]) {
        const dashGeom = this.createRibbonGeometry(s, Math.min(endS, s + 6.0), [
          { u: u - 0.08, y: 0.016, uvU: 0 },
          { u: u + 0.08, y: 0.016, uvU: 1 }
        ], 3);
        add(dashGeom, m.white);
      }
    }

    // 5. Center Median Barrier or Crossover
    // If median is open at this stretch, add diagonal crossover lines and NO solid barrier!
    // If median is closed, add solid concrete barrier down the center (u = 0).
    const midFrame = this.spline.getFrameAt((startS + endS) / 2);
    const medianIsOpen = midFrame.isMedianOpen;

    if (!medianIsOpen) {
      // Solid Concrete Jersey Barrier along center median
      const barrierSteps = 24;
      for (let i = 0; i < barrierSteps; i++) {
        const s = startS + (i / barrierSteps) * (endS - startS);
        const f = this.spline.getFrameAt(s);
        const nextF = this.spline.getFrameAt(s + (endS - startS) / barrierSteps);

        const dDist = f.pos.distanceTo(nextF.pos);
        const bGeom = new THREE.BoxGeometry(0.5, 0.82, dDist);
        bGeom.translate(f.pos.x, 0.41, f.pos.z);
        bGeom.rotateY(f.heading);
        add(bGeom, m.concrete);
      }
    } else {
      // Crossover dashed yellow hazard markings across median opening
      for (let s = startS; s < endS; s += 8) {
        const crossGeom = this.createRibbonGeometry(s, Math.min(endS, s + 3.5), [
          { u: -1.2, y: 0.016, uvU: 0 },
          { u: 1.2, y: 0.016, uvU: 1 }
        ], 3);
        add(crossGeom, m.yellow);
      }
    }

    // 6. Outer Steel Guardrails along curve (u = -10.42m and u = +10.42m)
    for (const side of [-1, 1]) {
      const uRail = side * 10.42;
      const railProfile = [
        { u: uRail - 0.05, y: 0.65, uvU: 0 },
        { u: uRail + 0.05, y: 0.65, uvU: 1 }
      ];
      add(this.createRibbonGeometry(startS, endS, railProfile, 24), m.steel);

      // Posts & reflectors every 4m along the curve
      for (let s = startS + 2; s < endS; s += 4) {
        const f = this.spline.getFrameAt(s);
        const postPos = this.spline.getPointAt(s, side * 10.5, 0.45);
        const postGeom = new THREE.BoxGeometry(0.12, 0.9, 0.12);
        postGeom.translate(postPos.x, postPos.y, postPos.z);
        postGeom.rotateY(f.heading);
        add(postGeom, m.dark);

        const refPos = this.spline.getPointAt(s, side * 10.35, 0.9);
        const refGeom = new THREE.BoxGeometry(0.08, 0.12, 0.16);
        refGeom.translate(refPos.x, refPos.y, refPos.z);
        refGeom.rotateY(f.heading);
        add(refGeom, m.red);
      }

      // Streetlights every 60m along curve
      for (let s = startS + 20; s < endS; s += 60) {
        const f = this.spline.getFrameAt(s);
        const polePos = this.spline.getPointAt(s, side * 11.5, 4.5);
        const poleGeom = new THREE.CylinderGeometry(0.08, 0.08, 9, 8);
        poleGeom.translate(polePos.x, polePos.y, polePos.z);
        poleGeom.rotateY(f.heading);
        add(poleGeom, m.steel);

        const armPos = this.spline.getPointAt(s, side * 10.2, 8.95);
        const armGeom = new THREE.BoxGeometry(2.6, 0.1, 0.12);
        armGeom.translate(armPos.x, armPos.y, armPos.z);
        armGeom.rotateY(f.heading);
        add(armGeom, m.steel);

        const lampPos = this.spline.getPointAt(s, side * 9.0, 8.85);
        const lampGeom = new THREE.BoxGeometry(0.7, 0.05, 0.24);
        lampGeom.translate(lampPos.x, lampPos.y, lampPos.z);
        lampGeom.rotateY(f.heading);
        add(lampGeom, m.lamp);
      }
    }

    // 7. Buildings along curved roadside
    for (const side of [-1, 1]) {
      for (let j = 0; j < 3; j++) {
        const s = startS + 15 + j * 38 + r() * 10;
        const u = side * (38 + r() * 40);
        const w = 12 + r() * 12, d = 12 + r() * 12, h = 16 + r() * 45;
        const f = this.spline.getFrameAt(s);
        const bPos = this.spline.getPointAt(s, u, h / 2);
        const facade = m.facades[(segIndex + j + (side > 0 ? 2 : 0)) % 4];

        const bldGeom = new THREE.BoxGeometry(w, h, d);
        bldGeom.translate(bPos.x, bPos.y, bPos.z);
        bldGeom.rotateY(f.heading);
        add(bldGeom, facade);

        // Ground stone podium
        const podPos = this.spline.getPointAt(s, u, 1.5);
        const podGeom = new THREE.BoxGeometry(w + 2, 3, d + 2);
        podGeom.translate(podPos.x, podPos.y, podPos.z);
        podGeom.rotateY(f.heading);
        add(podGeom, m.stone);
      }
    }

    // 8. Overhead Gantry Sign (every 3 segments)
    if (segIndex % 3 === 1) {
      const gantryS = startS + 45;
      const f = this.spline.getFrameAt(gantryS);
      for (const side of [-1, 1]) {
        const pPos = this.spline.getPointAt(gantryS, side * 10.6, 3.8);
        const postGeom = new THREE.CylinderGeometry(0.15, 0.15, 7.6, 8);
        postGeom.translate(pPos.x, pPos.y, pPos.z);
        postGeom.rotateY(f.heading);
        add(postGeom, m.steel);
      }

      const beamPos = this.spline.getPointAt(gantryS, 0, 7.5);
      const beamGeom = new THREE.BoxGeometry(21.5, 0.24, 0.24);
      beamGeom.translate(beamPos.x, beamPos.y, beamPos.z);
      beamGeom.rotateY(f.heading);
      add(beamGeom, m.steel);

      const signPos = this.spline.getPointAt(gantryS, 0, 6.2);
      const signText = canvasTexture(1024, 256, (ctx, w, h) => {
        ctx.fillStyle = '#175943'; ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = '#e4e9dc'; ctx.lineWidth = 5; ctx.strokeRect(10, 10, w - 20, h - 20);
        ctx.fillStyle = '#eff3e5'; ctx.font = 'bold 27px Arial'; ctx.fillText('M-2   /   NORTHBOUND', 35, 54);
        ctx.font = 'bold 55px Arial'; ctx.fillText(segIndex % 2 ? 'Islamabad' : 'City Centre', 35, 125);
        ctx.font = '26px Arial'; ctx.fillText('THROUGH LANES', 35, 176); ctx.fillText('2 km', 880, 54);
        ctx.font = '66px Arial'; ctx.fillText('↓       ↓       ↓', 420, 218);
      });
      const signMesh = new THREE.Mesh(new THREE.PlaneGeometry(13, 3.1), new THREE.MeshStandardMaterial({ map: signText, roughness: 0.75 }));
      signMesh.position.set(signPos.x, signPos.y, signPos.z);
      signMesh.rotation.y = f.heading + Math.PI;
      group.add(signMesh);
    }

    // Batch static geometry by material into merged draw calls
    for (const [material, geometries] of batches) {
      const merged = mergeGeometries(geometries, false);
      if (merged) {
        const mesh = new THREE.Mesh(merged, material);
        mesh.receiveShadow = true;
        mesh.castShadow = ![m.grass, m.asphalt, m.shoulder, m.white, m.yellow].includes(material);
        mesh.userData.shadowCaster = mesh.castShadow;
        group.add(mesh);
        geometries.forEach(g => g.dispose());
      }
    }

    // Instanced Trees & Shrubs along the curve
    const placements = this.treeParts.map(() => []);
    const shrubs = [];
    for (const side of [-1, 1]) {
      for (let j = 0; j < 4; j++) {
        const s = startS + 12 + j * 26 + r() * 8;
        const u = side * (14 + r() * 12);
        const f = this.spline.getFrameAt(s);
        const pt = this.spline.getPointAt(s, u, 0);
        placements[j % placements.length].push({
          x: pt.x, z: pt.z, height: 5 + r() * 5, rotation: f.heading + r() * 0.5
        });
      }
      for (let j = 0; j < 5; j++) {
        const s = startS + 8 + j * 22 + r() * 6;
        const u = side * (12 + r() * 5);
        const f = this.spline.getFrameAt(s);
        const pt = this.spline.getPointAt(s, u, 0);
        shrubs.push({
          x: pt.x, z: pt.z, height: 0.7 + r() * 0.7, rotation: f.heading + r() * 0.5
        });
      }
    }

    const instanceParts = (parts, places) => {
      for (const part of parts) {
        const mesh = new THREE.InstancedMesh(part.geometry, part.material, places.length);
        const dummy = new THREE.Object3D();
        places.forEach((p, i) => {
          dummy.position.set(p.x, 0, p.z);
          dummy.rotation.y = p.rotation;
          dummy.scale.setScalar(p.height);
          dummy.updateMatrix();
          mesh.setMatrixAt(i, dummy.matrix);
        });
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData.foliage = true;
        mesh.userData.shadowCaster = true;
        mesh.computeBoundingSphere();
        group.add(mesh);
      }
    };

    placements.forEach((places, i) => instanceParts(this.treeParts[i], places));
    instanceParts(this.shrubParts[0], shrubs);

    return group;
  }

  // Update visible segments according to player's current arc length s
  update(playerS = 0, difficultyLevel = 1) {
    const behindDistance = this.segmentLength * 1.5;
    const aheadDistance = this.segmentLength * (this.numSegments - 1.5);

    // Check if spline needs to be extended
    if (playerS + aheadDistance + 800 > this.spline.totalLength) {
      this.spline.extend(1800, difficultyLevel);
    }

    for (let i = 0; i < this.segments.length; i++) {
      const seg = this.segments[i];
      // If segment is too far behind player
      if (seg.userData.endS < playerS - behindDistance) {
        // Find highest existing segment index
        const maxIdx = Math.max(...this.segments.map(s => s.userData.segIndex));
        const newIdx = maxIdx + 1;
        this.scene.remove(seg);
        seg.children.forEach(c => {
          if (c.geometry) c.geometry.dispose();
        });

        const newSeg = this.createCurvedSegment(newIdx);
        this.scene.add(newSeg);
        this.segments[i] = newSeg;
      }
    }

    // Shadow distance optimization
    for (const seg of this.segments) {
      const dist = Math.abs(seg.userData.startS - playerS);
      for (const mesh of seg.children) {
        if (mesh.userData.foliage) mesh.visible = dist < 420;
        if (mesh.userData.shadowCaster) mesh.castShadow = dist < 120;
      }
    }
  }

  reset() {
    for (const seg of this.segments) {
      this.scene.remove(seg);
      seg.children.forEach(c => {
        if (c.geometry) c.geometry.dispose();
      });
    }
    this.segments = [];
    this.segmentIndices = [];
    this.spline.generateInitial(3200);

    for (let i = 0; i < this.numSegments; i++) {
      const segGroup = this.createCurvedSegment(i);
      this.scene.add(segGroup);
      this.segments.push(segGroup);
      this.segmentIndices.push(i);
    }
  }
}
