import * as THREE from 'three';
import { BakerShutterState } from './choreography';
import { createSubsurfaceMaterial } from './materials';
import { TextureBundle } from './textures';
import { CHALET_SPECS, ChaletSpec, computeChaletPosition } from './villageLayout';

export interface ChaletsRig {
  updateBaker: (state: BakerShutterState) => void;
}

/**
 * Helper to add a wooden window box overflowing with lush green foliage and vibrant red geraniums.
 */
function createGeraniumFlowerBox(
  width: number,
  woodMat: THREE.Material,
  soilMat: THREE.Material,
  leafMat: THREE.Material,
  blossomMats: THREE.Material[],
  seed: number,
): THREE.Group {
  const group = new THREE.Group();

  // Tapered wooden planter trough
  const box = new THREE.Mesh(new THREE.BoxGeometry(width, 0.2, 0.24), woodMat);
  box.position.y = 0.1;
  group.add(box);

  const rim = new THREE.Mesh(new THREE.BoxGeometry(width + 0.05, 0.04, 0.28), woodMat);
  rim.position.y = 0.2;
  group.add(rim);

  const soil = new THREE.Mesh(new THREE.BoxGeometry(width - 0.06, 0.04, 0.18), soilMat);
  soil.position.y = 0.19;
  group.add(soil);

  // Leaf & trailing vine puffs + vibrant geranium clusters spilling over the front edge
  let s = seed >>> 0;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };

  const leafGeo = new THREE.IcosahedronGeometry(0.088, 1);
  const flowerGeo = new THREE.IcosahedronGeometry(0.062, 1);

  const count = Math.max(5, Math.round(width * 6));
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const lx = (t - 0.5) * (width - 0.14) + (rand() - 0.5) * 0.06;
    const spillZ = 0.04 + rand() * 0.12;
    const ly = 0.23 + rand() * 0.07;

    const leaf = new THREE.Mesh(leafGeo, leafMat);
    leaf.position.set(lx, ly, spillZ * 0.5);
    leaf.scale.set(1.1 + rand() * 0.4, 0.75 + rand() * 0.3, 1.0 + rand() * 0.4);
    leaf.rotation.set(rand() * 0.6, rand() * Math.PI, rand() * 0.4);
    group.add(leaf);

    // Trailing geranium drape spilling down the front of the flower box
    if (i % 2 === 0 || rand() > 0.35) {
      const drapeLeaf = new THREE.Mesh(leafGeo, leafMat);
      drapeLeaf.position.set(lx, 0.14 - rand() * 0.08, 0.13 + rand() * 0.05);
      drapeLeaf.scale.set(0.9, 1.1, 0.85);
      group.add(drapeLeaf);
    }

    // Two overlapping crimson/scarlet/coral geranium blossom umbels per cluster
    for (let f = 0; f < 2; f++) {
      const fMat = blossomMats[(i + f) % blossomMats.length];
      const flower = new THREE.Mesh(flowerGeo, fMat);
      const isSpilling = f === 1;
      flower.position.set(
        lx + (rand() - 0.5) * 0.08,
        isSpilling ? 0.14 + rand() * 0.09 : 0.27 + rand() * 0.08,
        isSpilling ? 0.15 + rand() * 0.06 : 0.04 + rand() * 0.08,
      );
      flower.scale.setScalar(0.85 + rand() * 0.45);
      group.add(flower);
    }
  }

  return group;
}

/**
 * Creates a carved Swiss wooden balcony spanning the front facade.
 */
