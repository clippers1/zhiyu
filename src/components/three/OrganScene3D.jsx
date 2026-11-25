import React, { useCallback } from "react";
import ThreeStage from "./ThreeStage";
import {
  createCurveFlow,
  makeCeramic,
  makeFresnelShell,
  makeGlass,
  makeGlow,
  makeOrganMaterial,
  PALETTE,
  tagPickable,
} from "./materials";
import {
  createOrganicThyroid,
  HUBMAP_ATTRIBUTION,
  loadAnatomicalGLB,
  normalizeModelToUnit,
} from "./modelLoader";

const PART_LABELS = {
  // Heart
  "right-atrium": { title: "右心房", tone: "venous" },
  "right-ventricle": { title: "右心室", tone: "venous" },
  "left-atrium": { title: "左心房", tone: "arterial" },
  "left-ventricle": { title: "左心室", tone: "arterial" },
  lungs: { title: "肺循环（肺部换气）", tone: "teal" },
  body: { title: "体循环（全身供氧）", tone: "arterial" },
  // Lung
  "nose-mouth": { title: "鼻腔与口腔", tone: "teal" },
  trachea: { title: "气管", tone: "teal" },
  bronchi: { title: "各级支气管树", tone: "teal" },
  alveoli: { title: "肺泡囊簇（放大）", tone: "amber" },
  capillaries: { title: "肺泡毛细血管网", tone: "arterial" },
  // Kidney
  "renal-artery": { title: "肾动脉入球血流", tone: "arterial" },
  glomerulus: { title: "肾小球滤过网", tone: "teal" },
  tubule: { title: "肾小管重吸收", tone: "amber" },
  "blood-return": { title: "洁净回流血液", tone: "venous" },
  "urine-out": { title: "终尿排出", tone: "amber" },
  // Thyroid
  pituitary: { title: "脑垂体", tone: "venous" },
  "tsh-signal": { title: "TSH 调控信号", tone: "teal" },
  "thyroid-gland": { title: "甲状腺", tone: "arterial" },
  "hormone-level": { title: "血中 T4 / T3 水平", tone: "amber" },
};

