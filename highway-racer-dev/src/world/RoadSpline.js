// Highway Racer 3D - Continuous Parametric Road Spline System (Single Wide Highway)
import * as THREE from 'three';

export class RoadSpline {
  constructor() {
    this.points = [];
    this.totalLength = 0;
    this.segmentSpacing = 6.0; // Sample points every 6 meters for high precision
    this.seed = 42;
    this.currentHeading = 0; // Starts facing +Z
    this.currentPos = new THREE.Vector3(0, 0, 0);
  }

  pseudoRandom() {
    this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }

  // Initialize or extend the spline ahead of the player
  generateInitial(length = 3200) {
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
        curvature: 0
      });
    }

    let s = this.totalLength;
    let targetCurvature = 0;
    let curveRemaining = 0;

    // Difficulty scaling: progressive curve intensity
    // Level 1: max curvature 0.0018 (radius ~555m, gentle cruising)
    // Level 2: max curvature 0.0028 (radius ~357m, sweeping curves)
    // Level 3: max curvature 0.0042 (radius ~238m, dynamic S-curves)
    // Level 4: max curvature 0.0055 (radius ~180m, challenging high-speed bends)
    // Level 5+: capped at 0.0065 (radius ~154m, expert racing curves)
    const maxCurve = Math.min(0.0065, 0.0018 + (difficultyLevel - 1) * 0.0011);

    while (s < endS) {
      if (curveRemaining <= 0) {
        const r = this.pseudoRandom();
        if (s < 140) {
          // Keep first 140m completely straight for clean race start
          targetCurvature = 0;
          curveRemaining = 140;
        } else if (r < 0.35) {
          // Straight highway stretch
          targetCurvature = 0;
          curveRemaining = 90 + this.pseudoRandom() * 110;
        } else {
          // Curved stretch (sweeping left or right curve / S-bend)
          const sign = this.pseudoRandom() > 0.5 ? 1 : -1;
          const curveIntensity = 0.45 + this.pseudoRandom() * 0.55;
          targetCurvature = sign * maxCurve * curveIntensity;
          curveRemaining = 110 + this.pseudoRandom() * 140;
        }
      }

      const stepDist = Math.min(this.segmentSpacing, endS - s);
      curveRemaining -= stepDist;

      // Update heading smoothly based on curvature
      this.currentHeading += targetCurvature * stepDist;
      
      // Keep overall highway heading broadly forward (+Z biased)
      if (Math.abs(this.currentHeading) > 0.85) {
        this.currentHeading *= 0.98;
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
        curvature: targetCurvature
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
        normal: new THREE.Vector3(1, 0, 0),
        heading: 0,
        s,
        curvature: 0
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
      curvature
    };
  }

  // Convert World Coordinate (x, y, z) into Road Coordinates (s, u)
  // s = distance along road spline, u = signed lateral distance from road centerline
  // u > 0 is driver's left, u < 0 is driver's right
  project(worldPos, approxS = 0) {
    if (this.points.length === 0) return { s: worldPos.z, u: worldPos.x, frame: null };

    const searchDist = 70;
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
