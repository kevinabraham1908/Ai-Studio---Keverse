import * as THREE from 'three';

export interface TextureBundle {
  cobbleMap: THREE.CanvasTexture;
  cobbleBump: THREE.CanvasTexture;
  cobbleRoughness: THREE.CanvasTexture;
  woodMap: THREE.CanvasTexture;
  woodBump: THREE.CanvasTexture;
  plasterMap: THREE.CanvasTexture;
  plasterBump: THREE.CanvasTexture;
  roofMap: THREE.CanvasTexture;
  roofBump: THREE.CanvasTexture;
  meadowMap: THREE.CanvasTexture;
  contactShadowMap: THREE.CanvasTexture;
  dustSpriteMap: THREE.CanvasTexture;
  bakerySignMap: THREE.CanvasTexture;
  dispose: () => void;
}

function makeRng(seedStart: number) {
  let s = seedStart >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function configureTexture(
  canvas: HTMLCanvasElement,
  isColor: boolean,
  anisotropy: number,
  repeatX = 1,
  repeatY = 1,
  repeat = true,
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.wrapS = repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  tex.wrapT = repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = anisotropy;
  tex.needsUpdate = true;
  return tex;
}

function createCobblestoneTextures(anisotropy: number) {
  const size = 512;
  const colorCanvas = document.createElement('canvas');
  const bumpCanvas = document.createElement('canvas');
  const roughCanvas = document.createElement('canvas');
  colorCanvas.width = bumpCanvas.width = roughCanvas.width = size;
  colorCanvas.height = bumpCanvas.height = roughCanvas.height = size;

  const cCtx = colorCanvas.getContext('2d')!;
  const bCtx = bumpCanvas.getContext('2d')!;
  const rCtx = roughCanvas.getContext('2d')!;

  // Warm shadowed mortar seams
  cCtx.fillStyle = '#4e4338';
  cCtx.fillRect(0, 0, size, size);
  bCtx.fillStyle = '#1e1e1e';
  bCtx.fillRect(0, 0, size, size);
  rCtx.fillStyle = '#ececec';
  rCtx.fillRect(0, 0, size, size);

  const rng = makeRng(104729);
  const rows = 10;
  const cols = 10;
  const cellW = size / cols;
  const cellH = size / rows;

  const palette = [
    [164, 148, 132],
    [148, 136, 122],
    [176, 156, 134],
    [138, 129, 118],
    [158, 140, 120],
  ];

  const drawRoundedStone = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    rad: number,
  ) => {
    const hw = w * 0.5;
    const hh = h * 0.5;
    ctx.beginPath();
    ctx.moveTo(-hw + rad, -hh);
    ctx.lineTo(hw - rad, -hh);
    ctx.quadraticCurveTo(hw, -hh, hw, -hh + rad);
    ctx.lineTo(hw, hh - rad);
    ctx.quadraticCurveTo(hw, hh, hw - rad, hh);
    ctx.lineTo(-hw + rad, hh);
    ctx.quadraticCurveTo(-hw, hh, -hw, hh - rad);
    ctx.lineTo(-hw, -hh + rad);
    ctx.quadraticCurveTo(-hw, -hh, -hw + rad, -hh);
    ctx.closePath();
  };

  for (let row = 0; row < rows; row++) {
    const offset = (row % 2) * (cellW * 0.48);
    for (let col = -1; col <= cols; col++) {
      const cx = col * cellW + offset + cellW * 0.5 + (rng() - 0.5) * 3.5;
      const cy = row * cellH + cellH * 0.5 + (rng() - 0.5) * 3.5;
      const sw = cellW * (0.86 + rng() * 0.08);
      const sh = cellH * (0.84 + rng() * 0.08);
      const cornerR = Math.min(sw, sh) * (0.28 + rng() * 0.12);
      const rot = (rng() - 0.5) * 0.14;

      const base = palette[Math.floor(rng() * palette.length)];
      const warmShift = Math.floor((rng() - 0.5) * 20);
      const r = Math.min(255, Math.max(0, base[0] + warmShift));
      const g = Math.min(255, Math.max(0, base[1] + warmShift));
      const b = Math.min(255, Math.max(0, base[2] + warmShift - 4));

      for (const ox of [-size, 0, size]) {
        for (const oy of [-size, 0, size]) {
          const px = cx + ox;
          const py = cy + oy;
          if (px < -cellW || px > size + cellW || py < -cellH || py > size + cellH) {
            continue;
          }

          cCtx.save();
          cCtx.translate(px, py);
          cCtx.rotate(rot);
          const grad = cCtx.createRadialGradient(-sw * 0.15, -sh * 0.15, 2, 0, 0, Math.max(sw, sh) * 0.65);
          grad.addColorStop(0, `rgb(${Math.min(255, r + 18)}, ${Math.min(255, g + 15)}, ${Math.min(255, b + 12)})`);
          grad.addColorStop(0.72, `rgb(${r}, ${g}, ${b})`);
          grad.addColorStop(1, `rgb(${Math.max(0, r - 28)}, ${Math.max(0, g - 26)}, ${Math.max(0, b - 24)})`);
          cCtx.fillStyle = grad;
          drawRoundedStone(cCtx, sw, sh, cornerR);
          cCtx.fill();
          cCtx.restore();

          bCtx.save();
          bCtx.translate(px, py);
          bCtx.rotate(rot);
          const bGrad = bCtx.createRadialGradient(0, 0, 2, 0, 0, Math.max(sw, sh) * 0.6);
          bGrad.addColorStop(0, '#f0f0f0');
          bGrad.addColorStop(0.75, '#c6c6c6');
          bGrad.addColorStop(1, '#323232');
          bCtx.fillStyle = bGrad;
          drawRoundedStone(bCtx, sw, sh, cornerR);
          bCtx.fill();
          bCtx.restore();

          rCtx.save();
          rCtx.translate(px, py);
          rCtx.rotate(rot);
          const dew = Math.floor(95 + rng() * 50);
          rCtx.fillStyle = `rgb(${dew}, ${dew}, ${dew})`;
          drawRoundedStone(rCtx, sw * 0.88, sh * 0.88, cornerR);
          rCtx.fill();
          rCtx.restore();
        }
      }
    }
  }

  for (let i = 0; i < 180; i++) {
    cCtx.fillStyle = `rgba(92, 112, 62, ${0.12 + rng() * 0.14})`;
    cCtx.beginPath();
    cCtx.arc(rng() * size, rng() * size, 1.5 + rng() * 2.5, 0, Math.PI * 2);
    cCtx.fill();
  }

  return {
    cobbleMap: configureTexture(colorCanvas, true, anisotropy, 3.0, 28),
    cobbleBump: configureTexture(bumpCanvas, false, anisotropy, 3.0, 28),
    cobbleRoughness: configureTexture(roughCanvas, false, anisotropy, 3.0, 28),
  };
}

