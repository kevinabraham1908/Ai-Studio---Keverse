import * as THREE from 'three';

/**
 * Pixar-style soft subsurface skin & organic material.
 * Extends MeshPhysicalMaterial with warm wrap-lighting / translucent peach-amber rim glow
 * via onBeforeCompile so faces, hands, ears, and flower petals feel soft and alive.
 */
export function createSubsurfaceMaterial(options: {
  color: number;
  scatterColor?: number;
  scatterStrength?: number;
  roughness?: number;
  sheen?: number;
  sheenColor?: number;
}): THREE.MeshPhysicalMaterial {
  const scatter = new THREE.Color(options.scatterColor ?? 0xff7b4d);
  const strength = options.scatterStrength ?? 0.32;

  const mat = new THREE.MeshPhysicalMaterial({
    color: options.color,
    roughness: options.roughness ?? 0.56,
    metalness: 0.0,
    sheen: options.sheen ?? 0.45,
    sheenRoughness: 0.65,
    sheenColor: new THREE.Color(options.sheenColor ?? 0xffd5b8),
    clearcoat: 0.06,
    clearcoatRoughness: 0.7,
  });

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uScatterColor = { value: scatter };
    shader.uniforms.uScatterStrength = { value: strength };
    shader.uniforms.uSunDir = { value: new THREE.Vector3(0.55, 0.38, 0.74).normalize() };

    shader.vertexShader =
      `varying vec3 vWorldNormalSSS;\nvarying vec3 vWorldPosSSS;\n` +
      shader.vertexShader.replace(
        '#include <worldpos_vertex>',
        `#include <worldpos_vertex>
         vWorldNormalSSS = normalize(mat3(modelMatrix) * objectNormal);
         vWorldPosSSS = (modelMatrix * vec4(transformed, 1.0)).xyz;`,
      );

    shader.fragmentShader =
      `uniform vec3 uScatterColor;\nuniform float uScatterStrength;\nuniform vec3 uSunDir;\nvarying vec3 vWorldNormalSSS;\nvarying vec3 vWorldPosSSS;\n` +
      shader.fragmentShader.replace(
        '#include <opaque_fragment>',
        `
        vec3 nSSS = normalize(vWorldNormalSSS);
        vec3 vSSS = normalize(cameraPosition - vWorldPosSSS);
        float rimSSS = pow(1.0 - max(dot(nSSS, vSSS), 0.0), 2.3);
        float backLit = clamp(dot(-uSunDir, vSSS) * 0.5 + 0.5, 0.0, 1.0);
        float wrapSun = clamp((dot(nSSS, uSunDir) + 0.45) / 1.45, 0.0, 1.0);
        vec3 sssGlow = uScatterColor * uScatterStrength * (wrapSun * 0.45 + rimSSS * (0.45 + 0.55 * backLit));
        outgoingLight += sssGlow;
        #include <opaque_fragment>
        `,
      );
  };

  mat.customProgramCacheKey = () => `pixar-sss-${strength.toFixed(2)}`;
  return mat;
}

/**
 * Creates a soft contact-shadow disc placed directly below characters and props.
 */
export function createContactShadow(
  shadowTex: THREE.Texture,
  radius: number,
  opacity = 0.42,
): THREE.Mesh {
  const geo = new THREE.CircleGeometry(radius, 24);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    opacity,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 0.02;
  mesh.renderOrder = 2;
  return mesh;
}
