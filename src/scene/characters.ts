import * as THREE from 'three';
import { FarmerCowState, HoopChaseState } from './choreography';
import { createContactShadow, createSubsurfaceMaterial } from './materials';
import { TextureBundle } from './textures';

export interface CharactersRig {
  updateFarmerAndCow: (state: FarmerCowState) => void;
  updateHoopChase: (state: HoopChaseState) => void;
}

/**
 * Builds the weathered Swiss farmer in felt hat, suspenders, boots, and walking staff.
 */
function createFarmerRig(
  skinMat: THREE.Material,
  cheekMat: THREE.Material,
  shadowTex: THREE.Texture,
) {
  const root = new THREE.Group();
  root.add(createContactShadow(shadowTex, 0.55, 0.42));

  const pantsMat = new THREE.MeshStandardMaterial({ color: 0x3f362e, roughness: 0.85 });
  const shirtMat = new THREE.MeshPhysicalMaterial({ color: 0xf4ead8, roughness: 0.78, sheen: 0.35 });
  const vestMat = new THREE.MeshStandardMaterial({ color: 0x4b5e43, roughness: 0.8 });
  const bootMat = new THREE.MeshStandardMaterial({ color: 0x2b1b12, roughness: 0.45 });
  const hatMat = new THREE.MeshStandardMaterial({ color: 0x3b352c, roughness: 0.88 });
  const featherMat = new THREE.MeshStandardMaterial({ color: 0xc93b2b, roughness: 0.6 });
  const staffMat = new THREE.MeshStandardMaterial({ color: 0x6e4728, roughness: 0.75 });

  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const makeLeg = (side: -1 | 1) => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.13, 0.78, 0);
    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.42, 6, 10), pantsMat);
    thigh.position.y = -0.26;
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.24, 0.26), bootMat);
    boot.position.set(0, -0.64, 0.04);
    hip.add(thigh, boot);
    return hip;
  };
  const leftLeg = makeLeg(-1);
  const rightLeg = makeLeg(1);
  bodyGroup.add(leftLeg, rightLeg);

  // Torso + suspenders (vest slightly wider than shirt to prevent z-fighting)
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.19, 0.38, 8, 14), shirtMat);
  torso.position.y = 1.12;
  const vest = new THREE.Mesh(new THREE.CylinderGeometry(0.225, 0.235, 0.44, 12), vestMat);
  vest.position.y = 1.08;
  bodyGroup.add(torso, vest);

  // Expressive head + wide Alpine felt hat + friendly eyes & mustache
  const headGroup = new THREE.Group();
  headGroup.position.y = 1.58;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.175, 16, 14), skinMat);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), cheekMat);
  nose.position.set(0, -0.01, 0.17);
  const fEyeMat = new THREE.MeshStandardMaterial({ color: 0x1e1510, roughness: 0.2 });
  for (const s of [-1, 1] as const) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), fEyeMat);
    eye.position.set(s * 0.062, 0.03, 0.155);
    const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.036, 8, 8), cheekMat);
    cheek.position.set(s * 0.088, -0.03, 0.135);
    headGroup.add(eye, cheek);
  }
  const beard = new THREE.Mesh(
    new THREE.SphereGeometry(0.125, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0x6f4a2e, roughness: 0.88 }),
  );
  beard.position.set(0, -0.085, 0.1);
  beard.scale.set(1.05, 0.9, 0.78);
  const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.34, 0.035, 18), hatMat);
  hatBrim.position.y = 0.11;
  const hatCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.185, 0.18, 16), hatMat);
  hatCrown.position.y = 0.21;
  const feather = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.18, 6), featherMat);
  feather.position.set(0.16, 0.24, -0.04);
  feather.rotation.z = -0.45;
  headGroup.add(head, nose, beard, hatBrim, hatCrown, feather);
  bodyGroup.add(headGroup);

  // Arms (left arm holds rope lead backward; right arm swings walking staff)
  const leftArm = new THREE.Group();
  leftArm.position.set(-0.26, 1.32, 0);
  const lArmMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.058, 0.36, 6, 10), shirtMat);
  lArmMesh.position.y = -0.22;
  const lHand = new THREE.Mesh(new THREE.SphereGeometry(0.052, 10, 8), skinMat);
  lHand.position.y = -0.45;
  leftArm.add(lArmMesh, lHand);

  const rightArm = new THREE.Group();
  rightArm.position.set(0.26, 1.32, 0);
  const rArmMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.058, 0.36, 6, 10), shirtMat);
  rArmMesh.position.y = -0.22;
  const rHand = new THREE.Mesh(new THREE.SphereGeometry(0.052, 10, 8), skinMat);
  rHand.position.y = -0.45;
  const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.018, 1.45, 8), staffMat);
  staff.position.set(0.04, -0.28, 0.08);
  staff.rotation.x = 0.14;
  rightArm.add(rArmMesh, rHand, staff);

  bodyGroup.add(leftArm, rightArm);

  root.traverse((c) => {
    if ((c as THREE.Mesh).isMesh) {
      c.castShadow = true;
      c.receiveShadow = true;
    }
  });

  return { root, bodyGroup, leftLeg, rightLeg, leftArm, rightArm, lHand, headGroup };
}