function createCarvedBalcony(
  width: number,
  depth: number,
  woodMat: THREE.Material,
  darkWoodMat: THREE.Material,
  soilMat: THREE.Material,
  leafMat: THREE.Material,
  blossomMats: THREE.Material[],
  seed: number,
  leaveCenterGap = false,
): THREE.Group {
  const group = new THREE.Group();

  // Floor deck
  const deck = new THREE.Mesh(new THREE.BoxGeometry(width, 0.14, depth), darkWoodMat);
  deck.position.set(0, 0.07, depth * 0.5);
  group.add(deck);

  // Carved bracket corbels underneath
  const corbelCount = 4;
  for (let i = 0; i < corbelCount; i++) {
    const cx = THREE.MathUtils.lerp(-width * 0.42, width * 0.42, i / (corbelCount - 1));
    const corbel = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.34, depth * 0.8), darkWoodMat);
    corbel.position.set(cx, -0.14, depth * 0.4);
    corbel.rotation.x = 0.28;
    group.add(corbel);
  }

  const railH = 0.86;
  const gapHalf = 0.92;

  if (leaveCenterGap) {
    // Split front rails around the center bakery shuttered window bay
    const wingW = width * 0.5 - gapHalf;
    for (const s of [-1, 1] as const) {
      const wingCenter = s * (gapHalf + wingW * 0.5);
      const topR = new THREE.Mesh(new THREE.BoxGeometry(wingW, 0.09, 0.12), woodMat);
      topR.position.set(wingCenter, railH, depth - 0.05);
      const botR = new THREE.Mesh(new THREE.BoxGeometry(wingW, 0.07, 0.09), darkWoodMat);
      botR.position.set(wingCenter, 0.18, depth - 0.05);
      group.add(topR, botR);
    }
  } else {
    const topRail = new THREE.Mesh(new THREE.BoxGeometry(width + 0.08, 0.09, 0.12), woodMat);
    topRail.position.set(0, railH, depth - 0.05);
    const botRail = new THREE.Mesh(new THREE.BoxGeometry(width, 0.07, 0.09), darkWoodMat);
    botRail.position.set(0, 0.18, depth - 0.05);
    group.add(topRail, botRail);
  }

  // Side railings
  for (const s of [-1, 1] as const) {
    const sideTop = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.09, depth), woodMat);
    sideTop.position.set(s * (width * 0.5 - 0.05), railH, depth * 0.5);
    group.add(sideTop);
  }

  // Carved flat-cutout Alpine balusters along the front rail
  const slatCount = Math.max(8, Math.round(width * 3.2));
  const slatGeo = new THREE.BoxGeometry(0.11, railH - 0.22, 0.04);
  const diamondGeo = new THREE.OctahedronGeometry(0.065, 0);
  for (let i = 0; i < slatCount; i++) {
    const sx = THREE.MathUtils.lerp(-width * 0.46, width * 0.46, i / (slatCount - 1));
    if (leaveCenterGap && Math.abs(sx) < gapHalf - 0.05) continue;
    const slat = new THREE.Mesh(slatGeo, woodMat);
    slat.position.set(sx, 0.51, depth - 0.05);
    group.add(slat);

    if (i % 2 === 0) {
      const ornament = new THREE.Mesh(diamondGeo, darkWoodMat);
      ornament.position.set(sx, 0.52, depth - 0.01);
      ornament.scale.set(0.7, 1.1, 0.4);
      group.add(ornament);
    }
  }

  // Overflowing red geranium flower boxes mounted along the balcony rail
  if (leaveCenterGap) {
    const boxW = width * 0.34;
    for (const s of [-1, 1] as const) {
      const fBox = createGeraniumFlowerBox(
        boxW,
        darkWoodMat,
        soilMat,
        leafMat,
        blossomMats,
        seed + (s > 0 ? 17 : 31),
      );
      fBox.position.set(s * (width * 0.32), 0.72, depth + 0.06);
      group.add(fBox);
    }
  } else {
    const boxCount = 2;
    const boxW = width * 0.42;
    for (let i = 0; i < boxCount; i++) {
      const bx = (i === 0 ? -1 : 1) * (width * 0.24);
      const fBox = createGeraniumFlowerBox(
        boxW,
        darkWoodMat,
        soilMat,
        leafMat,
        blossomMats,
        seed + i * 29,
      );
      fBox.position.set(bx, 0.72, depth + 0.06);
      group.add(fBox);
    }
  }

  return group;
}