function createWoodTextures(anisotropy: number) {
  const size = 512;
  const colorCanvas = document.createElement('canvas');
  const bumpCanvas = document.createElement('canvas');
  colorCanvas.width = bumpCanvas.width = size;
  colorCanvas.height = bumpCanvas.height = size;
  const cCtx = colorCanvas.getContext('2d')!;
  const bCtx = bumpCanvas.getContext('2d')!;

  cCtx.fillStyle = '#c48d5a';
  cCtx.fillRect(0, 0, size, size);
  bCtx.fillStyle = '#888888';
  bCtx.fillRect(0, 0, size, size);

  const rng = makeRng(7719);
  const planks = 6;
  const plankH = size / planks;

  for (let p = 0; p < planks; p++) {
    const y0 = p * plankH;
    const tone = (rng() - 0.5) * 20;
    cCtx.fillStyle = `rgb(${192 + tone}, ${138 + tone * 0.7}, ${88 + tone * 0.5})`;
    cCtx.fillRect(0, y0, size, plankH);

    // Painterly grain streaks
    for (let g = 0; g < 44; g++) {
      const gy = y0 + rng() * plankH;
      const alpha = 0.06 + rng() * 0.1;
      cCtx.strokeStyle = rng() > 0.4 ? `rgba(92, 52, 24, ${alpha})` : `rgba(235, 195, 145, ${alpha})`;
      cCtx.lineWidth = 1 + rng() * 2.4;
      cCtx.beginPath();
      cCtx.moveTo(0, gy);
      cCtx.bezierCurveTo(
        size * 0.33,
        gy + (rng() - 0.5) * 7,
        size * 0.66,
        gy + (rng() - 0.5) * 7,
        size,
        gy,
      );
      cCtx.stroke();

      bCtx.strokeStyle = `rgba(110, 110, 110, ${alpha * 1.4})`;
      bCtx.lineWidth = 1 + rng() * 1.6;
      bCtx.beginPath();
      bCtx.moveTo(0, gy);
      bCtx.lineTo(size, gy);
      bCtx.stroke();
    }

    // Plank seam
    cCtx.fillStyle = 'rgba(58, 32, 16, 0.55)';
    cCtx.fillRect(0, y0, size, 3);
    bCtx.fillStyle = '#2a2a2a';
    bCtx.fillRect(0, y0, size, 3);
  }

  return {
    woodMap: configureTexture(colorCanvas, true, anisotropy, 2, 2),
    woodBump: configureTexture(bumpCanvas, false, anisotropy, 2, 2),
  };
}

