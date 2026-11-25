/**
 * Offline build script to prepare NIH HuBMAP Human Reference Atlas (CC BY 4.0)
 * 3D reference organ GLB meshes for web delivery in 知愈.
 *
 * Raw files live in gitignored `artifacts/raw-glb/` (downloaded from cdn.humanatlas.io).
 * Outputs decimated, smooth-normal, Meshopt-compressed GLBs (< 1 MB total)
 * in `public/media/models/` sharing a unified anatomical world coordinate system:
 *   offset = (0, -0.425, -0.005) m, scale = 6.0 (torso height ~3.42 scene units).
 */
import fs from "node:fs/promises";
import path from "node:path";
import { Document, NodeIO } from "@gltf-transform/core";
import { EXTMeshoptCompression, KHRMeshQuantization } from "@gltf-transform/extensions";
import { weld, simplify, quantize, prune, dedup, getBounds } from "@gltf-transform/functions";
import { MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";

const RAW_DIR = "artifacts/raw-glb";
const OUT_DIR = "public/media/models";
const ORIGIN = [0, 0.425, 0.005];
const WORLD_SCALE = 6.0;

await MeshoptEncoder.ready;
await MeshoptSimplifier.ready;
await fs.mkdir(OUT_DIR, { recursive: true });

const readIO = new NodeIO();
const writeIO = new NodeIO()
  .registerExtensions([KHRMeshQuantization, EXTMeshoptCompression])
  .registerDependencies({ "meshopt.encoder": MeshoptEncoder });

function computeSmoothNormals(positions, indices) {
  const vertCount = positions.length / 3;
  const normals = new Float32Array(positions.length);
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i] * 3;
    const b = indices[i + 1] * 3;
    const c = indices[i + 2] * 3;
    const ax = positions[a], ay = positions[a + 1], az = positions[a + 2];
    const bx = positions[b], by = positions[b + 1], bz = positions[b + 2];
    const cx = positions[c], cy = positions[c + 1], cz = positions[c + 2];
    const ux = bx - ax, uy = by - ay, uz = bz - az;
    const vx = cx - ax, vy = cy - ay, vz = cz - az;
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    normals[a] += nx; normals[a + 1] += ny; normals[a + 2] += nz;
    normals[b] += nx; normals[b + 1] += ny; normals[b + 2] += nz;
    normals[c] += nx; normals[c + 1] += ny; normals[c + 2] += nz;
  }
  for (let i = 0; i < vertCount; i++) {
    const k = i * 3;
    const len = Math.hypot(normals[k], normals[k + 1], normals[k + 2]) || 1;
    normals[k] /= len;
    normals[k + 1] /= len;
    normals[k + 2] /= len;
  }
  return normals;
}

/**
 * Extracts world-transformed triangles from selected meshes in a source GLB,
 * optionally filters triangles with a predicate, and merges them into a single
 * indexed mesh buffer in our unified anatomical coordinate frame.
 */
