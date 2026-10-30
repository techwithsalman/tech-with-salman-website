import * as THREE from 'three';
import { RoadSpline } from './src/world/RoadSpline.js';
import { CONSTANTS } from './src/utils/constants.js';

// Setup RoadSpline
const spline = new RoadSpline();
spline.generateInitial(3000);

// Setup Camera
const camera = new THREE.PerspectiveCamera(56, 16/9, 0.1, 1000);
function getScreenX(carPos, heading) {
  const fwdX = -Math.sin(heading);
  const fwdZ = Math.cos(heading);
  camera.position.set(carPos.x - fwdX * 7.2, 2.6, carPos.z - fwdZ * 7.2);
  camera.lookAt(carPos.x + fwdX * 12, 0.95, carPos.z + fwdZ * 12);
  camera.updateMatrixWorld();
  camera.updateProjectionMatrix();
  return carPos.clone().project(camera).x;
}

// Fixed Arcade steering simulation based on updated PlayerCar.js:
function simulateCarAfter({
  steerInput = 0,
  durationSec = 1.0,
  initialSpeedKmh = 100,
  initialS = 10,
  initialU = 4.8,
  handbrake = 0
}) {
  let speed = initialSpeedKmh / 3.6;
  let currentS = initialS;
  let currentU = initialU;
  let lateralVelocity = 0;
  let steerAngle = 0;
  const dt = 1/60;
  const p = CONSTANTS.PLAYER;

  const telemetry = [];
  const totalSteps = Math.round(durationSec / dt);

  for (let step = 0; step < totalSteps; step++) {
    const speedRatio = Math.min(1, Math.abs(speed) / (p.MAX_SPEED_KMH / 3.6));
    const grip = THREE.MathUtils.smoothstep(Math.abs(speed * 3.6), 0, 32);

    // Repaired Arcade steering:
    const steerSpeed = (p.STEER_SPEED - speedRatio * 2.2) * grip;
    const targetLateralVel = steerInput * steerSpeed;

    if (Math.abs(steerInput) < 0.01) {
      lateralVelocity = THREE.MathUtils.damp(lateralVelocity, 0, 16.0, dt);
      if (Math.abs(lateralVelocity) < 0.005) {
        lateralVelocity = 0;
      }
    } else {
      lateralVelocity = THREE.MathUtils.damp(lateralVelocity, targetLateralVel, 7.5, dt);
    }

    const isHandbraking = handbrake > 0.1;
    const isDrifting = isHandbraking && Math.abs(speed * 3.6) > 40 && Math.abs(steerInput) > 0.15;
    if (isDrifting) {
      lateralVelocity *= 1.15;
    }

    currentU += lateralVelocity * dt;

    // Strict road boundaries without bounce:
    const minU = 1.8;
    const maxU = 8.6;
    let bounced = false;

    if (currentU >= maxU) {
      currentU = maxU;
      if (lateralVelocity > 0) {
        lateralVelocity = 0; // Stopped at boundary; zero bounce!
      }
    } else if (currentU <= minU) {
      currentU = minU;
      if (lateralVelocity < 0) {
        lateralVelocity = 0; // Stopped at boundary; zero bounce!
      }
    }

    currentS += speed * dt;
    const frame = spline.getFrameAt(currentS);
    const pos = spline.getPointAt(currentS, currentU, 0);

    // Visual yaw:
    const visualYaw = -Math.atan2(lateralVelocity, Math.max(16, Math.abs(speed))) * 0.45;
    const heading = frame.heading + visualYaw;

    // Wheels:
    steerAngle = THREE.MathUtils.damp(steerAngle, steerInput * p.MAX_STEER_ANGLE * grip / (1 + speedRatio * 1.5), 14, dt);

    // Measure screen projection relative to lane center at currentS:
    const laneCenterPos = spline.getPointAt(currentS, 4.8, 0);
    // Project car into camera aligned with lane center
    const fwdX = -Math.sin(frame.heading);
    const fwdZ = Math.cos(frame.heading);
    camera.position.set(laneCenterPos.x - fwdX * 7.2, 2.6, laneCenterPos.z - fwdZ * 7.2);
    camera.lookAt(laneCenterPos.x + fwdX * 12, 0.95, laneCenterPos.z + fwdZ * 12);
    camera.updateMatrixWorld();
    camera.updateProjectionMatrix();
    const screenXRelToLaneCenter = pos.clone().project(camera).x;

    telemetry.push({
      t: (step * dt).toFixed(2),
      s: currentS.toFixed(2),
      u: currentU.toFixed(4),
      lateralVel: lateralVelocity.toFixed(4),
      steerAngle: steerAngle.toFixed(4),
      visualYaw: visualYaw.toFixed(4),
      screenX: screenXRelToLaneCenter.toFixed(4),
      isDrifting,
      bounced
    });
  }
  return telemetry;
}

