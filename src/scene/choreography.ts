import { groundHeightAt, laneCenterX, laneTangentAngle } from './villageLayout';

export type CameraPresetId =
  | 'glide'
  | 'baker'
  | 'farmer'
  | 'children'
  | 'orbit';

export interface CameraPresetInfo {
  id: CameraPresetId;
  label: string;
  caption: string;
}

export const CAMERA_PRESETS: CameraPresetInfo[] = [
  {
    id: 'glide',
    label: 'Village Glide',
    caption: 'Floating morning camera gliding down the cobbled lane',
  },
  {
    id: 'baker',
    label: "Baker's Shutters",
    caption: 'Early sun warms the timber shutters swinging open',
  },
  {
    id: 'farmer',
    label: 'Farmer & Cow',
    caption: 'Slow stroll along the cobblestones with brass cowbell',
  },
  {
    id: 'children',
    label: 'Hoop Chase',
    caption: 'Children chasing a rolling oak hoop through sunbeams',
  },
  {
    id: 'orbit',
    label: 'Free Orbit',
    caption: 'Drag to explore the Swiss Alpine village freely',
  },
];

export interface Vec3Tuple {
  x: number;
  y: number;
  z: number;
}

export interface CameraFrame {
  position: Vec3Tuple;
  target: Vec3Tuple;
}

export interface BakerShutterState {
  /** 0 = closed, 1 = wide open */
  openAmount: number;
  /** Baker leaning out amount 0..1 */
  leanAmount: number;
  /** Gentle head look yaw in radians */
  headYaw: number;
  /** Eye blink factor 0..1 (1 = closed) */
  blink: number;
}

export interface FarmerCowState {
  farmerPos: Vec3Tuple;
  farmerYaw: number;
  farmerStridePhase: number;
  cowPos: Vec3Tuple;
  cowYaw: number;
  cowStridePhase: number;
  bellAngle: number;
  bellPhase: number;
  tailSwing: number;
  headNod: number;
}

