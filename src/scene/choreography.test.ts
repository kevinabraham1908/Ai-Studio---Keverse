import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CAMERA_PRESETS,
  didBellClang,
  evaluateBakerShutterState,
  evaluateCameraFrame,
  evaluateFarmerCowState,
  evaluateHoopChaseState,
} from './choreography';
import { groundHeightAt, laneCenterX } from './villageLayout';

test('baker shutter state starts actively opening and stays bounded [0, 1]', () => {
  const s0 = evaluateBakerShutterState(0);
  assert.ok(s0.openAmount > 0.2 && s0.openAmount < 1.0);

  for (let t = 0; t < 20; t += 0.25) {
    const s = evaluateBakerShutterState(t);
    assert.ok(s.openAmount >= 0 && s.openAmount <= 1);
    assert.ok(s.leanAmount >= 0 && s.leanAmount <= 1);
    assert.ok(s.blink >= 0 && s.blink <= 1);
  }
});

test('farmer leads cow along the cobbled lane with finite spacing and bell clang triggers', () => {
  let clangCount = 0;
  let prevPhase = evaluateFarmerCowState(0).bellPhase;

  for (let t = 0.05; t <= 12; t += 0.05) {
    const state = evaluateFarmerCowState(t);
    // Farmer walks ahead of cow (+Z direction toward morning sun)
    assert.ok(state.farmerPos.z > state.cowPos.z);
    const dx = state.farmerPos.x - state.cowPos.x;
    const dz = state.farmerPos.z - state.cowPos.z;
    const dist = Math.hypot(dx, dz);
    assert.ok(dist > 2.0 && dist < 3.5, `unexpected rope distance: ${dist}`);
    assert.equal(
      state.cowPos.y,
      groundHeightAt(state.cowPos.x, state.cowPos.z),
    );
    if (didBellClang(prevPhase, state.bellPhase)) {
      clangCount += 1;
    }
    prevPhase = state.bellPhase;
  }

  assert.ok(clangCount >= 4, `expected multiple bell clangs, got ${clangCount}`);
});

test('children chase wooden hoop along open lane without overlapping terrain', () => {
  for (let t = 0; t < 26; t += 0.5) {
    const hc = evaluateHoopChaseState(t);
    assert.ok(Number.isFinite(hc.hoopPos.x) && Number.isFinite(hc.hoopPos.z));
    assert.ok(Math.abs(hc.hoopPos.x - laneCenterX(hc.hoopPos.z)) < 2.2);
    const boyDist = Math.hypot(
      hc.boyPos.x - hc.hoopPos.x,
      hc.boyPos.z - hc.hoopPos.z,
    );
    const girlDist = Math.hypot(
      hc.girlPos.x - hc.boyPos.x,
      hc.girlPos.z - hc.boyPos.z,
    );
    assert.ok(boyDist > 0.5 && boyDist < 4.5);
    assert.ok(girlDist > 0.4 && girlDist < 4.5);
  }
});

test('all camera presets return finite elevated positions above ground', () => {
  for (const preset of CAMERA_PRESETS) {
    const frame = evaluateCameraFrame(preset.id, 3.5);
    const groundY = groundHeightAt(frame.position.x, frame.position.z);
    assert.ok(
      frame.position.y > groundY + 1.0,
      `camera preset ${preset.id} too close to ground`,
    );
    assert.ok(Number.isFinite(frame.target.x) && Number.isFinite(frame.target.y));
  }
});