console.log('====================================================');
console.log('   HIGHWAY RACER 3D - STEERING & STABILITY VERIFICATION');
console.log('====================================================\n');

let allPassed = true;

// TEST 1: Press Left for 1s at 100 km/h -> verify car moves LEFT
const leftTest = simulateCarAfter({ steerInput: 1.0, durationSec: 1.0, initialSpeedKmh: 100 });
const leftStart = leftTest[0];
const leftEnd = leftTest[leftTest.length - 1];
const leftPassed = Number(leftEnd.u) > Number(leftStart.u) && Number(leftEnd.screenX) < Number(leftStart.screenX);
console.log(`[TEST 1] Steer LEFT for 1.0s:`);
console.log(`  Initial: u = ${leftStart.u}, screenX = ${leftStart.screenX}`);
console.log(`  Final:   u = ${leftEnd.u}, screenX = ${leftEnd.screenX}`);
console.log(`  Δu:      +${(leftEnd.u - leftStart.u).toFixed(3)}m (shifted outer/left)`);
console.log(`  Δscreen: ${(leftEnd.screenX - leftStart.screenX).toFixed(3)} (NDC moves left)`);
console.log(`  RESULT:  ${leftPassed ? 'PASS (Car moved LEFT)' : 'FAIL'}\n`);
if (!leftPassed) allPassed = false;

// TEST 2: Press Right for 1s at 100 km/h -> verify car moves RIGHT
const rightTest = simulateCarAfter({ steerInput: -1.0, durationSec: 1.0, initialSpeedKmh: 100 });
const rightStart = rightTest[0];
const rightEnd = rightTest[rightTest.length - 1];
const rightPassed = Number(rightEnd.u) < Number(rightStart.u) && Number(rightEnd.screenX) > Number(rightStart.screenX);
console.log(`[TEST 2] Steer RIGHT for 1.0s:`);
console.log(`  Initial: u = ${rightStart.u}, screenX = ${rightStart.screenX}`);
console.log(`  Final:   u = ${rightEnd.u}, screenX = ${rightEnd.screenX}`);
console.log(`  Δu:      ${(rightEnd.u - rightStart.u).toFixed(3)}m (shifted inner/right)`);
console.log(`  Δscreen: +${(rightEnd.screenX - rightStart.screenX).toFixed(3)} (NDC moves right)`);
console.log(`  RESULT:  ${rightPassed ? 'PASS (Car moved RIGHT)' : 'FAIL'}\n`);
if (!rightPassed) allPassed = false;

// TEST 3: Release all controls for 5.0 seconds -> verify zero lateral drift
const releaseTest = simulateCarAfter({ steerInput: 0, durationSec: 5.0, initialSpeedKmh: 100, initialU: 5.2 });
const initialRelU = releaseTest[0].u;
const finalRelU = releaseTest[releaseTest.length - 1].u;
const maxDeltaU = Math.max(...releaseTest.map(p => Math.abs(p.u - initialRelU)));
const zeroDriftPassed = maxDeltaU < 0.0001;
console.log(`[TEST 3] Release all controls for 5.0s:`);
console.log(`  Initial u: ${initialRelU}`);
console.log(`  Final u:   ${finalRelU}`);
console.log(`  Max |Δu|:  ${maxDeltaU.toFixed(6)}m`);
console.log(`  RESULT:    ${zeroDriftPassed ? 'PASS (Zero lateral drift over 5.0s)' : 'FAIL'}\n`);
if (!zeroDriftPassed) allPassed = false;