function createPlasterTextures(anisotropy: number) {
  const size = 256;
  const colorCanvas = document.createElement('canvas');
  const bumpCanvas = document.createElement('canvas');
  colorCanvas.width = bumpCanvas.width = size;
  colorCanvas.height = bumpCanvas.height = size;
  const cCtx = colorCanvas.getContext('2d')!;
  const bCtx = bumpCanvas.getContext('2d')!;

  cCtx.fillStyle = '#f5eedc';
  cCtx.fillRect(0, 0, size, size);
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, size, size);

  const rng = makeRng(3312);
  for (let i = 0; i < 650; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const rad = 3 + rng() * 14;
    const shade = rng() > 0.5 ? 255 : 220;
    cCtx.fillStyle = `rgba(${shade}, ${shade - 8}, ${shade - 22}, 0.07)`;
    cCtx.beginPath();
    cCtx.arc(x, y, rad, 0, Math.PI * 2);
    cCtx.fill();

    const bVal = Math.floor(112 + rng() * 34);
    bCtx.fillStyle = `rgba(${bVal}, ${bVal}, ${bVal}, 0.14)`;
    bCtx.beginPath();
    bCtx.arc(x, y, rad * 0.7, 0, Math.PI * 2);
    bCtx.fill();
  }

  return {
    plasterMap: configureTexture(colorCanvas, true, anisotropy, 2, 2),
    plasterBump: configureTexture(bumpCanvas, false, anisotropy, 2, 2),
  };
}

function createRoofTextures(anisotropy: number) {
  const size = 256;
  const colorCanvas = document.createElement('canvas');
  const bumpCanvas = document.createElement('canvas');
  colorCanvas.width = bumpCanvas.width = size;
  colorCanvas.height = bumpCanvas.height = size;
  const cCtx = colorCanvas.getContext('2d')!;
  const bCtx = bumpCanvas.getContext('2d')!;

  cCtx.fillStyle = '#75503b';
  cCtx.fillRect(0, 0, size, size);
  bCtx.fillStyle = '#707070';
  bCtx.fillRect(0, 0, size, size);

  const rng = makeRng(9021);
  const rows = 8;
  const cols = 8;
  const w = size / cols;
  const h = size / rows;

  for (let r = 0; r < rows; r++) {
    const off = (r % 2) * (w * 0.5);
    for (let c = -1; c <= cols; c++) {
      const x = c * w + off;
      const y = r * h;
      const d = (rng() - 0.5) * 24;
      cCtx.fillStyle = `rgb(${124 + d}, ${84 + d * 0.7}, ${64 + d * 0.5})`;
      cCtx.fillRect(x + 1, y + 1, w - 2, h - 2);

      // Shingle bottom shadow
      cCtx.fillStyle = 'rgba(34, 20, 14, 0.42)';
      cCtx.fillRect(x, y + h - 4, w, 4);

      bCtx.fillStyle = '#b4b4b4';
      bCtx.fillRect(x + 1, y + 1, w - 2, h - 4);
      bCtx.fillStyle = '#2d2d2d';
      bCtx.fillRect(x, y + h - 3, w, 3);
    }
  }

  return {
    roofMap: configureTexture(colorCanvas, true, anisotropy, 4, 4),
    roofBump: configureTexture(bumpCanvas, false, anisotropy, 4, 4),
  };
}

