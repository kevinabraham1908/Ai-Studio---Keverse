export interface ChaletSpec {
  id: string;
  side: -1 | 1;
  z: number;
  offsetFromLane: number;
  width: number;
  depth: number;
  floors: number;
  plasterColor: number;
  woodColor: number;
  roofColor: number;
  shutterColor: number;
  isBakery?: boolean;
  yawJitter: number;
}

export interface TreeSpec {
  x: number;
  z: number;
  scale: number;
  tintMix: number;
}

export const LANE_HALF_WIDTH = 2.9;
export const VILLAGE_Z_MIN = -44;
export const VILLAGE_Z_MAX = 36;

/**
 * S-curve horizontal centerline of the cobbled Swiss village lane.
 */
export function laneCenterX(z: number): number {
  return Math.sin(z * 0.085) * 3.1 + Math.cos(z * 0.04) * 0.8 - 0.8;
}

/**
 * Derivative dx/dz of the lane centerline for tangent orientation.
 */
export function laneTangentAngle(z: number): number {
  const dxDz =
    Math.cos(z * 0.085) * 3.1 * 0.085 - Math.sin(z * 0.04) * 0.8 * 0.04;
  return Math.atan2(dxDz, 1);
}

/**
 * Smooth terrain elevation across the valley:
 * The cobbled lane gently rises toward the upper Alpine end (-Z),
 * while meadows rise softly away from the lane edges.
 */
export function groundHeightAt(x: number, z: number): number {
  const cx = laneCenterX(z);
  const distFromLane = Math.abs(x - cx);
  // Gentle downhill slope toward +Z (morning sun direction)
  const laneSlope = -z * 0.028;

  if (distFromLane <= LANE_HALF_WIDTH) {
    // Subtle cobblestone crown in the middle of the lane
    const crown = (1 - (distFromLane / LANE_HALF_WIDTH) ** 2) * 0.06;
    return laneSlope + crown;
  }

  const beyond = distFromLane - LANE_HALF_WIDTH;
  // Soft terraced rise for chalet foundations, then steeper Alpine hillside further out
  const meadowRise =
    Math.min(beyond, 6) * 0.04 + Math.max(0, beyond - 6) ** 1.35 * 0.14;
  const rolling =
    Math.sin(x * 0.12 + z * 0.09) * 0.15 * Math.min(1, beyond / 10);

  return laneSlope + meadowRise + rolling;
}

export const CHALET_SPECS: ChaletSpec[] = [
  {
    id: 'bakery',
    side: -1,
    z: 9.5,
    offsetFromLane: 6.4,
    width: 6.8,
    depth: 7.4,
    floors: 2,
    plasterColor: 0xf7e7c4,
    woodColor: 0x7d4c2a,
    roofColor: 0x4b3326,
    shutterColor: 0x4a7357,
    isBakery: true,
    yawJitter: 0.04,
  },
  {
    id: 'chalet-east-1',
    side: 1,
    z: 14.5,
    offsetFromLane: 6.6,
    width: 6.4,
    depth: 6.8,
    floors: 2,
    plasterColor: 0xf5dfb8,
    woodColor: 0x6e4223,
    roofColor: 0x422c21,
    shutterColor: 0x9c4234,
    yawJitter: -0.05,
  },
  {
    id: 'chalet-west-2',
    side: -1,
    z: -1.5,
    offsetFromLane: 6.8,
    width: 7.2,
    depth: 7.0,
    floors: 3,
    plasterColor: 0xf0d7b5,
    woodColor: 0x613a20,
    roofColor: 0x3b281e,
    shutterColor: 0x43677a,
    yawJitter: -0.03,
  },
  {
    id: 'chalet-east-2',
    side: 1,
    z: 2.0,
    offsetFromLane: 6.5,
    width: 6.6,
    depth: 7.2,
    floors: 2,
    plasterColor: 0xf9ebd0,
    woodColor: 0x85522d,
    roofColor: 0x4d3427,
    shutterColor: 0x56784e,
    yawJitter: 0.06,
  },
  {
    id: 'chalet-west-3',
    side: -1,
    z: -14.0,
    offsetFromLane: 7.0,
    width: 7.0,
    depth: 7.4,
    floors: 2,
    plasterColor: 0xf3ddc0,
    woodColor: 0x6d4225,
    roofColor: 0x442f24,
    shutterColor: 0x8c3c31,
    yawJitter: 0.05,
  },
  {
    id: 'chalet-east-3',
    side: 1,
    z: -11.5,
    offsetFromLane: 6.9,
    width: 7.4,
    depth: 7.2,
    floors: 3,
    plasterColor: 0xede0cb,
    woodColor: 0x59341d,
    roofColor: 0x39271e,
    shutterColor: 0x486b58,
    yawJitter: -0.04,
  },
  {
    id: 'chalet-west-4',
    side: -1,
    z: -26.5,
    offsetFromLane: 7.2,
    width: 6.8,
    depth: 6.8,
    floors: 2,
    plasterColor: 0xf7e4c6,
    woodColor: 0x794927,
    roofColor: 0x493226,
    shutterColor: 0x557554,
    yawJitter: -0.05,
  },
  {
    id: 'chalet-east-4',
    side: 1,
    z: -24.5,
    offsetFromLane: 7.1,
    width: 6.8,
    depth: 7.0,
    floors: 2,
    plasterColor: 0xf5e2be,
    woodColor: 0x693e22,
    roofColor: 0x3f2c21,
    shutterColor: 0x48667c,
    yawJitter: 0.04,
  },
];

export function computeChaletPosition(spec: ChaletSpec): {
  x: number;
  y: number;
  z: number;
  rotationY: number;
} {
  const cx = laneCenterX(spec.z);
  const x = cx + spec.side * spec.offsetFromLane;
  const y = groundHeightAt(x, spec.z);
  const tangent = laneTangentAngle(spec.z);
  // Face toward the lane center
  const baseYaw = spec.side === -1 ? Math.PI / 2 : -Math.PI / 2;
  return {
    x,
    y,
    z: spec.z,
    rotationY: baseYaw - tangent + spec.yawJitter,
  };
}

/**
 * Deterministic Alpine pine tree placement around the village perimeter
 * so the scene sits naturally inside a wooded mountain valley.
 */
export function generateTreeSpecs(): TreeSpec[] {
  const specs: TreeSpec[] = [];
  // Simple deterministic LCG PRNG
  let seed = 42197;
  const nextRand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  for (let i = 0; i < 110; i++) {
    const z = -62 + nextRand() * 105;
    const cx = laneCenterX(z);
    const side = i % 2 === 0 ? -1 : 1;
    const dist = 12.8 + nextRand() * 34;
    const x = cx + side * dist;
    const scale = 0.78 + nextRand() * 0.75;
    const tintMix = nextRand();
    specs.push({ x, z, scale, tintMix });
  }

  // Background grove behind the far end of the lane (-Z)
  for (let i = 0; i < 28; i++) {
    const z = -42 - nextRand() * 26;
    const cx = laneCenterX(z);
    const x = cx + (nextRand() - 0.5) * 40;
    if (Math.abs(x - cx) < 5.2 && z > -46) continue;
    specs.push({
      x,
      z,
      scale: 0.85 + nextRand() * 0.8,
      tintMix: nextRand(),
    });
  }

  return specs;
}