/**
 * Builds the Swiss Brown Cow with sculpted muzzle, curved horns, articulated 4-leg gait,
 * leather collar strap, and gleaming swinging brass cowbell.
 */
function createBrownCowRig(shadowTex: THREE.Texture) {
  const root = new THREE.Group();
  root.add(createContactShadow(shadowTex, 0.95, 0.44));

  const hideMat = createSubsurfaceMaterial({
    color: 0x7c4f32,
    scatterColor: 0xb56b3a,
    scatterStrength: 0.18,
    roughness: 0.68,
    sheen: 0.5,
    sheenColor: 0xc99c77,
  });
  const bellyMat = createSubsurfaceMaterial({
    color: 0x9e7152,
    scatterColor: 0xc48258,
    scatterStrength: 0.2,
    roughness: 0.72,
  });
  const muzzleMat = createSubsurfaceMaterial({
    color: 0xe6baa8,
    scatterColor: 0xff7b66,
    scatterStrength: 0.32,
    roughness: 0.56,
  });
  const hornMat = new THREE.MeshStandardMaterial({ color: 0xe9ddc4, roughness: 0.38 });
  const hoofMat = new THREE.MeshStandardMaterial({ color: 0x261d17, roughness: 0.5 });
  const leatherMat = new THREE.MeshStandardMaterial({ color: 0x422414, roughness: 0.62 });
  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xdca53a,
    metalness: 0.88,
    roughness: 0.22,
  });

  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  // Barrel torso
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.46, 0.98, 10, 18), hideMat);
  torso.rotation.x = Math.PI / 2;
  torso.position.set(0, 1.04, 0);
  torso.scale.set(0.95, 1.0, 1.05);
  bodyGroup.add(torso);

  // Soft cream-tan underbelly & udder
  const under = new THREE.Mesh(new THREE.SphereGeometry(0.38, 14, 10), bellyMat);
  under.position.set(0, 0.82, 0.02);
  under.scale.set(0.95, 0.65, 1.6);
  const udder = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), muzzleMat);
  udder.position.set(0, 0.64, -0.35);
  bodyGroup.add(under, udder);

  // Articulated 4 legs
  const makeCowLeg = (x: number, z: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.86, z);
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.095, 0.42, 6, 10), hideMat);
    upper.position.y = -0.28;
    const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.064, 0.36, 10), bellyMat);
    lower.position.y = -0.62;
    const hoof = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.1, 10), hoofMat);
    hoof.position.y = -0.81;
    pivot.add(upper, lower, hoof);
    return pivot;
  };
  const legFL = makeCowLeg(-0.24, 0.46);
  const legFR = makeCowLeg(0.24, 0.46);
  const legBL = makeCowLeg(-0.24, -0.48);
  const legBR = makeCowLeg(0.24, -0.48);
  bodyGroup.add(legFL, legFR, legBL, legBR);

  // Neck & expressive head
  const neck = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.36, 8, 12), hideMat);
  neck.position.set(0, 1.24, 0.64);
  neck.rotation.x = 0.68;
  bodyGroup.add(neck);

  const headPivot = new THREE.Group();
  headPivot.position.set(0, 1.36, 0.84);

  const skull = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.34, 0.42), hideMat);
  skull.position.set(0, 0, 0.12);
  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 12), muzzleMat);
  muzzle.position.set(0, -0.07, 0.35);
  muzzle.scale.set(1.1, 0.82, 0.9);
  headPivot.add(skull, muzzle);

  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x1a120d, roughness: 0.18 });
  for (const s of [-1, 1] as const) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.038, 10, 8), eyeMat);
    eye.position.set(s * 0.175, 0.06, 0.22);
    const ear = new THREE.Mesh(new THREE.CapsuleGeometry(0.044, 0.15, 6, 8), hideMat);
    ear.position.set(s * 0.24, 0.09, 0.04);
    ear.rotation.z = s * 1.15;
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.044, 0.23, 8), hornMat);
    horn.position.set(s * 0.14, 0.2, 0.06);
    horn.rotation.z = -s * 0.65;
    horn.rotation.x = 0.35;
    const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), hoofMat);
    nostril.position.set(s * 0.065, -0.055, 0.49);
    headPivot.add(eye, ear, horn, nostril);
  }

  // Leather halter anchor for rope lead
  const halter = new THREE.Mesh(new THREE.TorusGeometry(0.175, 0.022, 8, 16), leatherMat);
  halter.position.set(0, -0.05, 0.3);
  const halterAnchor = new THREE.Object3D();
  halterAnchor.position.set(0, -0.18, 0.34);
  headPivot.add(halter, halterAnchor);
  bodyGroup.add(headPivot);

  // Leather neck strap + prominent gleaming brass Swiss cowbell
  const strap = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.045, 8, 20), leatherMat);
  strap.position.set(0, 1.16, 0.67);
  strap.rotation.x = 0.72;
  bodyGroup.add(strap);

  const bellPivot = new THREE.Group();
  bellPivot.position.set(0, 0.94, 0.85);
  const bellBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.088, 0.135, 0.22, 14),
    brassMat,
  );
  bellBody.position.y = -0.12;
  bellBody.scale.set(1.18, 1, 0.85);
  const bellClapper = new THREE.Mesh(new THREE.SphereGeometry(0.036, 8, 8), hoofMat);
  bellClapper.position.y = -0.23;
  bellPivot.add(bellBody, bellClapper);
  bodyGroup.add(bellPivot);

  // Tail
  const tailPivot = new THREE.Group();
  tailPivot.position.set(0, 1.18, -0.68);
  const tailStem = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.016, 0.62, 8), hideMat);
  tailStem.position.y = -0.31;
  const tailTuft = new THREE.Mesh(new THREE.ConeGeometry(0.048, 0.14, 8), hoofMat);
  tailTuft.position.y = -0.64;
  tailPivot.add(tailStem, tailTuft);
  bodyGroup.add(tailPivot);

  root.traverse((c) => {
    if ((c as THREE.Mesh).isMesh) {
      c.castShadow = true;
      c.receiveShadow = true;
    }
  });

  return {
    root,
    bodyGroup,
    legFL,
    legFR,
    legBL,
    legBR,
    headPivot,
    bellPivot,
    tailPivot,
    halterAnchor,
  };
}