function createMeadowTexture(anisotropy: number) {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#6c8d45';
  ctx.fillRect(0, 0, size, size);

  const rng = makeRng(5193);
  for (let i = 0; i < 1600; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const g = 118 + Math.floor(rng() * 52);
    const r = 82 + Math.floor(rng() * 44);
    const b = 52 + Math.floor(rng() * 22);
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.28)`;
    ctx.beginPath();
    ctx.ellipse(x, y, 4 + rng() * 14, 2 + rng() * 7, rng() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  // Tiny wildflower flecks (buttercups & clover)
  for (let i = 0; i < 160; i++) {
    ctx.fillStyle = rng() > 0.35 ? 'rgba(255, 224, 112, 0.55)' : 'rgba(255, 248, 240, 0.55)';
    ctx.beginPath();
    ctx.arc(rng() * size, rng() * size, 1.4 + rng() * 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  return configureTexture(canvas, true, anisotropy, 18, 18);
}

function createRadialGlowTexture(innerRgba: string, outerRgba: string) {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, innerRgba);
  grad.addColorStop(0.5, innerRgba.replace(/[\d.]+\)$/, '0.35)'));
  grad.addColorStop(1, outerRgba);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createBakerySignTexture(anisotropy: number) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Warm cream painted signboard with walnut border
  ctx.fillStyle = '#4e2f1b';
  ctx.fillRect(0, 0, 512, 256);
  ctx.fillStyle = '#f8ebd2';
  ctx.fillRect(16, 16, 480, 224);
  ctx.strokeStyle = '#9c5b2b';
  ctx.lineWidth = 6;
  ctx.strokeRect(26, 26, 460, 204);

  // Hand-painted pretzel emblem
  ctx.strokeStyle = '#b96928';
  ctx.lineWidth = 14;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(256, 92, 34, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#4e2c18';
  ctx.font = 'bold 46px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('BÄCKEREI', 256, 194);

  return configureTexture(canvas, true, anisotropy, 1, 1, false);
}

export function createVillageTextures(
  renderer: THREE.WebGLRenderer,
): TextureBundle {
  const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const cobble = createCobblestoneTextures(anisotropy);
  const wood = createWoodTextures(anisotropy);
  const plaster = createPlasterTextures(anisotropy);
  const roof = createRoofTextures(anisotropy);
  const meadowMap = createMeadowTexture(anisotropy);
  const contactShadowMap = createRadialGlowTexture(
    'rgba(28, 18, 12, 0.65)',
    'rgba(28, 18, 12, 0.0)',
  );
  const dustSpriteMap = createRadialGlowTexture(
    'rgba(255, 232, 175, 0.95)',
    'rgba(255, 220, 150, 0.0)',
  );
  const bakerySignMap = createBakerySignTexture(anisotropy);

  const all = [
    cobble.cobbleMap,
    cobble.cobbleBump,
    cobble.cobbleRoughness,
    wood.woodMap,
    wood.woodBump,
    plaster.plasterMap,
    plaster.plasterBump,
    roof.roofMap,
    roof.roofBump,
    meadowMap,
    contactShadowMap,
    dustSpriteMap,
    bakerySignMap,
  ];

  return {
    ...cobble,
    ...wood,
    ...plaster,
    ...roof,
    meadowMap,
    contactShadowMap,
    dustSpriteMap,
    bakerySignMap,
    dispose: () => {
      all.forEach((t) => t.dispose());
    },
  };
}