async function buildHeartScene({ THREE, scene, studio }) {
  const root = new THREE.Group();
  scene.add(root);
  if (studio?.pedestal) studio.pedestal.position.y = -2.35;

  const heartGlb = await loadAnatomicalGLB("/media/models/heart.glb");
  const { wrapper: heartWrap } = normalizeModelToUnit(THREE, heartGlb, 2.75);
  root.add(heartWrap);

  const chamberColors = {
    "right-atrium": PALETTE.venous,
    "right-ventricle": PALETTE.venousBright,
    "left-atrium": PALETTE.coral,
    "left-ventricle": PALETTE.arterial,
  };

  const partMap = new Map();
  const pinAnchors = new Map();

  heartGlb.traverse((child) => {
    if (!child.isMesh) return;
    const id = child.name;
    if (!chamberColors[id]) return;
    const mat = makeOrganMaterial(THREE, chamberColors[id], {
      roughness: 0.26,
      clearcoat: 0.78,
      opacity: 0.9,
    });
    child.material = mat;
    tagPickable(child, id);
    partMap.set(id, { mesh: child, mat, baseScale: child.scale.clone(), isChamber: true });

    // Compute world center of each real NIH heart chamber for accurate pin & flow routing
    heartWrap.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(child);
    const center = new THREE.Vector3();
    box.getCenter(center);
    pinAnchors.set(id, center);
  });

  // Translucent pulmonary loop ring (top) & systemic circulation ring (bottom)
  const addLoopNode = (id, geo, color, pos, scale) => {
    const mat = makeGlass(THREE, color, { opacity: 0.78, roughness: 0.24 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(...pos);
    mesh.scale.set(...scale);
    tagPickable(mesh, id);
    root.add(mesh);
    partMap.set(id, { mesh, mat, baseScale: new THREE.Vector3(...scale) });
    pinAnchors.set(id, new THREE.Vector3(...pos));
  };

  addLoopNode("lungs", new THREE.TorusGeometry(0.55, 0.12, 18, 40), PALETTE.tealLight, [0.0, 2.02, -0.05], [1.45, 0.56, 0.65]);
  addLoopNode("body", new THREE.TorusGeometry(0.68, 0.11, 18, 40), PALETTE.slate, [0.0, -2.02, 0.0], [1.55, 0.52, 0.65]);

  const pRA = pinAnchors.get("right-atrium") || new THREE.Vector3(-0.78, 0.15, 0);
  const pRV = pinAnchors.get("right-ventricle") || new THREE.Vector3(-0.05, -0.1, 0.45);
  const pLA = pinAnchors.get("left-atrium") || new THREE.Vector3(-0.28, 0.36, -0.58);
  const pLV = pinAnchors.get("left-ventricle") || new THREE.Vector3(0.55, -0.25, 0.15);

  const flows = {
    "body-ra": createCurveFlow(THREE, [
      [-0.95, -1.9, 0.05],
      [-1.78, -0.7, 0.15],
      [-1.55, 0.38, 0.22],
      [pRA.x - 0.18, pRA.y + 0.1, pRA.z + 0.15],
    ], { tubeColor: PALETTE.venous, particleColor: 0x7ac3f0 }),
    "ra-rv": createCurveFlow(THREE, [
      [pRA.x, pRA.y, pRA.z + 0.32],
      [(pRA.x + pRV.x) / 2 - 0.15, (pRA.y + pRV.y) / 2 - 0.12, Math.max(pRA.z, pRV.z) + 0.56],
      [pRV.x, pRV.y, pRV.z + 0.38],
    ], { tubeColor: PALETTE.venous, particleColor: 0x7ac3f0, particleCount: 7 }),
    "rv-lungs": createCurveFlow(THREE, [
      [pRV.x, pRV.y + 0.1, pRV.z + 0.38],
      [-0.25, 0.92, 0.55],
      [-0.36, 1.62, 0.18],
      [-0.32, 1.98, -0.02],
    ], { tubeColor: PALETTE.venous, particleColor: 0x7ac3f0 }),
    "lungs-la": createCurveFlow(THREE, [
      [0.36, 1.98, -0.04],
      [0.95, 1.42, -0.22],
      [pLA.x + 0.45, pLA.y + 0.35, pLA.z - 0.2],
      [pLA.x + 0.18, pLA.y, pLA.z - 0.18],
    ], { tubeColor: PALETTE.arterial, particleColor: 0xffa69e }),
    "la-lv": createCurveFlow(THREE, [
      [pLA.x + 0.25, pLA.y, pLA.z - 0.15],
      [0.92, 0.28, -0.15],
      [pLV.x + 0.34, pLV.y + 0.08, pLV.z + 0.22],
    ], { tubeColor: PALETTE.arterial, particleColor: 0xffa69e, particleCount: 7 }),
    "lv-body": createCurveFlow(THREE, [
      [pLV.x + 0.28, pLV.y + 0.1, pLV.z + 0.24],
      [1.62, 0.42, 0.28],
      [1.82, -0.78, 0.1],
      [0.98, -1.9, 0.02],
    ], { tubeColor: PALETTE.arterial, particleColor: 0xffa69e }),
  };
  Object.values(flows).forEach((f) => root.add(f.group));

  const views = {
    "body-ra": [[-2.6, 0.15, 6.4], [-0.35, 0.0, 0]],
    "ra-rv": [[-1.6, 0.0, 6.2], [-0.2, -0.05, 0.15]],
    "rv-lungs": [[-1.2, 1.15, 6.6], [-0.15, 0.45, 0.1]],
    "lungs-la": [[2.2, 1.15, -5.8], [0.1, 0.55, -0.1]],
    "la-lv": [[2.8, 0.15, 5.8], [0.25, 0.0, 0]],
    "lv-body": [[2.8, -0.35, 6.6], [0.45, -0.35, 0]],
  };

  let lastKey = "";
  return {
    getPins(state) {
      const targetId = state?.activePart || state?.to || state?.from;
      const anchor = pinAnchors.get(targetId);
      const info = PART_LABELS[targetId];
      if (!anchor || !info) return [];
      return [{ id: "part-pin", pos: [anchor.x, anchor.y, anchor.z], title: info.title, tone: info.tone, active: true }];
    },
    update(state, dt, elapsed, reducedMotion, glideTo) {
      const stepId = state?.stepId;
      const activePart = state?.activePart;
      const activeFrom = state?.from;
      const activeTo = state?.to;
      const key = `${stepId}:${activePart || ""}`;
      if (key !== lastKey) {
        lastKey = key;
        if (!activePart && views[stepId]) glideTo(views[stepId][0], views[stepId][1]);
      }
      for (const [id, flow] of Object.entries(flows)) {
        flow.setActive(id === stepId);
        flow.tick(dt, reducedMotion);
      }
      // Physiological cardiac lub-dub pulse on entire real heart wrapper
      const phase = (elapsed * 1.15) % 1;
      const beat = reducedMotion
        ? 1
        : 1 + (Math.exp(-Math.pow((phase - 0.12) / 0.055, 2)) + 0.4 * Math.exp(-Math.pow((phase - 0.26) / 0.05, 2))) * 0.032;
      heartWrap.scale.setScalar(beat);

      for (const [id, { mesh, mat, baseScale, isChamber }] of partMap.entries()) {
        const focused = activePart === id || (!activePart && (activeFrom === id || activeTo === id));
        mat.emissiveIntensity += ((focused ? 0.42 : 0.06) - mat.emissiveIntensity) * 0.14;
        mat.opacity += ((focused ? 0.96 : isChamber ? 0.52 : 0.42) - mat.opacity) * 0.14;
        if (!isChamber) {
          const factor = focused ? 1.07 : 0.96;
          mesh.scale.set(baseScale.x * factor, baseScale.y * factor, baseScale.z * factor);
        }
      }
    },
  };
}

async function buildLungScene({ THREE, scene, studio }) {
  const root = new THREE.Group();
  scene.add(root);
  if (studio?.pedestal) studio.pedestal.position.y = -1.92;

  const [lungGlb, tracheaGlb] = await Promise.all([
    loadAnatomicalGLB("/media/models/lung.glb"),
    loadAnatomicalGLB("/media/models/trachea.glb"),
  ]);

  // Keep lung & trachea in their shared anatomical frame, normalize together on the left
  const airwayBundle = new THREE.Group();
  airwayBundle.add(lungGlb, tracheaGlb);
  const { wrapper: lungWrap } = normalizeModelToUnit(THREE, airwayBundle, 3.05);
  lungWrap.position.set(-1.12, -0.05, 0);
  root.add(lungWrap);

  const partMap = new Map();
  const pinAnchors = new Map();

  // Outer frosted translucent NIH lung lobes (silky medical glass so inner bronchi tree glows cleanly)
  const lobeMat = makeOrganMaterial(THREE, PALETTE.tealLight, {
    roughness: 0.24,
    clearcoat: 0.78,
    opacity: 0.3,
    depthWrite: false,
  });
  const bronchiMat = makeOrganMaterial(THREE, PALETTE.teal, {
    roughness: 0.28,
    clearcoat: 0.72,
    opacity: 0.9,
  });
  const tracheaMat = makeOrganMaterial(THREE, PALETTE.tealLight, {
    roughness: 0.3,
    clearcoat: 0.7,
    opacity: 0.9,
  });

  lungGlb.traverse((child) => {
    if (!child.isMesh) return;
    if (/bronchi/i.test(child.name)) {
      child.material = bronchiMat;
      tagPickable(child, "bronchi");
      partMap.set("bronchi", { mesh: child, mat: bronchiMat, keepScale: true });
    } else {
      child.material = lobeMat;
      child.renderOrder = 4;
      tagPickable(child, "bronchi");
    }
  });

  tracheaGlb.traverse((child) => {
    if (!child.isMesh) return;
    child.material = tracheaMat;
    tagPickable(child, "trachea");
  });
  partMap.set("trachea", { mesh: tracheaGlb, mat: tracheaMat, keepScale: true });

  // Nose/Mouth intake capsule above upper larynx
  const intakeMat = makeOrganMaterial(THREE, PALETTE.mint, { opacity: 0.9 });
  const intake = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.34, 14, 24), intakeMat);
  intake.rotation.z = Math.PI / 2;
  intake.position.set(-1.72, 1.56, 0.14);
  tagPickable(intake, "nose-mouth");
  root.add(intake);
  partMap.set("nose-mouth", { mesh: intake, mat: intakeMat, baseScale: intake.scale.clone() });

  // Magnified Alveolar Acinus Cluster (right side, rich organic translucent sacs)
  const alveoliGroup = new THREE.Group();
  const alveoliMat = makeOrganMaterial(THREE, 0xe8bba0, {
    roughness: 0.26,
    clearcoat: 0.78,
    opacity: 0.88,
  });
  const sacGeo = new THREE.SphereGeometry(0.32, 26, 20);
  const sacOffsets = [
    [0, 0.3, 0, 1.0],
    [0.36, 0.08, 0.18, 0.95],
    [-0.32, 0.06, 0.2, 0.92],
    [0.14, -0.24, 0.26, 0.96],
    [-0.24, -0.22, -0.18, 0.9],
    [0.3, -0.12, -0.24, 0.94],
    [0, 0.12, -0.3, 0.92],
    [-0.08, 0.46, 0.16, 0.78],
  ];
  for (const [x, y, z, s] of sacOffsets) {
    const m = new THREE.Mesh(sacGeo, alveoliMat);
    m.position.set(x, y, z);
    m.scale.setScalar(s);
    alveoliGroup.add(m);
  }
  // Subtle translucent magnifying lens ring framing alveoli
  const zoomRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.95, 0.018, 12, 48),
    makeGlow(THREE, PALETTE.tealLight, 0.38),
  );
  alveoliGroup.add(zoomRing);
  alveoliGroup.position.set(1.52, 0.26, 0.08);
  tagPickable(alveoliGroup, "alveoli");
  root.add(alveoliGroup);
  partMap.set("alveoli", { mesh: alveoliGroup, mat: alveoliMat, baseScale: alveoliGroup.scale.clone() });

  // Capillaries wrapping gracefully underneath alveoli (venous-to-arterial gradient look)
  const capGroup = new THREE.Group();
  const capMat = makeOrganMaterial(THREE, PALETTE.arterial, { opacity: 0.92, roughness: 0.24 });
  const capCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.75, -0.92, 0.15),
    new THREE.Vector3(1.18, -0.78, 0.52),
    new THREE.Vector3(1.62, -0.82, 0.42),
    new THREE.Vector3(2.12, -0.92, 0.08),
    new THREE.Vector3(1.65, -1.04, -0.35),
    new THREE.Vector3(1.08, -1.02, -0.26),
  ], true);
  capGroup.add(new THREE.Mesh(new THREE.TubeGeometry(capCurve, 56, 0.12, 16, true), capMat));
  tagPickable(capGroup, "capillaries");
  root.add(capGroup);
  partMap.set("capillaries", { mesh: capGroup, mat: capMat, baseScale: capGroup.scale.clone() });

  pinAnchors.set("nose-mouth", new THREE.Vector3(-1.72, 1.56, 0.14));
  pinAnchors.set("trachea", new THREE.Vector3(-1.14, 0.92, 0.18));
  pinAnchors.set("bronchi", new THREE.Vector3(-1.05, -0.15, 0.15));
  pinAnchors.set("alveoli", new THREE.Vector3(1.52, 0.42, 0.25));
  pinAnchors.set("capillaries", new THREE.Vector3(1.55, -0.92, 0.3));

  const flows = {
    "air-trachea": createCurveFlow(THREE, [[-1.78, 1.56, 0.18], [-1.32, 1.48, 0.2], [-1.14, 1.05, 0.2]], { tubeColor: PALETTE.teal, particleColor: PALETTE.tealLight, particleCount: 7 }),
    "trachea-bronchi": createCurveFlow(THREE, [[-1.14, 1.0, 0.22], [-1.12, 0.35, 0.2], [-0.88, -0.1, 0.18]], { tubeColor: PALETTE.teal, particleColor: PALETTE.tealLight, particleCount: 7 }),
    "bronchi-alveoli": createCurveFlow(THREE, [[-0.65, -0.12, 0.18], [0.35, 0.08, 0.25], [1.22, 0.25, 0.22]], { tubeColor: PALETTE.teal, particleColor: PALETTE.tealLight }),
    "alveoli-capillaries": createCurveFlow(THREE, [[1.32, 0.08, 0.32], [1.3, -0.42, 0.44], [1.45, -0.84, 0.42]], { tubeColor: PALETTE.venous, particleColor: 0x73c2fb, particleCount: 8 }),
    "capillaries-alveoli": createCurveFlow(THREE, [[1.82, -0.84, 0.36], [1.92, -0.35, 0.32], [1.7, 0.14, 0.28]], { tubeColor: PALETTE.amber, particleColor: 0xf4b668, particleCount: 8 }),
    "alveoli-air": createCurveFlow(THREE, [[1.28, 0.56, 0.2], [0.05, 1.38, 0.26], [-1.72, 1.66, 0.2]], { tubeColor: PALETTE.amber, particleColor: 0xf4b668 }),
  };
  Object.values(flows).forEach((f) => root.add(f.group));

  return {
    getPins(state) {
      const targetId = state?.activePart || state?.to || state?.from;
      const anchor = pinAnchors.get(targetId);
      const info = PART_LABELS[targetId];
      if (!anchor || !info) return [];
      return [{ id: "part-pin", pos: [anchor.x, anchor.y, anchor.z], title: info.title, tone: info.tone, active: true }];
    },
    update(state, dt, elapsed, reducedMotion) {
      const stepId = state?.stepId;
      const activePart = state?.activePart;
      for (const [id, flow] of Object.entries(flows)) {
        flow.setActive(id === stepId);
        flow.tick(dt, reducedMotion);
      }
      // Subtle physiological lung expansion
      if (!reducedMotion) {
        const lungBreath = 1 + Math.sin(elapsed * 1.9) * 0.022;
        lungWrap.scale.setScalar(lungBreath);
      }
      for (const [id, { mesh, mat, baseScale, keepScale }] of partMap.entries()) {
        const focused = activePart === id || (!activePart && (state?.from === id || state?.to === id));
        mat.emissiveIntensity += ((focused ? 0.44 : 0.07) - mat.emissiveIntensity) * 0.14;
        mat.opacity += ((focused ? 0.96 : 0.58) - mat.opacity) * 0.14;
        if (!keepScale && baseScale) {
          const breathe = !reducedMotion && id === "alveoli" ? 1 + Math.sin(elapsed * 2.0) * 0.04 : 1;
          const f = (focused ? 1.08 : 0.97) * breathe;
          mesh.scale.set(baseScale.x * f, baseScale.y * f, baseScale.z * f);
        }
      }
    },
  };
}