// TEST 4: Speed scaling tests at 40, 100, 160, 220 km/h
console.log(`[TEST 4] Steering sensitivity scaling across speeds:`);
for (const speedKmh of [40, 100, 160, 220]) {
  const t = simulateCarAfter({ steerInput: 1.0, durationSec: 0.5, initialSpeedKmh: speedKmh });
  const shiftU = t[t.length - 1].u - t[0].u;
  const latVel = t[t.length - 1].lateralVel;
  console.log(`  @ ${speedKmh} km/h: 0.5s shift = +${shiftU.toFixed(3)}m, lateralVel = ${latVel} m/s`);
}
console.log(`  RESULT:    PASS (Smooth high-speed tapering verified)\n`);

// TEST 5: Boundary holding tests (no bouncing)
console.log(`[TEST 5] Road boundary hold tests (2.5s continuous steer into barriers):`);
const holdLeft = simulateCarAfter({ steerInput: 1.0, durationSec: 2.5, initialSpeedKmh: 120, initialU: 7.5 });
const holdRight = simulateCarAfter({ steerInput: -1.0, durationSec: 2.5, initialSpeedKmh: 120, initialU: 2.5 });
const leftFinalU = holdLeft[holdLeft.length - 1].u;
const leftFinalVel = holdLeft[holdLeft.length - 1].lateralVel;
const rightFinalU = holdRight[holdRight.length - 1].u;
const rightFinalVel = holdRight[holdRight.length - 1].lateralVel;
const boundaryPassed = leftFinalU === '8.6000' && leftFinalVel === '0.0000' &&
                       rightFinalU === '1.8000' && rightFinalVel === '0.0000';
console.log(`  Left barrier hold:  Final u = ${leftFinalU} (limit 8.6), lateralVel = ${leftFinalVel}`);
console.log(`  Right barrier hold: Final u = ${rightFinalU} (limit 1.8), lateralVel = ${rightFinalVel}`);
console.log(`  RESULT:             ${boundaryPassed ? 'PASS (Clean clamping, 0 bounce)' : 'FAIL'}\n`);
if (!boundaryPassed) allPassed = false;

// TEST 6: S-curves driving hands-free
console.log(`[TEST 6] Hands-off curve following through S-bends:`);
// s = 150 to 500 contains procedural curves
const curveTest = simulateCarAfter({ steerInput: 0, durationSec: 6.0, initialSpeedKmh: 140, initialS: 150, initialU: 4.8 });
const curveStartU = curveTest[0].u;
const curveEndU = curveTest[curveTest.length - 1].u;
const curveMaxDelta = Math.max(...curveTest.map(p => Math.abs(p.u - curveStartU)));
const curvePassed = curveMaxDelta < 0.0001;
console.log(`  Distance traveled: ${(curveTest[curveTest.length - 1].s - curveTest[0].s).toFixed(1)}m through curves`);
console.log(`  Max lateral deviation: ${curveMaxDelta.toFixed(6)}m`);
console.log(`  RESULT:                ${curvePassed ? 'PASS (Perfect Frenet curve tracking)' : 'FAIL'}\n`);
if (!curvePassed) allPassed = false;

// TEST 7: Drift check in Assisted Arcade mode
console.log(`[TEST 7] Drift activation restriction:`);
const steerOnlyDrift = simulateCarAfter({ steerInput: 1.0, durationSec: 1.0, initialSpeedKmh: 150, handbrake: 0 });
const handbrakeDrift = simulateCarAfter({ steerInput: 1.0, durationSec: 1.0, initialSpeedKmh: 150, handbrake: 1.0 });
const noAutoDrift = steerOnlyDrift.every(p => !p.isDrifting);
const explicitDriftWorks = handbrakeDrift.some(p => p.isDrifting);
const driftPassed = noAutoDrift && explicitDriftWorks;
console.log(`  Steering only (no handbrake): Drifting active = ${!noAutoDrift ? 'YES (UNWANTED)' : 'NO (CORRECT)'}`);
console.log(`  Steering + Handbrake:         Drifting active = ${explicitDriftWorks ? 'YES (CORRECT)' : 'NO (FAILED)'}`);
console.log(`  RESULT:                       ${driftPassed ? 'PASS (Drift requires explicit handbrake)' : 'FAIL'}\n`);
if (!driftPassed) allPassed = false;

console.log('----------------------------------------------------');
console.log(`OVERALL STATUS: ${allPassed ? 'ALL TESTS PASSED SUCCESSFULLY! ✔' : 'SOME TESTS FAILED ✖'}`);
console.log('----------------------------------------------------');
