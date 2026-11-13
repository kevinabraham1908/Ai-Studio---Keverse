import * as THREE from 'three';
import { TextureBundle } from './textures';
import {
  LANE_HALF_WIDTH,
  VILLAGE_Z_MAX,
  VILLAGE_Z_MIN,
  generateTreeSpecs,
  groundHeightAt,
  laneCenterX,
  laneTangentAngle,
} from './villageLayout';

export interface EnvironmentRig {
  update: (simTime: number) => void;
}

export function createVillageEnvironment(
  scene: THREE.Scene,
  textures: TextureBundle,
): EnvironmentRig {
  const envGroup = new THREE.Group();

  // 1. Alpine Valley Meadow Terrain (extends smoothly out to mountain ring)
  const terrainWidth = 140;
  const terrainDepth = 150;
  const segX = 72;
  const segZ = 76;
  const meadowGeo = new THREE.PlaneGeometry(terrainWidth, terrainDepth, segX, segZ);
  meadowGeo.rotateX(-Math.PI / 2);

  const posAttr = meadowGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const z = posAttr.getZ(i) - 6; // Center around village z range
    posAttr.setZ(i, z);
    posAttr.setY(i, groundHeightAt(x, z) - 0.04);
  }
  meadowGeo.computeVertexNormals();

  const meadowMat = new THREE.MeshStandardMaterial({
    map: textures.meadowMap,
    roughness: 0.92,
    metalness: 0.0,
    color: 0xdce6c8,
  });
  const meadowMesh = new THREE.Mesh(meadowGeo, meadowMat);
  meadowMesh.receiveShadow = true;
  envGroup.add(meadowMesh);

  // 2. Curved Cobbled Village Lane (conforms cleanly above meadow with >= 0.03m offset)
  const laneSteps = 84;
  const laneCols = 8;
  const laneGeo = new THREE.BufferGeometry();
  const lVerts: number[] = [];
  const lUvs: number[] = [];
  const lIndices: number[] = [];

  for (let i = 0; i <= laneSteps; i++) {
    const v = i / laneSteps;
    const z = THREE.MathUtils.lerp(VILLAGE_Z_MIN - 14, VILLAGE_Z_MAX + 12, v);
    const cx = laneCenterX(z);
    for (let j = 0; j <= laneCols; j++) {
      const u = j / laneCols;
      const lateral = (u - 0.5) * 2 * LANE_HALF_WIDTH;
      const x = cx + lateral;
      const y = groundHeightAt(x, z) + 0.02;
      lVerts.push(x, y, z);
      lUvs.push(u, v * 1.15);
    }
  }

  for (let i = 0; i < laneSteps; i++) {
    for (let j = 0; j < laneCols; j++) {
      const a = i * (laneCols + 1) + j;
      const b = a + 1;
      const c = a + (laneCols + 1);
      const d = c + 1;
      lIndices.push(a, c, b, b, c, d);
    }
  }

  laneGeo.setAttribute('position', new THREE.Float32BufferAttribute(lVerts, 3));
  laneGeo.setAttribute('uv', new THREE.Float32BufferAttribute(lUvs, 2));
  laneGeo.setIndex(lIndices);
  laneGeo.computeVertexNormals();

  const cobbleMat = new THREE.MeshStandardMaterial({
    map: textures.cobbleMap,
    bumpMap: textures.cobbleBump,
    bumpScale: 0.065,
    roughnessMap: textures.cobbleRoughness,
    roughness: 0.85,
    metalness: 0.04,
    color: 0xffffff,
  });
  const laneMesh = new THREE.Mesh(laneGeo, cobbleMat);
  laneMesh.receiveShadow = true;
  envGroup.add(laneMesh);

  // 3. Granite Curb Stones Lining Both Edges of the Cobbled Lane (InstancedMesh)
  const curbGeo = new THREE.BoxGeometry(0.28, 0.14, 0.72);
  const curbMat = new THREE.MeshStandardMaterial({
    color: 0x8e847a,
    roughness: 0.84,
    metalness: 0.05,
  });
  const curbCount = 160;
  const curbInst = new THREE.InstancedMesh(curbGeo, curbMat, curbCount);
  curbInst.receiveShadow = true;
  curbInst.castShadow = true;

  const dummy = new THREE.Object3D();
  const curbColor = new THREE.Color();
  let curbIdx = 0;
  for (let i = 0; i < curbCount / 2; i++) {
    const z = THREE.MathUtils.lerp(VILLAGE_Z_MIN - 6, VILLAGE_Z_MAX + 6, i / (curbCount / 2 - 1));
    const cx = laneCenterX(z);
    const yaw = laneTangentAngle(z);

    for (const side of [-1, 1] as const) {
      const x = cx + side * (LANE_HALF_WIDTH + 0.12);
      const y = groundHeightAt(x, z) + 0.04;
      dummy.position.set(x, y, z);
      dummy.rotation.set(0, yaw, 0);
      dummy.scale.set(1, 0.9 + ((i * 7 + (side > 0 ? 1 : 0)) % 3) * 0.1, 0.95);
      dummy.updateMatrix();
      curbInst.setMatrixAt(curbIdx, dummy.matrix);
      curbColor.setHex(0x8e847a).offsetHSL(0, 0, ((i % 5) - 2) * 0.02);
      curbInst.setColorAt(curbIdx, curbColor);
      curbIdx++;
    }
  }
  curbInst.instanceMatrix.needsUpdate = true;
  if (curbInst.instanceColor) curbInst.instanceColor.needsUpdate = true;
  curbInst.computeBoundingSphere();
  envGroup.add(curbInst);

  // 4. Instanced Alpine Pine / Spruce Groves Framing the Valley
  const treeSpecs = generateTreeSpecs();
  const trunkGeo = new THREE.CylinderGeometry(0.14, 0.24, 1.8, 7);
  trunkGeo.translate(0, 0.9, 0);
  const trunkMat = new THREE.MeshStandardMaterial({
    color: 0x573822,
    roughness: 0.92,
    metalness: 0.0,
  });

  const tier1Geo = new THREE.ConeGeometry(1.45, 2.5, 9);
  tier1Geo.translate(0, 2.35, 0);
  const tier2Geo = new THREE.ConeGeometry(1.15, 2.2, 9);
  tier2Geo.translate(0, 3.65, 0);
  const tier3Geo = new THREE.ConeGeometry(0.78, 1.8, 9);
  tier3Geo.translate(0, 4.85, 0);

  const foliageMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.82,
    metalness: 0.0,
  });

  const count = treeSpecs.length;
  const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, count);
  const tier1Inst = new THREE.InstancedMesh(tier1Geo, foliageMat, count);
  const tier2Inst = new THREE.InstancedMesh(tier2Geo, foliageMat, count);
  const tier3Inst = new THREE.InstancedMesh(tier3Geo, foliageMat, count);

  const deepPine = new THREE.Color(0x274734);
  const sunlitPine = new THREE.Color(0x3a643d);
  const tempColor = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const spec = treeSpecs[i];
    const y = groundHeightAt(spec.x, spec.z) - 0.05;
    dummy.position.set(spec.x, y, spec.z);
    dummy.rotation.set(0, (i * 1.37) % (Math.PI * 2), 0);
    dummy.scale.setScalar(spec.scale);
    dummy.updateMatrix();

    trunkInst.setMatrixAt(i, dummy.matrix);
    tier1Inst.setMatrixAt(i, dummy.matrix);
    tier2Inst.setMatrixAt(i, dummy.matrix);
    tier3Inst.setMatrixAt(i, dummy.matrix);

    tempColor.copy(deepPine).lerp(sunlitPine, spec.tintMix);
    tier1Inst.setColorAt(i, tempColor);
    tier2Inst.setColorAt(i, tempColor);
    tier3Inst.setColorAt(i, tempColor);
  }

  for (const inst of [trunkInst, tier1Inst, tier2Inst, tier3Inst]) {
    inst.castShadow = true;
    inst.receiveShadow = true;
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    inst.computeBoundingSphere();
    envGroup.add(inst);
  }

  // 5. Swiss Village Wooden Fountain / Water Trough (near z = -4.5 on East edge)
  const fountainGroup = new THREE.Group();
  const fZ = -4.2;
  const fX = laneCenterX(fZ) + 3.65;
  const fY = groundHeightAt(fX, fZ);
  fountainGroup.position.set(fX, fY, fZ);
  fountainGroup.rotation.y = -0.35;

  const troughMat = new THREE.MeshStandardMaterial({
    map: textures.woodMap,
    bumpMap: textures.woodBump,
    bumpScale: 0.03,
    color: 0x805130,
    roughness: 0.8,
  });
  const ironMat = new THREE.MeshStandardMaterial({
    color: 0x2c2b29,
    roughness: 0.42,
    metalness: 0.78,
  });

  // Trough base & walls
  const tBase = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.16, 1.05), troughMat);
  tBase.position.y = 0.08;
  fountainGroup.add(tBase);

  const wallFront = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.56, 0.12), troughMat);
  wallFront.position.set(0, 0.36, 0.465);
  const wallBack = wallFront.clone();
  wallBack.position.z = -0.465;
  const wallLeft = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.56, 0.85), troughMat);
  wallLeft.position.set(-0.99, 0.36, 0);
  const wallRight = wallLeft.clone();
  wallRight.position.x = 0.99;
  fountainGroup.add(wallFront, wallBack, wallLeft, wallRight);

  // Iron bands
  const band = new THREE.Mesh(new THREE.BoxGeometry(2.14, 0.06, 1.09), ironMat);
  band.position.y = 0.52;
  fountainGroup.add(band);

  // Fountain post & brass spout
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.26, 1.45, 0.26), troughMat);
  post.position.set(0, 0.725, -0.58);
  const postCap = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.22, 4), troughMat);
  postCap.rotation.y = Math.PI / 4;
  postCap.position.set(0, 1.56, -0.58);
  const brassSpout = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.035, 0.36, 10),
    new THREE.MeshStandardMaterial({ color: 0xc9963b, metalness: 0.85, roughness: 0.26 }),
  );
  brassSpout.rotation.x = Math.PI / 2;
  brassSpout.position.set(0, 0.96, -0.35);
  fountainGroup.add(post, postCap, brassSpout);

  // Shimmering alpine water surface & falling water stream
  const waterMat = new THREE.MeshPhysicalMaterial({
    color: 0x76b8c4,
    roughness: 0.12,
    metalness: 0.05,
    clearcoat: 1.0,
    transparent: true,
    opacity: 0.84,
  });
  const waterMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.86, 0.82), waterMat);
  waterMesh.rotation.x = -Math.PI / 2;
  waterMesh.position.y = 0.55;
  const streamMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.028, 0.42, 8),
    waterMat,
  );
  streamMesh.position.set(0, 0.75, -0.18);
  fountainGroup.add(waterMesh, streamMesh);

  fountainGroup.traverse((c) => {
    if ((c as THREE.Mesh).isMesh) {
      c.castShadow = true;
      c.receiveShadow = true;
    }
  });
  envGroup.add(fountainGroup);

  // 6. Warm Timber Village Lantern Posts Along the Lane
  const lanternPositions = [
    { z: 13.0, side: -1 },
    { z: 5.5, side: 1 },
    { z: -6.5, side: -1 },
    { z: -18.5, side: 1 },
  ];
  const lanternGlassMat = new THREE.MeshStandardMaterial({
    color: 0xffd580,
    emissive: 0xff9f38,
    emissiveIntensity: 1.2,
    roughness: 0.25,
  });

  for (const lp of lanternPositions) {
    const lGroup = new THREE.Group();
    const x = laneCenterX(lp.z) + lp.side * (LANE_HALF_WIDTH + 0.55);
    const y = groundHeightAt(x, lp.z);
    lGroup.position.set(x, y, lp.z);

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 2.7, 8), troughMat);
    pole.position.y = 1.35;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.07, 0.07), ironMat);
    arm.position.set(-lp.side * 0.2, 2.55, 0);
    const cage = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.1, 0.28, 6), lanternGlassMat);
    cage.position.set(-lp.side * 0.38, 2.38, 0);
    const hood = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.14, 6), ironMat);
    hood.position.set(-lp.side * 0.38, 2.56, 0);

    lGroup.add(pole, arm, cage, hood);
    lGroup.traverse((c) => {
      if ((c as THREE.Mesh).isMesh) c.castShadow = true;
    });
    envGroup.add(lGroup);
  }

  scene.add(envGroup);

  return {
    update: (simTime: number) => {
      waterMesh.position.y = 0.55 + Math.sin(simTime * 2.8) * 0.006;
      streamMesh.scale.x = 0.92 + Math.sin(simTime * 7.5) * 0.08;
      streamMesh.scale.z = 0.92 + Math.cos(simTime * 7.5) * 0.08;
    },
  };
}