async function buildKidneyScene({ THREE, scene, studio }) {
  const root = new THREE.Group();
  scene.add(root);
  if (studio?.pedestal) studio.pedestal.position.y = -1.75;

  // Real NIH left kidney context anchored on the left side
  const kidneysGlb = await loadAnatomicalGLB("/media/models/kidneys.glb");
  let leftKidney = null;
  kidneysGlb.traverse((child) => {
    if (child.isMesh && /left/i.test(child.name)) leftKidney = child.clone();
  });
  if (leftKidney) {
    leftKidney.material = makeOrganMaterial(THREE, PALETTE.venous, {
      roughness: 0.28,
      clearcoat: 0.72,
      opacity: 0.42,
      depthWrite: false,
    });
    const { wrapper: kidneyContext } = normalizeModelToUnit(THREE, leftKidney, 2.2);
    kidneyContext.position.set(-2.15, 0.08, -0.25);
    kidneyContext.rotation.y = 0.35;
    root.add(kidneyContext);
  }

  const partMap = new Map();
  const pinAnchors = new Map();
  const register = (id, obj, mat, pinPos) => {
    tagPickable(obj, id);
    root.add(obj);
    partMap.set(id, { mesh: obj, mat, baseScale: obj.scale.clone() });
    pinAnchors.set(id, new THREE.Vector3(...pinPos));
  };

  // Renal artery entering from real kidney hilum toward magnified glomerulus
  const artMat = makeOrganMaterial(THREE, PALETTE.arterial, { opacity: 0.92 });
  const artCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-2.05, 0.22, 0.12),
    new THREE.Vector3(-1.45, 0.26, 0.16),
    new THREE.Vector3(-0.98, 0.25, 0.08),
  ]);
  const artery = new THREE.Mesh(new THREE.TubeGeometry(artCurve, 24, 0.15, 16, false), artMat);
  register("renal-artery", artery, artMat, [-1.55, 0.45, 0.18]);

  // Magnified Glomerulus: Fresnel Bowman's capsule + coiled capillary tuft + retained albumin pearls
  const glomGroup = new THREE.Group();
  const glomMat = makeGlass(THREE, PALETTE.tealLight, { opacity: 0.46, transmission: 0.55 });
  const capsule = new THREE.Mesh(new THREE.SphereGeometry(0.74, 32, 24), glomMat);
  const knot = new THREE.Mesh(
    new THREE.TorusKnotGeometry(0.36, 0.085, 72, 14, 2, 3),
    makeOrganMaterial(THREE, PALETTE.arterial, { roughness: 0.24, clearcoat: 0.8 }),
  );
  const proteinGeo = new THREE.SphereGeometry(0.08, 16, 14);
  const proteinMat = makeCeramic(THREE, 0xffffff, { roughness: 0.14, clearcoat: 1 });
  for (const pos of [[-0.22, 0.28, 0.28], [0.18, -0.25, 0.3], [-0.1, -0.1, -0.34], [0.28, 0.2, -0.18]]) {
    const p = new THREE.Mesh(proteinGeo, proteinMat);
    p.position.set(...pos);
    glomGroup.add(p);
  }
  glomGroup.add(capsule, knot);
  glomGroup.position.set(-0.42, 0.25, 0);
  register("glomerulus", glomGroup, glomMat, [-0.42, 1.05, 0.1]);

  // Winding renal tubule (proximal -> Henle loop -> distal)
  const tubuleCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.3, 0.25, 0),
    new THREE.Vector3(0.68, 0.68, 0.18),
    new THREE.Vector3(0.98, -0.45, -0.12),
    new THREE.Vector3(1.32, 0.48, 0.14),
    new THREE.Vector3(1.62, -0.04, 0),
  ]);
  const tubuleMat = makeOrganMaterial(THREE, PALETTE.gold, { opacity: 0.9, roughness: 0.24 });
  const tubule = new THREE.Mesh(new THREE.TubeGeometry(tubuleCurve, 64, 0.13, 18, false), tubuleMat);
  register("tubule", tubule, tubuleMat, [1.0, 0.65, 0.18]);

  // Reabsorbed clean blood return (upper right)
  const retMat = makeOrganMaterial(THREE, PALETTE.venous, { opacity: 0.92 });
  const ret = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.66, 14, 24), retMat);
  ret.rotation.z = Math.PI / 2;
  ret.position.set(2.26, 1.02, 0.08);
  register("blood-return", ret, retMat, [2.26, 1.25, 0.1]);

  // Final urine collecting duct (lower right)
  const urineMat = makeOrganMaterial(THREE, PALETTE.amber, { opacity: 0.92 });
  const urine = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.66, 14, 24), urineMat);
  urine.rotation.z = Math.PI / 2;
  urine.position.set(2.26, -0.98, 0.08);
  register("urine-out", urine, urineMat, [2.26, -0.75, 0.1]);

  const flows = {
    "blood-in": createCurveFlow(THREE, [[-2.15, 0.22, 0.22], [-1.42, 0.26, 0.22], [-0.72, 0.25, 0.2]], { tubeColor: PALETTE.arterial, particleColor: 0xff9f96, particleCount: 7 }),
    "filter-mesh": createCurveFlow(THREE, [[-0.35, 0.25, 0.22], [0.35, 0.35, 0.24], [0.95, 0.08, 0.22]], { tubeColor: PALETTE.teal, particleColor: PALETTE.tealLight, particleCount: 8 }),
    "reabsorb-back": createCurveFlow(THREE, [[1.05, 0.45, 0.18], [1.55, 0.94, 0.18], [2.32, 1.02, 0.18]], { tubeColor: PALETTE.venous, particleColor: 0x7bc5f7, particleCount: 8 }),
    "waste-urine": createCurveFlow(THREE, [[1.35, -0.1, 0.15], [1.68, -0.82, 0.16], [2.35, -0.98, 0.16]], { tubeColor: PALETTE.amber, particleColor: 0xf7bd6c, particleCount: 8 }),
  };
  Object.values(flows).forEach((f) => root.add(f.group));

  return {
    getPins(state) {
      const targetId = state?.activePart || state?.to || state?.from;
      const anchor = pinAnchors.get(targetId);
      const info = PART_LABELS[targetId];
      if (!anchor || !info) return [];
      return [{ id: "part-pin", pos: [anchor.x, anchor.y, anchor.z], title: info.title, tone: info.tone, active: true }];
    },
    update(state, dt, elapsed, reducedMotion) {
      const stepId = state?.stepId;
      const activePart = state?.activePart;
      if (!reducedMotion) knot.rotation.y += dt * 0.35;
      for (const [id, flow] of Object.entries(flows)) {
        flow.setActive(id === stepId);
        flow.tick(dt, reducedMotion);
      }
      for (const [id, { mesh, mat, baseScale }] of partMap.entries()) {
        const focused = activePart === id || (!activePart && (state?.from === id || state?.to === id));
        mat.emissiveIntensity += ((focused ? 0.44 : 0.06) - mat.emissiveIntensity) * 0.14;
        mat.opacity += ((focused ? 0.96 : 0.6) - mat.opacity) * 0.14;
        const f = focused ? 1.06 : 0.97;
        mesh.scale.set(baseScale.x * f, baseScale.y * f, baseScale.z * f);
      }
    },
  };
}

