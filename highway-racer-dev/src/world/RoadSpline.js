// Highway Racer 3D - Continuous Parametric Road Spline System
import * as THREE from 'three';

export class RoadSpline {
  constructor() {
    this.points = [];
    this.totalLength = 0;
    this.segmentSpacing = 6.0; // Sample points every 6 meters for high precision
    this.seed = 42;
    this.currentHeading = 0; // Starts facing +Z
    this.currentPos = new THREE.Vector3(0, 0, 0);

    // Median openings (intervals in meters where U-turns between carriageways are allowed)
    // E.g. Opening every 260m, with opening length of 36m
    this.openingPeriod = 260;
    this.openingLength = 38;
  }

  pseudoRandom() {
    this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }

  // Check if median barrier has a designated U-turn crossover opening at arc length s
  isMedianOpen(s) {
    if (s < 60) return false; // First 60m is closed start zone
    const mod = s % this.openingPeriod;
    return mod < this.openingLength;
  }

  // Initialize or extend the spline ahead of the player
  generateInitial(length = 2400) {
    this.points = [];
    this.currentPos.set(0, 0, 0);
    this.currentHeading = 0;
    this.totalLength = 0;
    this.extend(length, 1);
  }

  extend(targetLength, difficultyLevel = 1) {
    const startS = this.totalLength;
    const endS = startS + targetLength;

    if (this.points.length === 0) {
      const tangent = new THREE.Vector3(0, 0, 1);
      const normal = new THREE.Vector3(1, 0, 0);
      this.points.push({
        pos: this.currentPos.clone(),
        tangent,
        normal,
        heading: 0,
        s: 0,
        curvature: 0,
        isMedianOpen: false
      });
    }

    let s = this.totalLength;
    let targetCurvature = 0;
    let curveRemaining = 0;

    // Difficulty scaling: curves get sharper with level
    // Level 1: max curvature 0.003 (radius ~330m)
    // Level 3: max curvature 0.0055 (radius ~180m)
    // Level 5: max curvature 0.008 (radius ~125m)
    const maxCurve = 0.0025 + Math.min(0.005, (difficultyLevel - 1) * 0.001);

    while (s < endS) {
      if (curveRemaining <= 0) {
        const r = this.pseudoRandom();
        if (s < 120) {
          // Keep first 120m completely straight for race start
          targetCurvature = 0;
          curveRemaining = 120;
        } else if (r < 0.35) {
          // Straight stretch
          targetCurvature = 0;
          curveRemaining = 80 + this.pseudoRandom() * 120;
        } else {
          // Curved stretch (left or right)
          const sign = this.pseudoRandom() > 0.5 ? 1 : -1;
          const curveIntensity = 0.4 + this.pseudoRandom() * 0.6;
          targetCurvature = sign * maxCurve * curveIntensity;
          curveRemaining = 100 + this.pseudoRandom() * 160;
        }
      }

      const stepDist = Math.min(this.segmentSpacing, endS - s);
      curveRemaining -= stepDist;

      // Update heading smoothly based on curvature
      this.currentHeading += targetCurvature * stepDist;
      
      // Keep overall highway heading broadly forward (bias back toward Z if turning too extreme)
      if (Math.abs(this.currentHeading) > 0.95) {
        this.currentHeading *= 0.97;
      }

      const step = new THREE.Vector3(
        -Math.sin(this.currentHeading) * stepDist,
        0,
        Math.cos(this.currentHeading) * stepDist
      );
      this.currentPos.add(step);
      s += stepDist;

      const tangent = new THREE.Vector3(
        -Math.sin(this.currentHeading),
        0,
        Math.cos(this.currentHeading)
      ).normalize();

      const normal = new THREE.Vector3(
        Math.cos(this.currentHeading),
        0,
        Math.sin(this.currentHeading)
      ).normalize();

      this.points.push({
        pos: this.currentPos.clone(),
        tangent,
        normal,
        heading: this.currentHeading,
        s,
        curvature: targetCurvature,
        isMedianOpen: this.isMedianOpen(s)
      });
    }

    this.totalLength = s;
  }

  // Get interpolated road frame at arc length s
  getFrameAt(s) {
    if (this.points.length === 0) {
      return {
        pos: new THREE.Vector3(0, 0, s),
        tangent: new THREE.Vector3(0, 0, 1),
        normal: new THREE.Vector3(-1, 0, 0),
        heading: 0,
        s,
        curvature: 0,
        isMedianOpen: false
      };
    }

    if (s <= 0) return this.points[0];
    if (s >= this.totalLength) return this.points[this.points.length - 1];

    const idx = Math.min(this.points.length - 2, Math.max(0, Math.floor(s / this.segmentSpacing)));
    const p0 = this.points[idx];
    const p1 = this.points[idx + 1];
    const span = p1.s - p0.s;
    const t = span > 0.001 ? (s - p0.s) / span : 0;

    const pos = new THREE.Vector3().lerpVectors(p0.pos, p1.pos, t);
    const tangent = new THREE.Vector3().lerpVectors(p0.tangent, p1.tangent, t).normalize();
    const normal = new THREE.Vector3().lerpVectors(p0.normal, p1.normal, t).normalize();
    const heading = THREE.MathUtils.lerp(p0.heading, p1.heading, t);
    const curvature = THREE.MathUtils.lerp(p0.curvature, p1.curvature, t);

    return {
      pos,
      tangent,
      normal,
      heading,
      s,
      curvature,
      isMedianOpen: this.isMedianOpen(s)
    };
  }

  // Convert World Coordinate (x, y, z) into Road Coordinates (s, u)
  // s = distance along road spline, u = signed lateral distance from road centerline
  // u > 0 is Right Carriageway (Forward traffic), u < 0 is Left Carriageway (Wrong-way / oncoming traffic)
  project(worldPos, approxS = 0) {
    if (this.points.length === 0) return { s: worldPos.z, u: worldPos.x, frame: null };

    const searchDist = 70; // Search within +/- 70m of approxS
    const startIdx = Math.max(0, Math.floor((approxS - searchDist) / this.segmentSpacing));
    const endIdx = Math.min(this.points.length - 1, Math.ceil((approxS + searchDist) / this.segmentSpacing));

    let closestDistSq = Infinity;
    let bestIdx = startIdx;

    for (let i = startIdx; i <= endIdx; i++) {
      const dSq = this.points[i].pos.distanceToSquared(worldPos);
      if (dSq < closestDistSq) {
        closestDistSq = dSq;
        bestIdx = i;
      }
    }

    const frame = this.points[bestIdx];
    const delta = new THREE.Vector3().subVectors(worldPos, frame.pos);
    const u = delta.dot(frame.normal);
    const forwardOffset = delta.dot(frame.tangent);
    const s = Math.max(0, frame.s + forwardOffset);

    return { s, u, frame };
  }

  // Convert (s, u) into 3D World Position
  getPointAt(s, u = 0, y = 0) {
    const frame = this.getFrameAt(s);
    return new THREE.Vector3(
      frame.pos.x + frame.normal.x * u,
      frame.pos.y + y,
      frame.pos.z + frame.normal.z * u
    );
  }
}
