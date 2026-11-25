// Cached GLB loader with Three.js built-in MeshoptDecoder (zero external CDN).
// Models live under /media/models/*.glb (NIH HuBMAP Human Reference Atlas, CC BY 4.0).

let loaderPromise = null;
const sceneCache = new Map();

async function getLoader() {
  if (!loaderPromise) {
    loaderPromise = Promise.all([
      import("three/examples/jsm/loaders/GLTFLoader.js"),
      import("three/examples/jsm/libs/meshopt_decoder.module.js"),
    ]).then(async ([{ GLTFLoader }, { MeshoptDecoder }]) => {
      if (MeshoptDecoder.ready) await MeshoptDecoder.ready;
      const loader = new GLTFLoader();
      loader.setMeshoptDecoder(MeshoptDecoder);
      return loader;
    });
  }
  return loaderPromise;
}

export async function loadAnatomicalGLB(url) {
  let cached = sceneCache.get(url);
  if (!cached) {
    cached = getLoader().then(
      (loader) =>
        new Promise((resolve, reject) => {
          loader.load(
            url,
            (gltf) => resolve(gltf.scene),
            undefined,
            (err) => {
              sceneCache.delete(url);
              reject(err);
            },
          );
        }),
    );
    sceneCache.set(url, cached);
  }
  const source = await cached;
  // Clone hierarchy while sharing underlying BufferGeometries (re-assigned fresh materials per scene)
  return source.clone(true);
}

/**
 * Computes bounding box of an object and returns a wrapper group normalized
 * so the object is centered at origin and scaled to fit `targetSize` max dimension.
 */
export function normalizeModelToUnit(THREE, obj, targetSize = 2.6) {
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj);
  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  box.getCenter(center);
  box.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const scale = targetSize / maxDim;

  const wrapper = new THREE.Group();
  obj.position.sub(center);
  const inner = new THREE.Group();
  inner.add(obj);
  inner.scale.setScalar(scale);
  wrapper.add(inner);
  return { wrapper, inner, center, size, scale };
}

/**
 * Sculpts a smooth, anatomically curved butterfly thyroid gland (two tapered
 * teardrop lobes hugging the anterolateral trachea + curved ventral isthmus)
 * positioned in the shared HuBMAP anatomical coordinate frame.
 */
export function createOrganicThyroid(THREE, material) {
  const group = new THREE.Group();
  group.name = "thyroid-gland";

  function makeLobe(side) {
    const geo = new THREE.SphereGeometry(0.115, 32, 24);
    const pos = geo.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      // Taper smoothly toward upper pole (teardrop contour) and widen lower pole
      const ny = v.y / 0.115; // -1 .. +1
      const taper = 1.0 - 0.32 * Math.max(0, ny) + 0.14 * Math.max(0, -ny);
      v.x *= 0.68 * taper;
      v.y *= 1.62;
      v.z *= 0.64 * taper;
      // Curve gently posteriorly so the lobe hugs around the circular trachea
      const medialDist = side * v.x;
      v.z -= Math.max(0, medialDist) * 0.45 + 0.16 * ny * ny * 0.1;
      // Subtle inward tilt at superior pole
      v.x -= side * Math.max(0, ny) * 0.022;
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.set(side * 0.125, 0.01, -0.015);
    mesh.rotation.y = -side * 0.34;
    mesh.rotation.z = side * 0.12;
    return mesh;
  }

  const leftLobe = makeLobe(1);
  const rightLobe = makeLobe(-1);

  // Smooth curved anterior isthmus bridging tracheal rings 2-4
  const isthmusCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.11, -0.035, 0.02),
    new THREE.Vector3(-0.055, -0.045, 0.055),
    new THREE.Vector3(0, -0.048, 0.064),
    new THREE.Vector3(0.055, -0.045, 0.055),
    new THREE.Vector3(0.11, -0.035, 0.02),
  ]);
  const isthmusGeo = new THREE.TubeGeometry(isthmusCurve, 24, 0.042, 16, false);
  // Slightly flatten anterior-posteriorly like real thyroid isthmus
  isthmusGeo.scale(1, 1.15, 0.68);
  const isthmus = new THREE.Mesh(isthmusGeo, material);

  group.add(leftLobe, rightLobe, isthmus);
  return group;
}

export const HUBMAP_ATTRIBUTION = {
  name: "NIH HuBMAP Human Reference Atlas (HRA)",
  url: "https://humanatlas.io/",
  license: "CC BY 4.0",
  licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
};