function extractMergedGeometry(srcDoc, {
  meshFilter = () => true,
  triangleFilter = null,
  keepLargestComponent = false,
} = {}) {
  const posOut = [];
  const idxOut = [];
  let vertexBase = 0;

  const root = srcDoc.getRoot();
  const nodes = root.listNodes();
  // Map mesh -> world matrix (HuBMAP ref organs usually have identity/simple transforms)
  const meshMatrices = new Map();
  for (const node of nodes) {
    const m = node.getMesh();
    if (m) meshMatrices.set(m, node.getWorldMatrix());
  }

  for (const mesh of root.listMeshes()) {
    if (!meshFilter(mesh.getName())) continue;
    const mat = meshMatrices.get(mesh);
    for (const prim of mesh.listPrimitives()) {
      const posAcc = prim.getAttribute("POSITION");
      if (!posAcc) continue;
      const idxAcc = prim.getIndices();
      const count = posAcc.getCount();
      const localVerts = new Float32Array(count * 3);
      const tmp = [0, 0, 0];
      for (let i = 0; i < count; i++) {
        posAcc.getElement(i, tmp);
        let x = tmp[0], y = tmp[1], z = tmp[2];
        if (mat) {
          const wx = mat[0] * x + mat[4] * y + mat[8] * z + mat[12];
          const wy = mat[1] * x + mat[5] * y + mat[9] * z + mat[13];
          const wz = mat[2] * x + mat[6] * y + mat[10] * z + mat[14];
          x = wx; y = wy; z = wz;
        }
        localVerts[i * 3] = x;
        localVerts[i * 3 + 1] = y;
        localVerts[i * 3 + 2] = z;
      }

      const triCount = idxAcc ? idxAcc.getCount() / 3 : count / 3;
      const usedMap = new Int32Array(count).fill(-1);
      for (let t = 0; t < triCount; t++) {
        const i0 = idxAcc ? idxAcc.getScalar(t * 3) : t * 3;
        const i1 = idxAcc ? idxAcc.getScalar(t * 3 + 1) : t * 3 + 1;
        const i2 = idxAcc ? idxAcc.getScalar(t * 3 + 2) : t * 3 + 2;
        if (triangleFilter) {
          const ax = localVerts[i0 * 3], ay = localVerts[i0 * 3 + 1], az = localVerts[i0 * 3 + 2];
          const bx = localVerts[i1 * 3], by = localVerts[i1 * 3 + 1], bz = localVerts[i1 * 3 + 2];
          const cx = localVerts[i2 * 3], cy = localVerts[i2 * 3 + 1], cz = localVerts[i2 * 3 + 2];
          if (!triangleFilter([ax, ay, az], [bx, by, bz], [cx, cy, cz])) continue;
        }
        for (const vi of [i0, i1, i2]) {
          if (usedMap[vi] === -1) {
            usedMap[vi] = vertexBase++;
            posOut.push(
              (localVerts[vi * 3] - ORIGIN[0]) * WORLD_SCALE,
              (localVerts[vi * 3 + 1] - ORIGIN[1]) * WORLD_SCALE,
              (localVerts[vi * 3 + 2] - ORIGIN[2]) * WORLD_SCALE,
            );
          }
          idxOut.push(usedMap[vi]);
        }
      }
    }
  }

  let positions = new Float32Array(posOut);
  let indices = new Uint32Array(idxOut);

  if (keepLargestComponent && indices.length > 0) {
    // Union-Find on vertices to keep only the single largest connected component
    const nVerts = positions.length / 3;
    const parent = new Int32Array(nVerts);
    for (let i = 0; i < nVerts; i++) parent[i] = i;
    const find = (x) => {
      while (parent[x] !== x) {
        parent[x] = parent[parent[x]];
        x = parent[x];
      }
      return x;
    };
    const unite = (a, b) => {
      const ra = find(a), rb = find(b);
      if (ra !== rb) parent[ra] = rb;
    };
    for (let i = 0; i < indices.length; i += 3) {
      unite(indices[i], indices[i + 1]);
      unite(indices[i + 1], indices[i + 2]);
    }
    const compCounts = new Map();
    for (let i = 0; i < indices.length; i += 3) {
      const r = find(indices[i]);
      compCounts.set(r, (compCounts.get(r) || 0) + 1);
    }
    let bestRoot = -1, bestCount = 0;
    for (const [r, c] of compCounts.entries()) {
      if (c > bestCount) { bestCount = c; bestRoot = r; }
    }
    const remap = new Int32Array(nVerts).fill(-1);
    const newPos = [];
    const newIdx = [];
    let next = 0;
    for (let i = 0; i < indices.length; i += 3) {
      if (find(indices[i]) !== bestRoot) continue;
      for (let k = 0; k < 3; k++) {
        const old = indices[i + k];
        if (remap[old] === -1) {
          remap[old] = next++;
          newPos.push(positions[old * 3], positions[old * 3 + 1], positions[old * 3 + 2]);
        }
        newIdx.push(remap[old]);
      }
    }
    positions = new Float32Array(newPos);
    indices = new Uint32Array(newIdx);
  }

  return { positions, indices };
}

function addMeshToDoc(doc, scene, buffer, name, { positions, indices }) {
  if (!indices.length) throw new Error(`Empty mesh for ${name}`);
  const posAcc = doc.createAccessor(`${name}_pos`).setType("VEC3").setArray(positions).setBuffer(buffer);
  const idxAcc = doc.createAccessor(`${name}_idx`).setType("SCALAR").setArray(indices).setBuffer(buffer);
  const mat = doc.createMaterial(`${name}_mat`).setRoughnessFactor(0.3).setMetallicFactor(0.02);
  const prim = doc.createPrimitive()
    .setAttribute("POSITION", posAcc)
    .setIndices(idxAcc)
    .setMaterial(mat);
  const mesh = doc.createMesh(name).addPrimitive(prim);
  const node = doc.createNode(name).setMesh(mesh);
  scene.addChild(node);
}