/**
 * Builds the two children chasing a rolling wooden hoop along the cobbled lane.
 */
function createChildrenAndHoop(
  skinMat: THREE.Material,
  cheekMat: THREE.Material,
  shadowTex: THREE.Texture,
) {
  // 1. Rolling Wooden Hoop with iron rim
  const hoopRoot = new THREE.Group();
  hoopRoot.add(createContactShadow(shadowTex, 0.36, 0.36));

  const hoopWheel = new THREE.Group();
  hoopWheel.position.y = 0.38;
  const oakMat = new THREE.MeshStandardMaterial({ color: 0xa46d3b, roughness: 0.62 });
  const rimMat = new THREE.MeshStandardMaterial({
    color: 0x3b3834,
    metalness: 0.72,
    roughness: 0.38,
  });
  const oakRing = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.032, 10, 28), oakMat);
  oakRing.rotation.y = Math.PI / 2;
  const ironBand = new THREE.Mesh(new THREE.TorusGeometry(0.39, 0.012, 8, 28), rimMat);
  ironBand.rotation.y = Math.PI / 2;
  hoopWheel.add(oakRing, ironBand);
  hoopWheel.traverse((c) => {
    if ((c as THREE.Mesh).isMesh) c.castShadow = true;
  });
  hoopRoot.add(hoopWheel);

  // 2. Helper for Pixar-proportioned running child
  const buildChild = (options: {
    shirtColor: number;
    bottomColor: number;
    hairColor: number;
    isGirl: boolean;
    hasStick: boolean;
  }) => {
    const root = new THREE.Group();
    root.add(createContactShadow(shadowTex, 0.38, 0.38));

    const body = new THREE.Group();
    root.add(body);

    const shirtMat = new THREE.MeshPhysicalMaterial({
      color: options.shirtColor,
      roughness: 0.74,
      sheen: 0.35,
    });
    const bottomMat = new THREE.MeshStandardMaterial({
      color: options.bottomColor,
      roughness: 0.78,
    });
    const hairMat = new THREE.MeshStandardMaterial({
      color: options.hairColor,
      roughness: 0.82,
    });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x382315, roughness: 0.45 });

    const makeLeg = (side: -1 | 1) => {
      const hip = new THREE.Group();
      hip.position.set(side * 0.09, 0.5, 0);
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.052, 0.28, 6, 8), skinMat);
      leg.position.y = -0.19;
      const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.1, 0.18), shoeMat);
      shoe.position.set(0, -0.43, 0.03);
      hip.add(leg, shoe);
      return hip;
    };
    const leftLeg = makeLeg(-1);
    const rightLeg = makeLeg(1);
    body.add(leftLeg, rightLeg);

    // Torso / dress
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.135, 0.24, 8, 12), shirtMat);
    torso.position.y = 0.74;
    body.add(torso);

    if (options.isGirl) {
      const skirt = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.34, 14), bottomMat);
      skirt.position.y = 0.56;
      body.add(skirt);
    } else {
      const shorts = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.155, 0.22, 12), bottomMat);
      shorts.position.y = 0.54;
      body.add(shorts);
    }

    // Expressive big Pixar child head
    const headGroup = new THREE.Group();
    headGroup.position.y = 1.07;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 14), skinMat);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.034, 8, 8), cheekMat);
    nose.position.set(0, -0.01, 0.155);
    const childEyeMat = new THREE.MeshStandardMaterial({ color: 0x1e1510, roughness: 0.2 });
    for (const s of [-1, 1] as const) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), childEyeMat);
      eye.position.set(s * 0.058, 0.025, 0.145);
      const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 8), cheekMat);
      cheek.position.set(s * 0.082, -0.03, 0.125);
      cheek.scale.set(1.1, 0.75, 0.65);
      headGroup.add(eye, cheek);
    }
    const hairCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.168, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.58),
      hairMat,
    );
    hairCap.rotation.x = -0.2;
    headGroup.add(head, nose, hairCap);

    const braids: THREE.Mesh[] = [];
    if (options.isGirl) {
      for (const s of [-1, 1] as const) {
        const braid = new THREE.Mesh(new THREE.CapsuleGeometry(0.036, 0.18, 6, 8), hairMat);
        braid.position.set(s * 0.155, -0.04, -0.04);
        braid.rotation.z = s * 0.35;
        headGroup.add(braid);
        braids.push(braid);
      }
    } else {
      const capMat = new THREE.MeshStandardMaterial({ color: 0x486b54, roughness: 0.78 });
      const capDome = new THREE.Mesh(
        new THREE.SphereGeometry(0.178, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.52),
        capMat,
      );
      capDome.position.set(0, 0.036, -0.014);
      capDome.rotation.x = -0.34;
      const capBand = new THREE.Mesh(new THREE.CylinderGeometry(0.174, 0.18, 0.034, 14), capMat);
      capBand.position.set(0, 0.068, -0.014);
      capBand.rotation.x = -0.34;
      const capVisor = new THREE.Mesh(new THREE.SphereGeometry(0.115, 10, 8), capMat);
      capVisor.position.set(0, 0.078, 0.132);
      capVisor.rotation.x = -0.18;
      capVisor.scale.set(1.15, 0.16, 0.85);
      headGroup.add(capDome, capBand, capVisor);
    }
    body.add(headGroup);

    const makeArm = (side: -1 | 1) => {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.18, 0.86, 0);
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.042, 0.22, 6, 8), shirtMat);
      arm.position.y = -0.14;
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.042, 8, 8), skinMat);
      hand.position.y = -0.29;
      pivot.add(arm, hand);
      return pivot;
    };
    const leftArm = makeArm(-1);
    const rightArm = makeArm(1);

    if (options.hasStick) {
      const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.012, 0.62, 6), oakMat);
      stick.rotation.x = Math.PI / 2 - 0.35;
      stick.position.set(0, -0.28, 0.26);
      rightArm.add(stick);
    }
    body.add(leftArm, rightArm);

    root.traverse((c) => {
      if ((c as THREE.Mesh).isMesh) {
        c.castShadow = true;
        c.receiveShadow = true;
      }
    });

    return { root, body, leftLeg, rightLeg, leftArm, rightArm, headGroup, braids };
  };

  const boy = buildChild({
    shirtColor: 0xf7efe1,
    bottomColor: 0x5c3a22,
    hairColor: 0x6b4122,
    isGirl: false,
    hasStick: true,
  });

  const girl = buildChild({
    shirtColor: 0xfff5e6,
    bottomColor: 0xc23e36,
    hairColor: 0xd9a04e,
    isGirl: true,
    hasStick: false,
  });

  return { hoopRoot, hoopWheel, boy, girl };
}

