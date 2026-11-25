// Shared PBR frosted-medical-glass materials, Fresnel silhouette shell shader,
// luminous medical studio lighting, soft contact shadow and particle-flow helpers.

export const PALETTE = {
  bg: 0xeef5f7,
  teal: 0x0f766e,
  tealDeep: 0x0b5550,
  tealLight: 0x2fb3a7,
  mint: 0x6ec9bf,
  venous: 0x3b76a3,
  venousBright: 0x5ba3d9,
  arterial: 0xcf564e,
  arterialBright: 0xe8736a,
  coral: 0xd97365,
  liver: 0xb9624c,
  amber: 0xcf7f32,
  gold: 0xd99e44,
  ivory: 0xe9eef1,
  slate: 0x647a88,
  glassShell: 0xc9dce3,
};

function createSoftShadowTexture(THREE) {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const grad = ctx.createRadialGradient(size / 2, size / 2, size * 0.06, size / 2, size / 2, size * 0.48);
    grad.addColorStop(0, "rgba(25, 58, 70, 0.22)");
    grad.addColorStop(0.45, "rgba(35, 76, 88, 0.11)");
    grad.addColorStop(0.78, "rgba(45, 92, 102, 0.03)");
    grad.addColorStop(1, "rgba(45, 92, 102, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export function setupStudio(THREE, RoomEnvironment, scene, renderer) {
  // Transparent WebGL clear so CSS radial medical studio backdrop shines smoothly behind
  scene.background = null;
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.045).texture;
  scene.environment = envTexture;
  scene.environmentIntensity = 0.72;

  // Sculpted 3-point medical studio lighting for crisp anatomical relief
  const hemi = new THREE.HemisphereLight(0xf8fcfd, 0xbfd4dc, 0.92);
  hemi.position.set(0, 8, 0);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xfffaf5, 1.55);
  key.position.set(4.5, 6.8, 5.8);
  scene.add(key);

  const rim = new THREE.DirectionalLight(0x7be0d6, 1.15);
  rim.position.set(-5.2, 3.4, -4.4);
  scene.add(rim);

  const backFill = new THREE.DirectionalLight(0xcfe4f0, 0.65);
  backFill.position.set(2.8, -2.5, -5.2);
  scene.add(backFill);

  const warmBounce = new THREE.DirectionalLight(0xffe7d8, 0.42);
  warmBounce.position.set(-2.5, -4.5, 3.6);
  scene.add(warmBounce);

  // Soft Gaussian contact shadow + faint concentric studio platform ring
  const shadowTex = createSoftShadowTexture(THREE);
  const pedestal = new THREE.Group();
  const discGeo = new THREE.PlaneGeometry(4.4, 4.4);
  const discMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    depthWrite: false,
  });
  const disc = new THREE.Mesh(discGeo, discMat);
  disc.rotation.x = -Math.PI / 2;
  pedestal.add(disc);

  const ringGeo = new THREE.RingGeometry(1.52, 1.55, 72);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x7da4ae,
    transparent: true,
    opacity: 0.22,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.005;
  pedestal.add(ring);

  pedestal.position.y = -2.1;
  scene.add(pedestal);

  return {
    pedestal,
    dispose() {
      shadowTex.dispose();
      envTexture.dispose();
      pmrem.dispose();
    },
  };
}

/**
 * Custom Fresnel X-ray / medical frosted-glass shell shader.
 * Crystal-clear in the center so internal anatomical organs remain sharp,
 * with a crisp cool-teal/slate grazing rim contour so the silhouette never washes out.
 */
export function makeFresnelShell(THREE, {
  rimColor = 0x2c6f7a,
  coreColor = 0xdbe9ee,
  rimPower = 2.05,
  rimStrength = 0.66,
  baseOpacity = 0.065,
  side = THREE.FrontSide,
} = {}) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side,
    uniforms: {
      uRimColor: { value: new THREE.Color(rimColor) },
      uCoreColor: { value: new THREE.Color(coreColor) },
      uRimPower: { value: rimPower },
      uRimStrength: { value: rimStrength },
      uBaseOpacity: { value: baseOpacity },
    },
    vertexShader: /* glsl */ `
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      varying vec3 vWorldPos;
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vNormalView = normalize(normalMatrix * normal);
        vViewDir = normalize(-mvPosition.xyz);
        vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uRimColor;
      uniform vec3 uCoreColor;
      uniform float uRimPower;
      uniform float uRimStrength;
      uniform float uBaseOpacity;
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      varying vec3 vWorldPos;
      void main() {
        vec3 n = normalize(vNormalView);
        if (!gl_FrontFacing) n = -n;
        float ndotv = clamp(abs(dot(n, normalize(vViewDir))), 0.0, 1.0);
        float fresnel = pow(1.0 - ndotv, uRimPower);
        // Subtle studio top-light shading across clavicles and deltoids
        float topShade = clamp(dot(n, normalize(vec3(0.35, 0.72, 0.58))) * 0.5 + 0.5, 0.0, 1.0);
        vec3 col = mix(uCoreColor * (0.86 + 0.18 * topShade), uRimColor, clamp(fresnel * 1.15, 0.0, 1.0));
        // Subtle specular sheen highlight on shoulders/chest
        vec3 halfVec = normalize(vec3(0.35, 0.65, 0.68) + normalize(vViewDir));
        float spec = pow(clamp(dot(n, halfVec), 0.0, 1.0), 28.0) * 0.22;
        col += vec3(spec);
        float alpha = clamp(uBaseOpacity + fresnel * uRimStrength + spec * 0.25, 0.0, 0.78);
        gl_FragColor = vec4(col, alpha);
      }
    `,
  });
}

