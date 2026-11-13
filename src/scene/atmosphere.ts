import * as THREE from 'three';

export interface AtmosphereRig {
  update: (simTime: number, sunIntensity: number) => void;
  setSunDirection: (dir: THREE.Vector3) => void;
}

export function createAtmosphere(
  scene: THREE.Scene,
  dustSpriteMap: THREE.Texture,
  sunDirection: THREE.Vector3,
): AtmosphereRig {
  // 1. Painterly Golden-Hour Alpine Sky Dome
  const skyGeo = new THREE.SphereGeometry(260, 32, 20);
  const skyUniforms = {
    uSunDir: { value: sunDirection.clone().normalize() },
    uHorizonColor: { value: new THREE.Color(0xf7be86) },
    uMidSkyColor: { value: new THREE.Color(0x95b8d9) },
    uZenithColor: { value: new THREE.Color(0x527ea8) },
    uSunGlowColor: { value: new THREE.Color(0xffe7b3) },
    uWarmth: { value: 1.0 },
  };

  const skyMat = new THREE.ShaderMaterial({
    uniforms: skyUniforms,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    vertexShader: `
      varying vec3 vWorldDir;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldDir = normalize(position);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform vec3 uSunDir;
      uniform vec3 uHorizonColor;
      uniform vec3 uMidSkyColor;
      uniform vec3 uZenithColor;
      uniform vec3 uSunGlowColor;
      uniform float uWarmth;
      varying vec3 vWorldDir;

      void main() {
        vec3 dir = normalize(vWorldDir);
        float h = clamp(dir.y, 0.0, 1.0);
        vec3 sky = mix(uHorizonColor, uMidSkyColor, smoothstep(0.0, 0.34, h));
        sky = mix(sky, uZenithColor, smoothstep(0.28, 0.85, h));

        float sunDot = max(dot(dir, normalize(uSunDir)), 0.0);
        float sunHalo = pow(sunDot, 10.0) * 0.42 * uWarmth;
        float sunDisc = smoothstep(0.9965, 0.9992, sunDot) * 1.4;
        sky += uSunGlowColor * (sunHalo + sunDisc);

        // Soft warm morning haze near horizon
        float haze = pow(1.0 - h, 5.0) * 0.25 * uWarmth;
        sky = mix(sky, uHorizonColor * 1.06, haze);

        gl_FragColor = vec4(sky, 1.0);
      }
    `,
  });

  const skyMesh = new THREE.Mesh(skyGeo, skyMat);
  scene.add(skyMesh);

  // 2. Distant Snow-Capped Swiss Alpine Mountain Range Ring
  const mountainGroup = new THREE.Group();
  const radialSegs = 96;
  const ringGeo = new THREE.BufferGeometry();
  const verts: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  const ridgeRadius = 155;
  const baseRadius = 195;

  const colValley = new THREE.Color(0x556780);
  const colRock = new THREE.Color(0x736c7a);
  const colSnow = new THREE.Color(0xfff1dc); // Warm golden-hour snow

  for (let i = 0; i <= radialSegs; i++) {
    const a = (i / radialSegs) * Math.PI * 2;
    const cosA = Math.cos(a);
    const sinA = Math.sin(a);

    // Sculpted jagged Alpine peaks, tallest in the -Z vista ahead of the lane
    const vistaBoost = Math.max(0, -sinA) * 18;
    const peakNoise =
      Math.sin(a * 5.0) * 9.0 +
      Math.cos(a * 11.0 + 0.7) * 6.5 +
      Math.sin(a * 19.0 + 1.4) * 3.5;
    const peakH = Math.max(12, 26 + vistaBoost + peakNoise);

    // Base ring vertex
    verts.push(cosA * baseRadius, -6, sinA * baseRadius);
    colors.push(colValley.r, colValley.g, colValley.b);

    // Mid-slope rock vertex
    const midR = (baseRadius + ridgeRadius) * 0.5;
    verts.push(cosA * midR, peakH * 0.48, sinA * midR);
    colors.push(colRock.r, colRock.g, colRock.b);

    // Ridge snow peak vertex
    verts.push(cosA * ridgeRadius, peakH, sinA * ridgeRadius);
    const snowMix = THREE.MathUtils.smoothstep(peakH, 20, 34);
    const c = colRock.clone().lerp(colSnow, snowMix);
    colors.push(c.r, c.g, c.b);
  }

  for (let i = 0; i < radialSegs; i++) {
    const r0 = i * 3;
    const r1 = (i + 1) * 3;
    // Lower slope
    indices.push(r0, r1, r0 + 1, r1, r1 + 1, r0 + 1);
    // Upper snow ridge
    indices.push(r0 + 1, r1 + 1, r0 + 2, r1 + 1, r1 + 2, r0 + 2);
  }

  ringGeo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  ringGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  ringGeo.setIndex(indices);
  ringGeo.computeVertexNormals();

  const mountainMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.88,
    metalness: 0.0,
    flatShading: true,
    side: THREE.DoubleSide,
  });
  const mountains = new THREE.Mesh(ringGeo, mountainMat);
  mountainGroup.add(mountains);
  scene.add(mountainGroup);

  // 3. Volumetric Golden-Hour Sunbeam Shafts Slanting Across the Lane
  const beamMat = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(0xffd78e) },
      uTime: { value: 0 },
      uIntensity: { value: 0.34 },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormalV;
      varying vec3 vViewDir;
      void main() {
        vUv = uv;
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vNormalV = normalize(normalMatrix * normal);
        vViewDir = normalize(-mvPos.xyz);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uTime;
      uniform float uIntensity;
      varying vec2 vUv;
      varying vec3 vNormalV;
      varying vec3 vViewDir;

      void main() {
        float edgeFade = pow(abs(dot(vNormalV, vViewDir)), 1.45);
        float verticalFade = smoothstep(0.0, 0.2, vUv.y) * smoothstep(1.0, 0.12, vUv.y);
        float shimmer = 0.85 + 0.15 * sin(vUv.x * 12.0 + uTime * 0.45);
        float alpha = edgeFade * verticalFade * shimmer * uIntensity;
        gl_FragColor = vec4(uColor, alpha);
      }
    `,
  });

  const beamGroup = new THREE.Group();
  const beamConfigs = [
    { x: -1.4, y: 4.9, z: 9.8, rTop: 0.65, rBot: 2.8, h: 12.5 },
    { x: 0.2, y: 5.2, z: 3.5, rTop: 0.8, rBot: 3.2, h: 13.5 },
    { x: -0.6, y: 5.5, z: -5.5, rTop: 0.9, rBot: 3.5, h: 14.5 },
    { x: 0.8, y: 5.9, z: -15.5, rTop: 0.9, rBot: 3.5, h: 15.0 },
  ];

  const beamQuat = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    sunDirection.clone().normalize(),
  );

  for (const cfg of beamConfigs) {
    const geo = new THREE.CylinderGeometry(cfg.rTop, cfg.rBot, cfg.h, 16, 1, true);
    const beam = new THREE.Mesh(geo, beamMat);
    beam.position.set(cfg.x, cfg.y, cfg.z);
    beam.quaternion.copy(beamQuat);
    beam.renderOrder = 5;
    beamGroup.add(beam);
  }
  scene.add(beamGroup);

  // 4. Slow-Motion Floating Golden Dust Motes
  const dustCount = 420;
  const dustPositions = new Float32Array(dustCount * 3);
  const dustBase = new Float32Array(dustCount * 3);
  const dustPhases = new Float32Array(dustCount);

  let rngSeed = 88213;
  const nextRand = () => {
    rngSeed = (rngSeed * 1664525 + 1013904223) >>> 0;
    return rngSeed / 4294967296;
  };

  for (let i = 0; i < dustCount; i++) {
    const x = (nextRand() - 0.5) * 18;
    const y = 0.6 + nextRand() * 6.5;
    const z = -28 + nextRand() * 48;
    dustBase[i * 3] = dustPositions[i * 3] = x;
    dustBase[i * 3 + 1] = dustPositions[i * 3 + 1] = y;
    dustBase[i * 3 + 2] = dustPositions[i * 3 + 2] = z;
    dustPhases[i] = nextRand() * Math.PI * 2;
  }

  const dustGeo = new THREE.BufferGeometry();
  const dustAttr = new THREE.BufferAttribute(dustPositions, 3);
  dustGeo.setAttribute('position', dustAttr);

  const dustMat = new THREE.PointsMaterial({
    map: dustSpriteMap,
    color: 0xffe4a8,
    size: 0.16,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });

  const dustPoints = new THREE.Points(dustGeo, dustMat);
  dustPoints.renderOrder = 6;
  scene.add(dustPoints);

  // 5. Gentle Chimney Smoke Puffs Rising from Bakery & Chalet Chimneys
  const smokeGroup = new THREE.Group();
  const smokeMat = new THREE.MeshStandardMaterial({
    color: 0xf7eee3,
    roughness: 1.0,
    metalness: 0.0,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
  });
  const smokeGeo = new THREE.SphereGeometry(0.32, 10, 8);
  const smokeSources = [
    new THREE.Vector3(-8.2, 8.2, 10.5),
    new THREE.Vector3(7.6, 8.4, 2.5),
    new THREE.Vector3(-8.4, 8.6, -13.5),
  ];
  const puffs: { mesh: THREE.Mesh; sourceIdx: number; offset: number }[] = [];
  for (let s = 0; s < smokeSources.length; s++) {
    for (let k = 0; k < 5; k++) {
      const m = new THREE.Mesh(smokeGeo, smokeMat);
      smokeGroup.add(m);
      puffs.push({ mesh: m, sourceIdx: s, offset: k / 5 });
    }
  }
  scene.add(smokeGroup);

  return {
    setSunDirection: (dir: THREE.Vector3) => {
      skyUniforms.uSunDir.value.copy(dir).normalize();
    },
    update: (simTime: number, sunIntensity: number) => {
      beamMat.uniforms.uTime.value = simTime;
      beamMat.uniforms.uIntensity.value = 0.22 * sunIntensity;
      skyUniforms.uWarmth.value = 0.75 + 0.35 * sunIntensity;

      // Lazy slow-motion floating dust motes
      for (let i = 0; i < dustCount; i++) {
        const ph = dustPhases[i];
        dustPositions[i * 3] = dustBase[i * 3] + Math.sin(simTime * 0.28 + ph) * 0.45;
        dustPositions[i * 3 + 1] =
          dustBase[i * 3 + 1] + Math.sin(simTime * 0.22 + ph * 1.3) * 0.28;
        dustPositions[i * 3 + 2] =
          dustBase[i * 3 + 2] + Math.cos(simTime * 0.25 + ph * 0.7) * 0.4;
      }
      dustAttr.needsUpdate = true;

      // Rising morning chimney smoke
      for (const p of puffs) {
        const src = smokeSources[p.sourceIdx];
        const age = ((simTime * 0.085 + p.offset) % 1 + 1) % 1;
        p.mesh.position.set(
          src.x + Math.sin(age * 4 + p.offset * 6) * 0.35 + age * 0.65,
          src.y + age * 3.8,
          src.z + Math.cos(age * 3 + p.offset * 5) * 0.25 - age * 0.4,
        );
        const s = 0.55 + age * 1.55;
        p.mesh.scale.setScalar(s);
      }
    },
  };
}