function recomputeDocNormals(doc) {
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const posAcc = prim.getAttribute("POSITION");
      const idxAcc = prim.getIndices();
      if (!posAcc || !idxAcc) continue;
      const positions = posAcc.getArray();
      const indices = idxAcc.getArray();
      const normals = computeSmoothNormals(positions, indices);
      const normAcc = prim.getAttribute("NORMAL");
      if (normAcc) {
        normAcc.setArray(normals);
      } else {
        const acc = doc.createAccessor().setType("VEC3").setArray(normals).setBuffer(posAcc.getBuffer());
        prim.setAttribute("NORMAL", acc);
      }
    }
  }
}

async function optimizeAndWrite(doc, outName, { ratio = 0.08, error = 0.02, weldTolerance = 0.001 } = {}) {
  await doc.transform(
    weld({ tolerance: weldTolerance }),
    simplify({ simplifier: MeshoptSimplifier, ratio, error, lockBorder: false }),
  );
  // Recompute clean smooth normals AFTER welding + decimation so curved surfaces look silky
  recomputeDocNormals(doc);
  await doc.transform(
    dedup(),
    prune(),
    quantize({ quantizePosition: 14, quantizeNormal: 10 }),
  );
  doc.createExtension(EXTMeshoptCompression)
    .setRequired(true)
    .setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.FILTER });

  const outPath = path.join(OUT_DIR, outName);
  await writeIO.write(outPath, doc);

  const stat = await fs.stat(outPath);
  let tris = 0;
  for (const m of doc.getRoot().listMeshes()) {
    for (const p of m.listPrimitives()) {
      tris += p.getIndices() ? p.getIndices().getCount() / 3 : 0;
    }
  }
  const b = getBounds(doc.getRoot().listScenes()[0]);
  const center = b.min.map((v, i) => Number(((v + b.max[i]) / 2).toFixed(3)));
  const size = b.min.map((v, i) => Number((b.max[i] - v).toFixed(3)));
  console.log(
    `${outName.padEnd(16)} ${(stat.size / 1024).toFixed(1).padStart(6)} KB | ${Math.round(tris).toString().padStart(5)} tris | center=${JSON.stringify(center)} size=${JSON.stringify(size)}`,
  );
  return stat.size;
}

let totalBytes = 0;

// 1. Torso bust (cropped cleanly from NIH HuBMAP skin-male: neck -> upper hips, smooth deltoid shoulder cap)
{
  const src = await readIO.read(path.join(RAW_DIR, "skin.glb"));
  const smoothstep = (e0, e1, x) => {
    const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
    return t * t * (3 - 2 * t);
  };
  const insideTorso = (v) => {
    const [x, y] = v;
    if (y < 0.145 || y > 0.705) return false;
    // Below armpit (y < 0.43), ribcage/waist is strictly within |x| <= 0.184;
    // above armpit, flare smoothly to rounded deltoid shoulder cap up to |x| <= 0.232
    const maxAbsX = y < 0.43
      ? 0.184
      : 0.184 + 0.048 * smoothstep(0.43, 0.565, y);
    return Math.abs(x) <= maxAbsX;
  };
  const geom = extractMergedGeometry(src, {
    triangleFilter: (a, b, c) => insideTorso(a) && insideTorso(b) && insideTorso(c),
    keepLargestComponent: true,
  });
  const doc = new Document();
  const scene = doc.createScene("torso");
  const buffer = doc.createBuffer();
  addMeshToDoc(doc, scene, buffer, "torso-shell", geom);
  totalBytes += await optimizeAndWrite(doc, "torso.glb", { ratio: 0.035, error: 0.01 });
}

// 2. Heart (4 individually named real chambers so OrganScene3D can highlight each chamber!)
{
  const src = await readIO.read(path.join(RAW_DIR, "heart.glb"));
  const doc = new Document();
  const scene = doc.createScene("heart");
  const buffer = doc.createBuffer();
  const parts = [
    ["right-atrium", n => n === "VH_M_right_cardiac_atrium"],
    ["right-ventricle", n => n === "VH_M_heart_right_ventricle"],
    ["left-atrium", n => n === "VH_M_left_cardiac_atrium"],
    ["left-ventricle", n => n === "VH_M_heart_left_ventricle" || n === "VH_M_interventricular_septum"],
  ];
  for (const [partName, filter] of parts) {
    const geom = extractMergedGeometry(src, { meshFilter: filter });
    addMeshToDoc(doc, scene, buffer, partName, geom);
  }
  totalBytes += await optimizeAndWrite(doc, "heart.glb", { ratio: 0.06, error: 0.008 });
}

