// Shared PBR frosted-medical-glass materials, studio lighting and particle-flow
// helpers for 知愈 Three.js 3D interactive modules. Pure procedural assets with
// zero external binary textures or model licensing dependencies.

export const PALETTE = {
  bg: 0xf4f7f9,
  teal: 0x0f766e,
  tealLight: 0x4fd1c5,
  mint: 0x99e2d8,
  venous: 0x4b83a8,
  arterial: 0xd96b62,
  coral: 0xe68478,
  amber: 0xd98c3f,
  gold: 0xeab66a,
  ivory: 0xf1f5f7,
  slate: 0x94a3b8,
  glassShell: 0xdce9ec,
};

export function setupStudio(THREE, RoomEnvironment, scene, renderer) {
  scene.background = new THREE.Color(PALETTE.bg);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTexture;

  const hemi = new THREE.HemisphereLight(0xffffff, 0xd8e8ea, 1.05);
  hemi.position.set(0, 6, 0);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xffffff, 1.35);
  key.position.set(4.5, 6.5, 5.5);
  scene.add(key);

  const rim = new THREE.DirectionalLight(0xb2ebe4, 0.85);
  rim.position.set(-5, 3, -4);
  scene.add(rim);

  const fill = new THREE.DirectionalLight(0xffe9df, 0.45);
  fill.position.set(0, -4, 4);
  scene.add(fill);

  // Subtle translucent circular pedestal shadow anchor
  const discGeo = new THREE.CircleGeometry(3.2, 48);
  const discMat = new THREE.MeshBasicMaterial({
    color: 0xdbe7ea,
    transparent: true,
    opacity: 0.38,
    depthWrite: false,
  });
  const disc = new THREE.Mesh(discGeo, discMat);
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = -2.25;
  scene.add(disc);

  return {
    pedestal: disc,
    dispose() {
      envTexture.dispose();
      pmrem.dispose();
    },
  };
}

export function makeGlass(THREE, color, options = {}) {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: options.roughness ?? 0.22,
    metalness: options.metalness ?? 0.02,
    transmission: options.transmission ?? 0.48,
    thickness: options.thickness ?? 0.8,
    ior: options.ior ?? 1.42,
    clearcoat: options.clearcoat ?? 0.85,
    clearcoatRoughness: options.clearcoatRoughness ?? 0.14,
    transparent: true,
    opacity: options.opacity ?? 0.86,
    emissive: new THREE.Color(options.emissive ?? color),
    emissiveIntensity: options.emissiveIntensity ?? 0.06,
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
  });
}

export function makeGlow(THREE, color, opacity = 0.95) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: new THREE.Color(color),
    emissiveIntensity: 0.65,
    roughness: 0.2,
    metalness: 0.05,
    transparent: opacity < 1,
    opacity,
  });
}

export function createCurveFlow(THREE, points, {
  radius = 0.065,
  tubeColor = PALETTE.teal,
  particleColor = PALETTE.tealLight,
  particleCount = 10,
  particleRadius = 0.055,
  speed = 0.24,
  closed = false,
} = {}) {
  const curve = new THREE.CatmullRomCurve3(
    points.map(p => (Array.isArray(p) ? new THREE.Vector3(...p) : p)),
    closed,
  );
  const group = new THREE.Group();
  const tubeGeo = new THREE.TubeGeometry(curve, 52, radius, 14, closed);
  const tubeMat = new THREE.MeshPhysicalMaterial({
    color: tubeColor,
    roughness: 0.25,
    metalness: 0.02,
    clearcoat: 0.7,
    transparent: true,
    opacity: 0.26,
    emissive: new THREE.Color(tubeColor),
    emissiveIntensity: 0.08,
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
      tubeMat.opacity = active ? 0.56 : 0.16;
      tubeMat.emissiveIntensity = active ? 0.36 : 0.04;
      sphereMat.emissiveIntensity = active ? 0.95 : 0.22;
      sphereMat.opacity = active ? 1 : 0.35;
    },
    tick(dt, reducedMotion = false) {
      const rate = active ? speed : speed * 0.32;
      if (!reducedMotion) phase = (phase + dt * rate) % 1;
      for (let i = 0; i < particles.length; i++) {
        const t = (particles[i].offset + phase) % 1;
        curve.getPointAt(t, particles[i].mesh.position);
        const s = active ? 1.15 : 0.72;
        particles[i].mesh.scale.setScalar(s);
      }
    },
  };
}

export function tagPickable(object, partId) {
  object.userData.partId = partId;
  object.traverse(child => {
    child.userData.partId = partId;
  });
  return object;
}

export function disposeObject(root) {
  if (!root) return;
  const geometries = new Set();
  const materials = new Set();
  root.traverse(child => {
    if (child.geometry) geometries.add(child.geometry);
    if (child.material) {
      if (Array.isArray(child.material)) child.material.forEach(m => materials.add(m));
      else materials.add(child.material);
    }
  });
  geometries.forEach(geo => geo.dispose());
  materials.forEach(mat => {
    for (const value of Object.values(mat)) {
      if (value && typeof value.dispose === "function") value.dispose();
    }
    mat.dispose();
  });
}