export function createCharacters(
  scene: THREE.Scene,
  textures: TextureBundle,
): CharactersRig {
  const skinMat = createSubsurfaceMaterial({
    color: 0xf6c7ab,
    scatterColor: 0xff6b45,
    scatterStrength: 0.36,
    roughness: 0.54,
  });
  const cheekMat = createSubsurfaceMaterial({
    color: 0xee977a,
    scatterColor: 0xff5438,
    scatterStrength: 0.44,
    roughness: 0.5,
  });

  const farmer = createFarmerRig(skinMat, cheekMat, textures.contactShadowMap);
  const cow = createBrownCowRig(textures.contactShadowMap);
  scene.add(farmer.root, cow.root);

  // Dynamic Catenary Rope Lead connecting farmer's hand to cow's halter
  const ropeSegs = 10;
  const ropePositions = new Float32Array((ropeSegs + 1) * 3);
  const ropeGeo = new THREE.BufferGeometry();
  const ropeAttr = new THREE.BufferAttribute(ropePositions, 3);
  ropeGeo.setAttribute('position', ropeAttr);
  const ropeLine = new THREE.Line(
    ropeGeo,
    new THREE.LineBasicMaterial({ color: 0xb89668 }),
  );
  ropeLine.frustumCulled = false;
  scene.add(ropeLine);

  const handWorld = new THREE.Vector3();
  const halterWorld = new THREE.Vector3();

  const chase = createChildrenAndHoop(skinMat, cheekMat, textures.contactShadowMap);
  scene.add(chase.hoopRoot, chase.boy.root, chase.girl.root);

  return {
    updateFarmerAndCow: (state: FarmerCowState) => {
      farmer.root.position.set(state.farmerPos.x, state.farmerPos.y, state.farmerPos.z);
      farmer.root.rotation.y = state.farmerYaw;
      const fp = state.farmerStridePhase;
      farmer.bodyGroup.position.y = Math.abs(Math.sin(fp)) * 0.04;
      farmer.leftLeg.rotation.x = Math.sin(fp) * 0.42;
      farmer.rightLeg.rotation.x = -Math.sin(fp) * 0.42;
      farmer.rightArm.rotation.x = Math.sin(fp) * 0.25;
      // Left arm reaches slightly back holding the cow lead rope
      farmer.leftArm.rotation.x = -0.35 + Math.cos(fp) * 0.1;
      farmer.headGroup.rotation.y = Math.sin(fp * 0.5) * 0.1;

      cow.root.position.set(state.cowPos.x, state.cowPos.y, state.cowPos.z);
      cow.root.rotation.y = state.cowYaw;
      const cp = state.cowStridePhase;
      cow.bodyGroup.position.y = Math.abs(Math.sin(cp)) * 0.03;
      cow.bodyGroup.rotation.z = Math.sin(cp) * 0.025;
      cow.legFL.rotation.x = Math.sin(cp) * 0.34;
      cow.legBR.rotation.x = Math.sin(cp) * 0.34;
      cow.legFR.rotation.x = -Math.sin(cp) * 0.34;
      cow.legBL.rotation.x = -Math.sin(cp) * 0.34;

      cow.bellPivot.rotation.z = state.bellAngle;
      cow.bellPivot.rotation.x = Math.abs(state.bellAngle) * 0.28;
      cow.tailPivot.rotation.z = state.tailSwing;
      cow.headPivot.rotation.x = state.headNod;

      // Update world matrices and catenary rope vertices
      farmer.root.updateMatrixWorld(true);
      cow.root.updateMatrixWorld(true);
      farmer.lHand.getWorldPosition(handWorld);
      cow.halterAnchor.getWorldPosition(halterWorld);

      for (let i = 0; i <= ropeSegs; i++) {
        const t = i / ropeSegs;
        const sag = Math.sin(t * Math.PI) * 0.34;
        ropePositions[i * 3] = THREE.MathUtils.lerp(handWorld.x, halterWorld.x, t);
        ropePositions[i * 3 + 1] = THREE.MathUtils.lerp(handWorld.y, halterWorld.y, t) - sag;
        ropePositions[i * 3 + 2] = THREE.MathUtils.lerp(handWorld.z, halterWorld.z, t);
      }
      ropeAttr.needsUpdate = true;
    },

    updateHoopChase: (state: HoopChaseState) => {
      chase.hoopRoot.position.set(state.hoopPos.x, state.hoopPos.y, state.hoopPos.z);
      chase.hoopRoot.rotation.y = state.hoopYaw;
      chase.hoopWheel.rotation.x = state.hoopRollAngle;
      chase.hoopWheel.rotation.z = state.hoopWobble;

      const animateChild = (
        c: typeof chase.boy,
        pos: { x: number; y: number; z: number },
        yaw: number,
        phase: number,
        reachForward: boolean,
      ) => {
        c.root.position.set(pos.x, pos.y, pos.z);
        c.root.rotation.y = yaw;
        c.body.position.y = Math.abs(Math.sin(phase)) * 0.08;
        c.body.rotation.x = 0.14; // Joyful forward lean
        c.leftLeg.rotation.x = Math.sin(phase) * 0.65;
        c.rightLeg.rotation.x = -Math.sin(phase) * 0.65;
        c.leftArm.rotation.x = -Math.sin(phase) * 0.55;
        c.rightArm.rotation.x = reachForward
          ? -0.75 + Math.sin(phase) * 0.25
          : Math.sin(phase) * 0.55;
        for (const braid of c.braids) {
          braid.rotation.x = 0.2 + Math.abs(Math.sin(phase)) * 0.35;
        }
      };

      animateChild(chase.boy, state.boyPos, state.boyYaw, state.boyStridePhase, true);
      animateChild(chase.girl, state.girlPos, state.girlYaw, state.girlStridePhase, false);
    },
  };
}