// 3. Lungs (outer lung lobes + inner glowing bronchial tree as 2 named meshes!)
{
  const src = await readIO.read(path.join(RAW_DIR, "lung.glb"));
  const doc = new Document();
  const scene = doc.createScene("lung");
  const buffer = doc.createBuffer();
  const lobes = extractMergedGeometry(src, {
    meshFilter: n => /bronchopulmonary_segment|hilum/i.test(n),
  });
  const bronchi = extractMergedGeometry(src, {
    meshFilter: n => /bronchus|posterior_basal$/i.test(n) && !/tertiary/i.test(n),
  });
  addMeshToDoc(doc, scene, buffer, "lung-lobes", lobes);
  addMeshToDoc(doc, scene, buffer, "bronchi-tree", bronchi);
  totalBytes += await optimizeAndWrite(doc, "lung.glb", { ratio: 0.045, error: 0.035, weldTolerance: 0.002 });
}

// 4. Liver (outer anatomical wedge)
{
  const src = await readIO.read(path.join(RAW_DIR, "liver.glb"));
  const doc = new Document();
  const scene = doc.createScene("liver");
  const buffer = doc.createBuffer();
  const geom = extractMergedGeometry(src, {
    meshFilter: n => !/ligament/i.test(n),
  });
  addMeshToDoc(doc, scene, buffer, "liver", geom);
  totalBytes += await optimizeAndWrite(doc, "liver.glb", { ratio: 0.075, error: 0.015 });
}

// 5. Pancreas
{
  const src = await readIO.read(path.join(RAW_DIR, "pancreas.glb"));
  const doc = new Document();
  const scene = doc.createScene("pancreas");
  const buffer = doc.createBuffer();
  const geom = extractMergedGeometry(src);
  addMeshToDoc(doc, scene, buffer, "pancreas", geom);
  totalBytes += await optimizeAndWrite(doc, "pancreas.glb", { ratio: 0.08, error: 0.08, weldTolerance: 0.004 });
}

// 6. Paired Kidneys (left + right outer capsules & cortex, named separately so OrganScene3D can pick one!)
{
  const srcL = await readIO.read(path.join(RAW_DIR, "kidney-l.glb"));
  const srcR = await readIO.read(path.join(RAW_DIR, "kidney-r.glb"));
  const doc = new Document();
  const scene = doc.createScene("kidneys");
  const buffer = doc.createBuffer();
  const shellFilter = n => /capsule|hilum|outer_cortex/i.test(n);
  addMeshToDoc(doc, scene, buffer, "kidney-left", extractMergedGeometry(srcL, { meshFilter: shellFilter }));
  addMeshToDoc(doc, scene, buffer, "kidney-right", extractMergedGeometry(srcR, { meshFilter: shellFilter }));
  totalBytes += await optimizeAndWrite(doc, "kidneys.glb", { ratio: 0.065, error: 0.008 });
}

// 7. Trachea + Larynx cartilage (context for Thyroid + Lung airways!)
{
  const srcT = await readIO.read(path.join(RAW_DIR, "trachea.glb"));
  const srcL = await readIO.read(path.join(RAW_DIR, "larynx.glb"));
  const doc = new Document();
  const scene = doc.createScene("trachea");
  const buffer = doc.createBuffer();
  addMeshToDoc(doc, scene, buffer, "trachea-tube", extractMergedGeometry(srcT));
  addMeshToDoc(doc, scene, buffer, "larynx-cartilage", extractMergedGeometry(srcL, {
    meshFilter: n => /thyroid_cartilage|cricoid_cartilage/i.test(n),
  }));
  totalBytes += await optimizeAndWrite(doc, "trachea.glb", { ratio: 0.065, error: 0.008 });
}

console.log(`\nTotal compressed GLB bundle: ${(totalBytes / 1024).toFixed(1)} KB (${(totalBytes / (1024 * 1024)).toFixed(2)} MB)`);