/**
 * Builds the Pixar-proportioned Baker leaning out of the bakery's upper shuttered window.
 */
function createBakerCharacter(
  skinMat: THREE.Material,
  cheekMat: THREE.Material,
): {
  bakerGroup: THREE.Group;
  headGroup: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  eyelids: THREE.Mesh[];
} {
  const bakerGroup = new THREE.Group();

  const shirtMat = new THREE.MeshPhysicalMaterial({
    color: 0xfaf4ea,
    roughness: 0.78,
    sheen: 0.35,
  });
  const apronMat = new THREE.MeshPhysicalMaterial({
    color: 0xe6dac6,
    roughness: 0.82,
    sheen: 0.3,
  });
  const vestMat = new THREE.MeshStandardMaterial({
    color: 0x7b4c2e,
    roughness: 0.75,
  });
  const hatMat = new THREE.MeshPhysicalMaterial({
    color: 0xfffaf2,
    roughness: 0.72,
    sheen: 0.4,
  });
  const mustacheMat = new THREE.MeshStandardMaterial({
    color: 0x5c361e,
    roughness: 0.85,
  });
  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0x221712,
    roughness: 0.2,
  });

  // Plump torso (visible from waist up inside the window)
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.26, 8, 14), shirtMat);
  torso.position.y = 0.28;
  bakerGroup.add(torso);

  const vest = new THREE.Mesh(new THREE.CylinderGeometry(0.256, 0.268, 0.32, 12), vestMat);
  vest.position.y = 0.27;
  bakerGroup.add(vest);

  const apronBib = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.32, 0.06), apronMat);
  apronBib.position.set(0, 0.26, 0.22);
  bakerGroup.add(apronBib);

  // Expressive Pixar head
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.62, 0.04);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 18, 16), skinMat);
  head.scale.set(1.02, 1.06, 0.98);
  headGroup.add(head);

  // Warm rounded nose & rosy cheeks
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.052, 12, 10), cheekMat);
  nose.position.set(0, -0.01, 0.19);
  nose.scale.set(1.05, 0.9, 1.15);
  headGroup.add(nose);

  for (const s of [-1, 1] as const) {
    const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), cheekMat);
    cheek.position.set(s * 0.095, -0.035, 0.15);
    cheek.scale.set(1.1, 0.75, 0.6);
    headGroup.add(cheek);
  }

  // Eyes + blink lids
  const eyelids: THREE.Mesh[] = [];
  for (const s of [-1, 1] as const) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.025, 10, 8), eyeMat);
    eye.position.set(s * 0.068, 0.04, 0.165);
    headGroup.add(eye);

    const lid = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 8), skinMat);
    lid.position.set(s * 0.068, 0.045, 0.165);
    lid.scale.set(1.1, 0.15, 1.05);
    headGroup.add(lid);
    eyelids.push(lid);
  }

  // Cheerful handlebar mustache
  for (const s of [-1, 1] as const) {
    const stache = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.055, 6, 8), mustacheMat);
    stache.position.set(s * 0.045, -0.055, 0.175);
    stache.rotation.z = s * 1.15;
    headGroup.add(stache);
  }

  // Chef Toque Hat
  const hatBand = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.175, 0.12, 16), hatMat);
  hatBand.position.set(0, 0.17, -0.01);
  const hatPuff = new THREE.Mesh(new THREE.SphereGeometry(0.21, 16, 12), hatMat);
  hatPuff.position.set(0, 0.29, -0.01);
  hatPuff.scale.set(1.05, 0.85, 1.05);
  headGroup.add(hatBand, hatPuff);

  bakerGroup.add(headGroup);

  // Articulated Left & Right Arms reaching to push open shutters
  const makeArm = (side: -1 | 1) => {
    const armPivot = new THREE.Group();
    armPivot.position.set(side * 0.25, 0.42, 0.06);
    const sleeve = new THREE.Mesh(new THREE.CapsuleGeometry(0.062, 0.22, 6, 10), shirtMat);
    sleeve.rotation.x = Math.PI / 2;
    sleeve.position.set(0, -0.03, 0.14);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), skinMat);
    hand.position.set(0, -0.03, 0.29);
    armPivot.add(sleeve, hand);
    return armPivot;
  };

  const leftArm = makeArm(-1);
  const rightArm = makeArm(1);
  bakerGroup.add(leftArm, rightArm);

  return { bakerGroup, headGroup, leftArm, rightArm, eyelids };
}