async function buildThyroidScene({ THREE, scene, studio }) {
  const root = new THREE.Group();
  scene.add(root);
  if (studio?.pedestal) studio.pedestal.position.y = -2.1;

  const tracheaGlb = await loadAnatomicalGLB("/media/models/trachea.glb");
  const { wrapper: tracheaWrap } = normalizeModelToUnit(THREE, tracheaGlb, 1.85);
  tracheaGlb.traverse((c) => {
    if (c.isMesh) {
      c.material = makeCeramic(THREE, 0xdbe7ec, { roughness: 0.38, clearcoat: 0.45 });
    }
  });

  const partMap = new Map();
  const pinAnchors = new Map();
  const register = (id, obj, mat, pinPos) => {
    tagPickable(obj, id);
    root.add(obj);
    partMap.set(id, { mesh: obj, mat, baseScale: obj.scale.clone() });
    pinAnchors.set(id, new THREE.Vector3(...pinPos));
  };

  // Pituitary gland + subtle glowing hypothalamic halo at top
  const pitGroup = new THREE.Group();
  const pitMat = makeOrganMaterial(THREE, PALETTE.venous, { opacity: 0.95, roughness: 0.18 });
  const pitCore = new THREE.Mesh(new THREE.SphereGeometry(0.44, 32, 24), pitMat);
  const pitRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.64, 0.02, 12, 48),
    makeGlow(THREE, PALETTE.venousBright, 0.45),
  );
  pitRing.rotation.x = Math.PI / 2.6;
  pitGroup.add(pitCore, pitRing);
  pitGroup.position.set(0, 1.56, 0);
  register("pituitary", pitGroup, pitMat, [0, 2.02, 0.1]);

  // TSH messenger molecular cluster (right)
  const tshGroup = new THREE.Group();
  const tshMat = makeOrganMaterial(THREE, PALETTE.tealLight, { opacity: 0.94, roughness: 0.2 });
  const tshCenter = new THREE.Mesh(new THREE.SphereGeometry(0.24, 24, 18), tshMat);
  tshGroup.add(tshCenter);
  for (const pos of [[0.24, 0.14, 0.08], [-0.2, 0.18, -0.1], [0.05, -0.24, 0.14], [-0.18, -0.12, -0.16]]) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.12, 18, 14), tshMat);
    s.position.set(...pos);
    tshGroup.add(s);
  }
  tshGroup.position.set(1.82, 0.1, 0.12);
  register("tsh-signal", tshGroup, tshMat, [1.82, 0.48, 0.12]);

  // Real NIH trachea + sculpted organic butterfly thyroid gland at bottom
  const thyGroup = new THREE.Group();
  const thyMat = makeOrganMaterial(THREE, PALETTE.coral, { opacity: 0.95, roughness: 0.22, clearcoat: 0.8 });
  const thyroid = createOrganicThyroid(THREE, thyMat);
  thyroid.scale.setScalar(2.9);
  thyroid.position.set(0, -0.05, 0.28);
  thyGroup.add(tracheaWrap, thyroid);
  thyGroup.position.set(0, -1.18, 0);
  register("thyroid-gland", thyGroup, thyMat, [0, -0.58, 0.45]);

  // T4 / T3 active hormone cluster (left)
  const hormGroup = new THREE.Group();
  const hormMat = makeOrganMaterial(THREE, PALETTE.amber, { opacity: 0.94, roughness: 0.22 });
  const hormCenter = new THREE.Mesh(new THREE.SphereGeometry(0.25, 24, 18), hormMat);
  hormGroup.add(hormCenter);
  for (const pos of [[-0.25, 0.16, 0.08], [0.22, 0.16, -0.08], [0, -0.25, 0.12]]) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.13, 18, 14), hormMat);
    s.position.set(...pos);
    hormGroup.add(s);
  }
  hormGroup.position.set(-1.82, 0.1, 0.12);
  register("hormone-level", hormGroup, hormMat, [-1.82, 0.48, 0.12]);

  const flows = {
    "pituitary-send": createCurveFlow(THREE, [[0.42, 1.48, 0.08], [1.48, 1.15, 0.24], [1.82, 0.36, 0.15]], { tubeColor: PALETTE.venous, particleColor: 0x7bc5f7 }),
    "tsh-drive": createCurveFlow(THREE, [[1.78, -0.2, 0.15], [1.48, -1.08, 0.26], [0.72, -1.24, 0.26]], { tubeColor: PALETTE.teal, particleColor: PALETTE.tealLight }),
    "hormone-work": createCurveFlow(THREE, [[-0.72, -1.24, 0.26], [-1.48, -1.08, 0.26], [-1.78, -0.2, 0.15]], { tubeColor: PALETTE.arterial, particleColor: 0xffa69e }),
    "negative-feedback": createCurveFlow(THREE, [[-1.82, 0.36, 0.15], [-1.48, 1.15, 0.24], [-0.42, 1.48, 0.08]], { tubeColor: PALETTE.amber, particleColor: 0xf7bd6c }),
  };
  Object.values(flows).forEach((f) => root.add(f.group));

  return {
    getPins(state) {
      const targetId = state?.activePart || state?.to || state?.from;
      const anchor = pinAnchors.get(targetId);
      const info = PART_LABELS[targetId];
      if (!anchor || !info) return [];
      return [{ id: "part-pin", pos: [anchor.x, anchor.y, anchor.z], title: info.title, tone: info.tone, active: true }];
    },
    update(state, dt, elapsed, reducedMotion) {
      const stepId = state?.stepId;
      const activePart = state?.activePart;
      if (!reducedMotion) {
        tshGroup.rotation.y += dt * 0.55;
        hormGroup.rotation.y -= dt * 0.48;
        pitRing.rotation.z += dt * 0.35;
      }
      for (const [id, flow] of Object.entries(flows)) {
        flow.setActive(id === stepId);
        flow.tick(dt, reducedMotion);
      }
      for (const [id, { mesh, mat, baseScale }] of partMap.entries()) {
        const focused = activePart === id || (!activePart && (state?.from === id || state?.to === id));
        mat.emissiveIntensity += ((focused ? 0.46 : 0.06) - mat.emissiveIntensity) * 0.14;
        mat.opacity += ((focused ? 0.98 : 0.62) - mat.opacity) * 0.14;
        const f = focused ? 1.08 : 0.97;
        mesh.scale.set(baseScale.x * f, baseScale.y * f, baseScale.z * f);
      }
    },
  };
}