/**
 * Rich sculpted anatomical medical-glass material with Fresnel edge accent.
 * Designed for real NIH HuBMAP meshes so crevices, lobes and vessels read crisply.
 */
export function makeOrganMaterial(THREE, color, options = {}) {
  const mat = new THREE.MeshPhysicalMaterial({
    color,
    roughness: options.roughness ?? 0.32,
    metalness: options.metalness ?? 0.02,
    clearcoat: options.clearcoat ?? 0.68,
    clearcoatRoughness: options.clearcoatRoughness ?? 0.18,
    sheen: options.sheen ?? 0.45,
    sheenRoughness: options.sheenRoughness ?? 0.42,
    sheenColor: new THREE.Color(options.sheenColor ?? 0xffffff),
    transparent: options.transparent ?? true,
    opacity: options.opacity ?? 0.94,
    emissive: new THREE.Color(options.emissive ?? color),
    emissiveIntensity: options.emissiveIntensity ?? 0.08,
    side: options.side ?? THREE.FrontSide,
    depthWrite: options.depthWrite ?? true,
  });
  return mat;
}

export function makeGlass(THREE, color, options = {}) {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: options.roughness ?? 0.24,
    metalness: options.metalness ?? 0.02,
    transmission: options.transmission ?? 0.35,
    thickness: options.thickness ?? 0.75,
    ior: options.ior ?? 1.42,
    clearcoat: options.clearcoat ?? 0.8,
    clearcoatRoughness: options.clearcoatRoughness ?? 0.15,
    sheen: options.sheen ?? 0.3,
    sheenColor: new THREE.Color(0xffffff),
    transparent: true,
    opacity: options.opacity ?? 0.86,
    emissive: new THREE.Color(options.emissive ?? color),
    emissiveIntensity: options.emissiveIntensity ?? 0.07,
    side: options.side ?? THREE.FrontSide,
    depthWrite: options.depthWrite ?? true,
  });
}

export function makeCeramic(THREE, color, options = {}) {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: options.roughness ?? 0.34,
    metalness: options.metalness ?? 0.04,
    clearcoat: options.clearcoat ?? 0.55,
    clearcoatRoughness: options.clearcoatRoughness ?? 0.22,
    transparent: options.transparent ?? false,
    opacity: options.opacity ?? 1,
    emissive: new THREE.Color(options.emissive ?? color),
    emissiveIntensity: options.emissiveIntensity ?? 0.04,
    side: options.side ?? THREE.FrontSide,
    depthWrite: options.depthWrite ?? true,
  });
}

export function makeGlow(THREE, color, opacity = 0.95) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: new THREE.Color(color),
    emissiveIntensity: 0.72,
    roughness: 0.18,
    metalness: 0.05,
    transparent: opacity < 1,
    opacity,
  });
}

export function createCurveFlow(THREE, points, {
  radius = 0.058,
  tubeColor = PALETTE.teal,
  particleColor = PALETTE.tealLight,
  particleCount = 10,
  particleRadius = 0.055,
  speed = 0.26,
  closed = false,
} = {}) {
  const curve = new THREE.CatmullRomCurve3(
    points.map((p) => (Array.isArray(p) ? new THREE.Vector3(...p) : p)),
    closed,
  );
  const group = new THREE.Group();
  const tubeGeo = new THREE.TubeGeometry(curve, 56, radius, 14, closed);
  const tubeMat = new THREE.MeshPhysicalMaterial({
    color: tubeColor,
    roughness: 0.24,
    metalness: 0.02,
    clearcoat: 0.72,
    transparent: true,
    opacity: 0.26,
    emissive: new THREE.Color(tubeColor),
    emissiveIntensity: 0.12,
    depthWrite: false,
  });
  const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
  group.add(tubeMesh);

  const sphereGeo = new THREE.SphereGeometry(particleRadius, 14, 12);
  const sphereMat = makeGlow(THREE, particleColor, 0.96);
  const particles = [];
  for (let i = 0; i < particleCount; i++) {
    const mesh = new THREE.Mesh(sphereGeo, sphereMat);
    const offset = i / particleCount;
    const pos = curve.getPointAt(offset);
    mesh.position.copy(pos);
    group.add(mesh);
    particles.push({ mesh, offset });
  }

  let phase = 0;
  let active = false;

  return {
    group,
    curve,
    setActive(isActive) {
      active = Boolean(isActive);
      tubeMat.opacity = active ? 0.62 : 0.14;
      tubeMat.emissiveIntensity = active ? 0.42 : 0.04;
      sphereMat.emissiveIntensity = active ? 1.05 : 0.18;
      sphereMat.opacity = active ? 1 : 0.28;
    },
    tick(dt, reducedMotion = false) {
      const rate = active ? speed : speed * 0.3;
      if (!reducedMotion) phase = (phase + dt * rate) % 1;
      for (let i = 0; i < particles.length; i++) {
        const t = (particles[i].offset + phase) % 1;
        curve.getPointAt(t, particles[i].mesh.position);
        const s = active ? 1.16 : 0.68;
        particles[i].mesh.scale.setScalar(s);
      }
    },
  };
}

export function tagPickable(object, partId) {
  object.userData.partId = partId;
  object.traverse((child) => {
    child.userData.partId = partId;
  });
  return object;
}

export function disposeObject(root) {
  if (!root) return;
  const geometries = new Set();
  const materials = new Set();
  root.traverse((child) => {
    if (child.geometry) geometries.add(child.geometry);
    if (child.material) {
      if (Array.isArray(child.material)) child.material.forEach((m) => materials.add(m));
      else materials.add(child.material);
    }
  });
  geometries.forEach((geo) => geo.dispose());
  materials.forEach((mat) => {
    for (const value of Object.values(mat)) {
      if (value && typeof value.dispose === "function") value.dispose();
    }
    mat.dispose();
  });
}