export function createChalets(
  scene: THREE.Scene,
  textures: TextureBundle,
): ChaletsRig {
  const chaletsGroup = new THREE.Group();

  const skinMat = createSubsurfaceMaterial({
    color: 0xf7cbb0,
    scatterColor: 0xff6e48,
    scatterStrength: 0.36,
    roughness: 0.54,
  });
  const cheekMat = createSubsurfaceMaterial({
    color: 0xef9d82,
    scatterColor: 0xff5a3c,
    scatterStrength: 0.45,
    roughness: 0.5,
  });

  const soilMat = new THREE.MeshStandardMaterial({
    color: 0x3a281c,
    roughness: 0.96,
  });
  const leafMat = createSubsurfaceMaterial({
    color: 0x2f6a34,
    scatterColor: 0x6ab33e,
    scatterStrength: 0.24,
    roughness: 0.68,
  });
  const blossomMats = [
    createSubsurfaceMaterial({
      color: 0xd92626,
      scatterColor: 0xff5438,
      scatterStrength: 0.38,
      roughness: 0.48,
    }),
    createSubsurfaceMaterial({
      color: 0xe63b2e,
      scatterColor: 0xff6a45,
      scatterStrength: 0.38,
      roughness: 0.46,
    }),
    createSubsurfaceMaterial({
      color: 0xc21e28,
      scatterColor: 0xf7483b,
      scatterStrength: 0.35,
      roughness: 0.52,
    }),
  ];

  const windowGlowMat = new THREE.MeshStandardMaterial({
    color: 0xffdfa8,
    emissive: 0xff9e3b,
    emissiveIntensity: 0.85,
    roughness: 0.25,
  });
  const windowGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0x2b3642,
    roughness: 0.14,
    metalness: 0.1,
    clearcoat: 1.0,
    emissive: 0x5c3e1e,
    emissiveIntensity: 0.35,
  });
  const stoneBaseMat = new THREE.MeshStandardMaterial({
    map: textures.plasterMap,
    bumpMap: textures.cobbleBump,
    bumpScale: 0.04,
    color: 0x8f857b,
    roughness: 0.9,
  });

  // References for animated bakery shutters & baker
  let leftShutterPivot: THREE.Group | null = null;
  let rightShutterPivot: THREE.Group | null = null;
  let bakerRig: ReturnType<typeof createBakerCharacter> | null = null;
  let bakerBaseZ = 0;

  CHALET_SPECS.forEach((spec: ChaletSpec, idx: number) => {
    const chalet = new THREE.Group();
    const pos = computeChaletPosition(spec);
    chalet.position.set(pos.x, pos.y, pos.z);
    chalet.rotation.y = pos.rotationY;

    const plasterMat = new THREE.MeshStandardMaterial({
      map: textures.plasterMap,
      bumpMap: textures.plasterBump,
      bumpScale: 0.025,
      color: spec.plasterColor,
      roughness: 0.86,
    });
    const woodMat = new THREE.MeshStandardMaterial({
      map: textures.woodMap,
      bumpMap: textures.woodBump,
      bumpScale: 0.03,
      color: spec.woodColor,
      roughness: 0.72,
    });
    const darkWoodMat = new THREE.MeshStandardMaterial({
      map: textures.woodMap,
      bumpMap: textures.woodBump,
      bumpScale: 0.03,
      color: new THREE.Color(spec.woodColor).multiplyScalar(0.72),
      roughness: 0.78,
    });
    const roofMat = new THREE.MeshStandardMaterial({
      map: textures.roofMap,
      bumpMap: textures.roofBump,
      bumpScale: 0.05,
      color: spec.roofColor,
      roughness: 0.84,
    });
    const shutterMat = new THREE.MeshStandardMaterial({
      map: textures.woodMap,
      color: spec.shutterColor,
      roughness: 0.62,
    });

    const W = spec.width;
    const D = spec.depth;
    const groundFloorH = 2.6;
    const upperH = spec.floors >= 3 ? 4.4 : 2.3;
    const totalWallH = groundFloorH + upperH;

    // 1. Stone plinth extending -0.6m underground so hillside corners stay solidly anchored
    const plinth = new THREE.Mesh(
      new THREE.BoxGeometry(W + 0.25, 1.0, D + 0.25),
      stoneBaseMat,
    );
    plinth.position.y = -0.1;
    chalet.add(plinth);

    // 2. Ground floor lime-plastered body
    const groundBody = new THREE.Mesh(
      new THREE.BoxGeometry(W, groundFloorH, D),
      plasterMat,
    );
    groundBody.position.y = groundFloorH * 0.5 + 0.2;
    chalet.add(groundBody);

    // 3. Upper timber-clad story
    const upperBody = new THREE.Mesh(
      new THREE.BoxGeometry(W + 0.14, upperH, D + 0.14),
      woodMat,
    );
    upperBody.position.y = groundFloorH + 0.2 + upperH * 0.5;
    chalet.add(upperBody);

    // 4. Timber corner posts & horizontal belt beam
    const beltBeam = new THREE.Mesh(
      new THREE.BoxGeometry(W + 0.34, 0.22, D + 0.34),
      darkWoodMat,
    );
    beltBeam.position.y = groundFloorH + 0.2;
    chalet.add(beltBeam);

    for (const sx of [-1, 1] as const) {
      for (const sz of [-1, 1] as const) {
        const post = new THREE.Mesh(
          new THREE.BoxGeometry(0.24, groundFloorH + 0.2, 0.24),
          darkWoodMat,
        );
        post.position.set(sx * (W * 0.5), (groundFloorH + 0.2) * 0.5, sz * (D * 0.5));
        chalet.add(post);
      }
    }

    // 5. Overhanging Swiss Gable Roof (two pitched roof planes + triangular gable wall)
    const roofPeakH = 2.2;
    const eaveOverhangX = 1.05;
    const eaveOverhangZ = 1.15;
    const halfSpanX = W * 0.5 + eaveOverhangX;
    const slopeLen = Math.hypot(halfSpanX, roofPeakH);
    const slopeAngle = Math.atan2(roofPeakH, halfSpanX);
    const roofBaseY = totalWallH + 0.2;

    // Gable triangle prism (extruded along Z)
    const gableShape = new THREE.Shape();
    gableShape.moveTo(-W * 0.5 - 0.08, 0);
    gableShape.lineTo(W * 0.5 + 0.08, 0);
    gableShape.lineTo(0, roofPeakH - 0.15);
    gableShape.closePath();
    const gableGeo = new THREE.ExtrudeGeometry(gableShape, {
      depth: D + 0.14,
      bevelEnabled: false,
    });
    gableGeo.translate(0, 0, -(D + 0.14) * 0.5);
    const gableMesh = new THREE.Mesh(gableGeo, woodMat);
    gableMesh.position.y = roofBaseY;
    chalet.add(gableMesh);

    for (const s of [-1, 1] as const) {
      const roofWing = new THREE.Mesh(
        new THREE.BoxGeometry(slopeLen, 0.22, D + eaveOverhangZ * 2),
        roofMat,
      );
      roofWing.position.set(
        s * (halfSpanX * 0.5),
        roofBaseY + roofPeakH * 0.5 - 0.06,
        0,
      );
      roofWing.rotation.z = -s * slopeAngle;
      chalet.add(roofWing);

      // Carved fascia trim beam at front eave
      const fascia = new THREE.Mesh(
        new THREE.BoxGeometry(slopeLen + 0.06, 0.24, 0.12),
        darkWoodMat,
      );
      fascia.position.set(
        s * (halfSpanX * 0.5),
        roofBaseY + roofPeakH * 0.5 - 0.1,
        D * 0.5 + eaveOverhangZ - 0.04,
      );
      fascia.rotation.z = -s * slopeAngle;
      chalet.add(fascia);
    }

    // Ridge beam & stone chimney
    const ridgeBeam = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.28, D + eaveOverhangZ * 2.1),
      darkWoodMat,
    );
    ridgeBeam.position.set(0, roofBaseY + roofPeakH - 0.05, 0);
    chalet.add(ridgeBeam);

    const chimney = new THREE.Mesh(
      new THREE.BoxGeometry(0.68, 1.7, 0.68),
      stoneBaseMat,
    );
    chimney.position.set(-W * 0.22, roofBaseY + roofPeakH * 0.72, -D * 0.15);
    const chimneyCap = new THREE.Mesh(
      new THREE.BoxGeometry(0.84, 0.14, 0.84),
      darkWoodMat,
    );
    chimneyCap.position.set(-W * 0.22, roofBaseY + roofPeakH * 0.72 + 0.88, -D * 0.15);
    chalet.add(chimney, chimneyCap);

    // 6. Front Doorway & Ground Floor Windows
    const frontZ = D * 0.5;
    const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(1.18, 2.02, 0.18), darkWoodMat);
    doorFrame.position.set(-W * 0.22, 1.2, frontZ + 0.02);
    const doorPanel = new THREE.Mesh(new THREE.BoxGeometry(0.94, 1.88, 0.14), woodMat);
    doorPanel.position.set(-W * 0.22, 1.18, frontZ + 0.05);
    const doorStep = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.26, 0.7), stoneBaseMat);
    doorStep.position.set(-W * 0.22, 0.13, frontZ + 0.35);
    chalet.add(doorFrame, doorPanel, doorStep);

    // Ground floor warm glowing window + geranium box
    const gWinFrame = new THREE.Mesh(new THREE.BoxGeometry(1.48, 1.22, 0.16), darkWoodMat);
    gWinFrame.position.set(W * 0.2, 1.48, frontZ + 0.03);
    const gWinGlass = new THREE.Mesh(
      new THREE.PlaneGeometry(1.24, 0.98),
      spec.isBakery ? windowGlowMat : windowGlassMat,
    );
    gWinGlass.position.set(W * 0.2, 1.48, frontZ + 0.12);
    chalet.add(gWinFrame, gWinGlass);

    // Window mullions
    const mulV = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.0, 0.06), darkWoodMat);
    mulV.position.set(W * 0.2, 1.48, frontZ + 0.13);
    const mulH = new THREE.Mesh(new THREE.BoxGeometry(1.26, 0.06, 0.06), darkWoodMat);
    mulH.position.set(W * 0.2, 1.48, frontZ + 0.13);
    chalet.add(mulV, mulH);

    const gBox = createGeraniumFlowerBox(
      1.52,
      darkWoodMat,
      soilMat,
      leafMat,
      blossomMats,
      idx * 101 + 7,
    );
    gBox.position.set(W * 0.2, 0.72, frontZ + 0.16);
    chalet.add(gBox);

    // 7. Carved Wooden Balcony on Floor 2 (plus geranium boxes)
    const balcony = createCarvedBalcony(
      W + 0.36,
      0.95,
      woodMat,
      darkWoodMat,
      soilMat,
      leafMat,
      blossomMats,
      idx * 131 + 19,
      Boolean(spec.isBakery),
    );
    balcony.position.set(0, groundFloorH + 0.26, frontZ + 0.06);
    chalet.add(balcony);

    // Decorative Swiss half-timbering diagonal corner struts on ground floor
    for (const sx of [-1, 1] as const) {
      const strut = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 1.15, 0.12),
        darkWoodMat,
      );
      strut.position.set(sx * (W * 0.41), groundFloorH - 0.22, frontZ + 0.03);
      strut.rotation.z = sx * 0.68;
      chalet.add(strut);
    }

    // 8. Upper Floor Windows & Shutters
    if (spec.isBakery) {
      // Special Hero Bakery Window with Baker Opening Dual Shutters
      const winY = groundFloorH + 1.48;
      const winW = 1.56;
      const winH = 1.32;

      const winBackdrop = new THREE.Mesh(
        new THREE.BoxGeometry(winW + 0.24, winH + 0.24, 0.26),
        darkWoodMat,
      );
      winBackdrop.position.set(0, winY, frontZ + 0.04);
      chalet.add(winBackdrop);

      const warmInterior = new THREE.Mesh(
        new THREE.PlaneGeometry(winW - 0.1, winH - 0.1),
        windowGlowMat,
      );
      warmInterior.position.set(0, winY, frontZ + 0.18);
      chalet.add(warmInterior);

      // Baker leaning cheerfully out into the morning sun
      bakerRig = createBakerCharacter(skinMat, cheekMat);
      bakerBaseZ = frontZ + 0.24;
      bakerRig.bakerGroup.position.set(0, winY - 0.38, bakerBaseZ);
      chalet.add(bakerRig.bakerGroup);

      // Dual hinged wooden shutters mounted cleanly on outer window jambs
      const shutterW = winW * 0.5;
      const makeShutter = (side: -1 | 1) => {
        const pivot = new THREE.Group();
        pivot.position.set(side * (winW * 0.5), winY, frontZ + 0.22);
        const panel = new THREE.Mesh(
          new THREE.BoxGeometry(shutterW - 0.02, winH - 0.04, 0.07),
          shutterMat,
        );
        panel.position.set(-side * (shutterW * 0.5), 0, 0);
        const brace = new THREE.Mesh(
          new THREE.BoxGeometry(shutterW * 0.8, 0.1, 0.09),
          darkWoodMat,
        );
        brace.position.set(-side * (shutterW * 0.5), 0.25, 0);
        const badge = new THREE.Mesh(
          new THREE.CircleGeometry(0.1, 12),
          new THREE.MeshStandardMaterial({ color: 0xf6e6c4, roughness: 0.7 }),
        );
        badge.position.set(-side * (shutterW * 0.5), 0.43, 0.052);
        pivot.add(panel, brace, badge);
        return pivot;
      };

      leftShutterPivot = makeShutter(-1);
      rightShutterPivot = makeShutter(1);
      chalet.add(leftShutterPivot, rightShutterPivot);

      // Hanging "BÄCKEREI" wrought-iron sign jutting out toward the lane
      const ironMat = new THREE.MeshStandardMaterial({
        color: 0x262422,
        roughness: 0.4,
        metalness: 0.8,
      });
      const signBracket = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.3), ironMat);
      signBracket.position.set(W * 0.34, 2.38, frontZ + 0.65);
      const signBoard = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.62, 1.15),
        new THREE.MeshStandardMaterial({
          map: textures.bakerySignMap,
          roughness: 0.58,
        }),
      );
      signBoard.position.set(W * 0.34, 1.98, frontZ + 0.72);
      chalet.add(signBracket, signBoard);

      // Warm bread display crates outside bakery door
      const crate = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.52, 0.52), woodMat);
      crate.position.set(W * 0.26, 0.26, frontZ + 0.42);
      chalet.add(crate);
      const loafMat = new THREE.MeshStandardMaterial({ color: 0xc97b32, roughness: 0.75 });
      for (let b = 0; b < 3; b++) {
        const loaf = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), loafMat);
        loaf.scale.set(1.25, 0.72, 0.9);
        loaf.position.set(W * 0.26 + (b - 1) * 0.26, 0.56, frontZ + 0.42);
        chalet.add(loaf);
      }
    } else {
      // Standard chalets: pair of upper windows with open shutters + flower boxes
      for (const sx of [-1, 1] as const) {
        const wx = sx * (W * 0.25);
        const wy = groundFloorH + 1.45;
        const wFrame = new THREE.Mesh(new THREE.BoxGeometry(1.06, 1.12, 0.16), darkWoodMat);
        wFrame.position.set(wx, wy, frontZ + 0.08);
        const wGlass = new THREE.Mesh(
          new THREE.PlaneGeometry(0.86, 0.92),
          idx % 2 === 0 ? windowGlowMat : windowGlassMat,
        );
        wGlass.position.set(wx, wy, frontZ + 0.17);
        chalet.add(wFrame, wGlass);

        // Open shutters flanking the window
        for (const side of [-1, 1] as const) {
          const shut = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.06, 0.06), shutterMat);
          shut.position.set(wx + side * 0.72, wy, frontZ + 0.14);
          shut.rotation.y = -side * 0.18;
          chalet.add(shut);
        }
      }

      // If 3-story chalet, add top balcony + gable geranium box!
      if (spec.floors >= 3) {
        const topBalcony = createCarvedBalcony(
          W * 0.78,
          0.75,
          woodMat,
          darkWoodMat,
          soilMat,
          leafMat,
          blossomMats,
          idx * 173 + 41,
        );
        topBalcony.position.set(0, groundFloorH + 2.4, frontZ + 0.06);
        chalet.add(topBalcony);

        const topWin = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.05, 0.16), darkWoodMat);
        topWin.position.set(0, groundFloorH + 3.45, frontZ + 0.08);
        const topGlass = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.85), windowGlowMat);
        topGlass.position.set(0, groundFloorH + 3.45, frontZ + 0.17);
        chalet.add(topWin, topGlass);
      } else {
        // Gable attic window with geranium box
        const atticBox = createGeraniumFlowerBox(
          1.15,
          darkWoodMat,
          soilMat,
          leafMat,
          blossomMats,
          idx * 199 + 5,
        );
        atticBox.position.set(0, roofBaseY + 0.15, frontZ + 0.2);
        chalet.add(atticBox);
      }
    }

    // 9. Stacked firewood log pile along chalet side for extra storybook charm
    const logMat = new THREE.MeshStandardMaterial({ color: 0x946137, roughness: 0.88 });
    const logGeo = new THREE.CylinderGeometry(0.08, 0.085, 0.55, 7);
    logGeo.rotateX(Math.PI / 2);
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 4 - row; col++) {
        const log = new THREE.Mesh(logGeo, logMat);
        log.position.set(
          W * 0.34 + col * 0.17 + row * 0.08,
          0.14 + row * 0.14,
          frontZ + 0.28,
        );
        chalet.add(log);
      }
    }

    chalet.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    chaletsGroup.add(chalet);
  });

  scene.add(chaletsGroup);

  return {
    updateBaker: (state: BakerShutterState) => {
      if (leftShutterPivot && rightShutterPivot) {
        // Swing shutters outward from closed (0 rad) to wide open (~130 deg)
        const swing = state.openAmount * 2.25;
        leftShutterPivot.rotation.y = -swing;
        rightShutterPivot.rotation.y = swing;
      }
      if (bakerRig) {
        bakerRig.bakerGroup.position.z = bakerBaseZ + state.leanAmount * 0.22;
        bakerRig.headGroup.rotation.y = state.headYaw;
        bakerRig.headGroup.rotation.x = 0.08 * state.leanAmount;

        // Arms push gently outward with shutter motion
        const armSpread = state.openAmount * 0.72;
        bakerRig.leftArm.rotation.y = -armSpread;
        bakerRig.rightArm.rotation.y = armSpread;
        bakerRig.leftArm.rotation.x = -0.15 * state.leanAmount;
        bakerRig.rightArm.rotation.x = -0.15 * state.leanAmount;

        // Blink eyelids smoothly
        const lidScaleY = 0.15 + state.blink * 0.95;
        for (const lid of bakerRig.eyelids) {
          lid.scale.y = lidScaleY;
        }
      }
    },
  };
}