const BUILDERS = {
  "heart-flow-v1": { build: buildHeartScene, camera: [0.35, 0.25, 7.2], label: "心脏血液双循环 3D 真实解剖沙盘" },
  "lung-gas-exchange-v1": { build: buildLungScene, camera: [0, 0.2, 6.7], label: "肺与肺泡气体交换 3D 真实解剖沙盘" },
  "kidney-filtration-v1": { build: buildKidneyScene, camera: [0.1, 0.25, 6.7], label: "肾单位滤过与重吸收 3D 互动沙盘" },
  "thyroid-feedback-v1": { build: buildThyroidScene, camera: [0, 0.15, 6.4], label: "垂体与甲状腺负反馈 3D 互动沙盘" },
};

export function hasOrgan3D(type) {
  return Boolean(BUILDERS[type]);
}

export default function OrganScene3D({ learning, activePart, activeStep, onPart, onFallback }) {
  const spec = BUILDERS[learning?.type];
  const step = learning?.steps?.[activeStep];
  const buildScene = useCallback((ctx) => spec?.build(ctx), [spec]);

  if (!spec) return null;

  return (
    <ThreeStage
      ariaLabel={spec.label}
      badge="3D 解剖互动沙盘 · NIH HRA"
      hint="拖拽 360° 旋转 · 滚轮/双指缩放 · 点击真实解剖结构查看对应解释"
      attribution={HUBMAP_ATTRIBUTION}
      cameraPosition={spec.camera}
      cameraTarget={[0, 0, 0]}
      buildScene={buildScene}
      sceneState={{
        stepId: step?.id,
        from: step?.from,
        to: step?.to,
        activePart,
      }}
      onPick={onPart}
      onFallback={onFallback}
    />
  );
}