export interface HoopChaseState {
  hoopPos: Vec3Tuple;
  hoopYaw: number;
  hoopRollAngle: number;
  hoopWobble: number;
  boyPos: Vec3Tuple;
  boyYaw: number;
  boyStridePhase: number;
  girlPos: Vec3Tuple;
  girlYaw: number;
  girlStridePhase: number;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function smootherstep(t: number): number {
  const x = clamp01(t);
  return x * x * x * (x * (x * 6 - 15) + 10);
}

/**
 * Evaluates the baker's slow-motion shutter-opening story loop (16s cycle).
 * Starts partway into opening so initial frames immediately show the baker in action.
 */
export function evaluateBakerShutterState(simTime: number): BakerShutterState {
  const cycle = 16.0;
  // Offset by 2.2s so at t=0 the shutters are actively opening in morning light
  const phase = ((simTime + 2.2) % cycle + cycle) % cycle;

  let openAmount = 1;
  if (phase < 4.5) {
    openAmount = smootherstep(phase / 4.5);
  } else if (phase < 11.5) {
    openAmount = 1;
  } else if (phase < 14.5) {
    openAmount = 1 - smootherstep((phase - 11.5) / 3.0);
  } else {
    openAmount = 0;
  }

  // Baker leans slightly forward once shutters pass 45% open
  const leanAmount =
    phase < 11.0
      ? smootherstep((openAmount - 0.35) / 0.65)
      : smootherstep((14.0 - phase) / 3.0) * 0.4;

  const headYaw = Math.sin(simTime * 0.75) * 0.24 * leanAmount;

  // Natural slow blink every ~4.2 seconds
  const blinkCycle = (simTime % 4.2 + 4.2) % 4.2;
  const blink =
    blinkCycle > 3.95 ? Math.sin(((blinkCycle - 3.95) / 0.25) * Math.PI) : 0;

  return {
    openAmount,
    leanAmount,
    headYaw,
    blink,
  };
}

/**
 * Evaluates the farmer leading the brown cow slowly along the cobbled lane toward +Z
 * so their expressive faces, horns, rope lead, and swinging brass cowbell face the morning sun & camera.
 */
export function evaluateFarmerCowState(simTime: number): FarmerCowState {
  const travelSpan = 34;
  const speed = 0.55;
  const progress = ((simTime * speed + 14.0) % travelSpan + travelSpan) % travelSpan;
  const farmerZ = -18.0 + progress;
  const cowZ = farmerZ - 2.55; // Cow follows ~2.55m behind farmer on the lead rope

  const farmerX = laneCenterX(farmerZ) + 1.1;
  const cowX = laneCenterX(cowZ) + 0.95;

  const farmerY = groundHeightAt(farmerX, farmerZ);
  const cowY = groundHeightAt(cowX, cowZ);

  const farmerYaw = laneTangentAngle(farmerZ);
  const cowYaw = laneTangentAngle(cowZ);

  const strideRate = 2.4;
  const farmerStridePhase = simTime * strideRate;
  const cowStridePhase = simTime * strideRate * 0.92 + 0.6;

  // Cowbell swings pendulum-like in sync with the cow's shoulder sway
  const bellPhase = cowStridePhase;
  const bellAngle = Math.sin(bellPhase) * 0.36;
  const tailSwing = Math.sin(simTime * 1.9) * 0.28;
  const headNod = Math.sin(cowStridePhase * 0.5) * 0.08;

  return {
    farmerPos: { x: farmerX, y: farmerY, z: farmerZ },
    farmerYaw,
    farmerStridePhase,
    cowPos: { x: cowX, y: cowY, z: cowZ },
    cowYaw,
    cowStridePhase,
    bellAngle,
    bellPhase,
    tailSwing,
    headNod,
  };
}

/**
 * Returns true when the cowbell pendulum crosses an extrema peak (clang moment).
 */
export function didBellClang(prevPhase: number, nextPhase: number): boolean {
  const prevHalf = Math.floor((prevPhase + Math.PI * 0.5) / Math.PI);
  const nextHalf = Math.floor((nextPhase + Math.PI * 0.5) / Math.PI);
  return nextHalf > prevHalf;
}

/**
 * Evaluates two children chasing a rolling wooden hoop along the left-center village lane.
 */
export function evaluateHoopChaseState(simTime: number): HoopChaseState {
  const loopPeriod = 26.0;
  const t = ((simTime + 4.0) % loopPeriod + loopPeriod) % loopPeriod;
  const u = (t / loopPeriod) * Math.PI * 2;

  const evalPath = (phase: number, lateralBias: number) => {
    const z = -6.5 + Math.cos(phase) * 7.8;
    const x = laneCenterX(z) + lateralBias + Math.sin(phase) * 0.52;
    const y = groundHeightAt(x, z);
    return { x, y, z };
  };

  const hoopPos = evalPath(u, -1.25);
  const hoopAhead = evalPath(u + 0.04, -1.25);
  const tx = hoopAhead.x - hoopPos.x;
  const tz = hoopAhead.z - hoopPos.z;
  const tLen = Math.hypot(tx, tz) || 1;
  const dirX = tx / tLen;
  const dirZ = tz / tLen;
  const perpX = -dirZ;
  const perpZ = dirX;
  const hoopYaw = Math.atan2(dirX, dirZ);

  const boyX = hoopPos.x - dirX * 1.15 + perpX * 0.1;
  const boyZ = hoopPos.z - dirZ * 1.15 + perpZ * 0.1;
  const boyPos = { x: boyX, y: groundHeightAt(boyX, boyZ), z: boyZ };
  const boyYaw = Math.atan2(hoopPos.x - boyPos.x, hoopPos.z - boyPos.z);

  const girlX = hoopPos.x - dirX * 2.25 - perpX * 0.22;
  const girlZ = hoopPos.z - dirZ * 2.25 - perpZ * 0.22;
  const girlPos = { x: girlX, y: groundHeightAt(girlX, girlZ), z: girlZ };
  const girlYaw = Math.atan2(boyPos.x - girlPos.x, boyPos.z - girlPos.z);

  return {
    hoopPos,
    hoopYaw,
    hoopRollAngle: simTime * 4.4,
    hoopWobble: Math.sin(simTime * 3.1) * 0.09,
    boyPos,
    boyYaw,
    boyStridePhase: simTime * 5.2,
    girlPos,
    girlYaw,
    girlStridePhase: simTime * 5.2 + 1.4,
  };
}

/**
 * Evaluates the floating cinema camera along the Swiss village lane
 * or focuses smoothly on one of the story vignettes.
 */
export function evaluateCameraFrame(
  preset: CameraPresetId,
  simTime: number,
): CameraFrame {
  if (preset === 'baker') {
    const cx = laneCenterX(9.5);
    const baseY = groundHeightAt(cx, 9.5);
    const sway = Math.sin(simTime * 0.35) * 0.25;
    return {
      position: { x: cx + 2.2 + sway, y: baseY + 3.8, z: 12.2 },
      target: { x: cx - 3.0, y: baseY + 4.1, z: 9.5 },
    };
  }

  if (preset === 'farmer') {
    const fc = evaluateFarmerCowState(simTime);
    const midX = (fc.farmerPos.x + fc.cowPos.x) * 0.5;
    const midY = (fc.farmerPos.y + fc.cowPos.y) * 0.5;
    const midZ = (fc.farmerPos.z + fc.cowPos.z) * 0.5;
    const camZ = midZ + 4.35;
    const laneX = laneCenterX(camZ);
    const drift = Math.sin(simTime * 0.25) * 0.22;
    return {
      position: {
        x: laneX - 0.55 + drift,
        y: midY + 1.82,
        z: camZ,
      },
      target: {
        x: midX - 0.05,
        y: midY + 1.08,
        z: midZ - 0.35,
      },
    };
  }

  if (preset === 'children') {
    const hc = evaluateHoopChaseState(simTime);
    const dx = hc.hoopPos.x - hc.boyPos.x;
    const dz = hc.hoopPos.z - hc.boyPos.z;
    const len = Math.hypot(dx, dz) || 1;
    const dirX = dx / len;
    const dirZ = dz / len;
    const camZ = hc.hoopPos.z + dirZ * 4.25;
    const laneX = laneCenterX(camZ);
    const rawCamX = hc.hoopPos.x + dirX * 4.25 + 0.95;
    const camX = Math.max(laneX - 1.55, Math.min(laneX + 1.55, rawCamX));
    const camY = groundHeightAt(camX, camZ) + 1.26;
    return {
      position: {
        x: camX,
        y: camY,
        z: camZ,
      },
      target: {
        x: hc.hoopPos.x * 0.45 + hc.boyPos.x * 0.55,
        y: hc.boyPos.y + 0.54,
        z: hc.hoopPos.z * 0.45 + hc.boyPos.z * 0.55,
      },
    };
  }

  // Default: 'glide' (and initial reference for 'orbit')
  // Continuous slow-motion floating glide down the cobbled lane from +Z toward -Z Alps
  const glidePeriod = 48.0;
  const u = ((simTime % glidePeriod) + glidePeriod) % glidePeriod / glidePeriod;
  const pingPong = 0.5 - 0.5 * Math.cos(u * Math.PI * 2);
  const z = 19.5 - pingPong * 40.0;
  const x = laneCenterX(z) + Math.sin(u * Math.PI * 4) * 1.05;
  const y = groundHeightAt(x, z) + 2.35 + Math.sin(simTime * 0.45) * 0.2;

  const lookZ = z - 8.5;
  const lookX = laneCenterX(lookZ) + Math.sin(simTime * 0.28) * 0.4;
  const lookY = groundHeightAt(lookX, lookZ) + 2.05;

  return {
    position: { x, y, z },
    target: { x: lookX, y: lookY, z: lookZ },
  };
}
