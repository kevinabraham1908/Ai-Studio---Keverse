import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CHALET_SPECS,
  LANE_HALF_WIDTH,
  computeChaletPosition,
  generateTreeSpecs,
  groundHeightAt,
  laneCenterX,
  laneTangentAngle,
} from './villageLayout';

test('laneCenterX produces smooth bounded S-curve without NaN', () => {
  for (let z = -50; z <= 40; z += 2) {
    const x = laneCenterX(z);
    assert.equal(Number.isFinite(x), true);
    assert.ok(Math.abs(x) < 6, `laneCenterX(${z}) = ${x} out of expected bounds`);
  }
});

test('laneTangentAngle matches finite difference slope', () => {
  const z = 5;
  const eps = 0.001;
  const approxSlope = (laneCenterX(z + eps) - laneCenterX(z - eps)) / (2 * eps);
  const expectedAngle = Math.atan2(approxSlope, 1);
  assert.ok(Math.abs(laneTangentAngle(z) - expectedAngle) < 1e-4);
});

test('groundHeightAt rises gently toward Alpine (-Z) and slopes upward outside lane', () => {
  const z = 0;
  const cx = laneCenterX(z);
  const hCenter = groundHeightAt(cx, z);
  const hEdge = groundHeightAt(cx + LANE_HALF_WIDTH, z);
  const hHill = groundHeightAt(cx + LANE_HALF_WIDTH + 12, z);
  assert.ok(hCenter > hEdge, 'lane center should have subtle cobblestone crown');
  assert.ok(hHill > hEdge, 'meadow should rise away from the cobbled lane');
  assert.ok(
    groundHeightAt(laneCenterX(-30), -30) > groundHeightAt(laneCenterX(20), 20),
    'lane should climb gently toward the mountain end',
  );
});

test('all chalets sit outside the cobbled lane and on terrain ground', () => {
  assert.ok(CHALET_SPECS.some((c) => c.isBakery), 'bakery chalet must exist');
  for (const spec of CHALET_SPECS) {
    const pos = computeChaletPosition(spec);
    const distFromCenter = Math.abs(pos.x - laneCenterX(pos.z));
    assert.ok(
      distFromCenter > LANE_HALF_WIDTH + 2.5,
      `chalet ${spec.id} too close to lane`,
    );
    assert.equal(pos.y, groundHeightAt(pos.x, pos.z));
  }
});

test('generateTreeSpecs is deterministic and clears the cobbled lane', () => {
  const a = generateTreeSpecs();
  const b = generateTreeSpecs();
  assert.deepEqual(a, b);
  assert.ok(a.length >= 100);
  for (const t of a) {
    if (t.z > -40 && t.z < 35) {
      assert.ok(
        Math.abs(t.x - laneCenterX(t.z)) > LANE_HALF_WIDTH + 2,
        `tree at (${t.x}, ${t.z}) overlaps cobbled lane`,
      );
    }
  }
});
