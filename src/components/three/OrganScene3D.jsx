import React, { useCallback } from "react";
import ThreeStage from "./ThreeStage";
import { createCurveFlow, makeCeramic, makeGlass, makeGlow, PALETTE, tagPickable } from "./materials";

function buildHeartScene({ THREE, scene }) {
  const root = new THREE.Group();
  scene.add(root);

  // Subtle translucent outer heart envelope
  const shellGeo = new THREE.SphereGeometry(1.78, 32, 24);
  const shellMat = makeGlass(THREE, PALETTE.glassShell, {
    opacity: 0.15,
    transmission: 0.65,
    roughness: 0.3,
    depthWrite: false,
  });
  const shell = new THREE.Mesh(shellGeo, shellMat);
  shell.scale.set(1.06, 1.15, 0.85);
  shell.position.set(0, -0.05, 0);
  root.add(shell);

  // Central translucent septum divider
  const septum = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 2.2, 1.1),
    makeCeramic(THREE, 0xe2ecef, { transparent: true, opacity: 0.35 }),
  );
  septum.position.set(0, -0.05, 0);
  root.add(septum);

  const partMap = new Map();
  const addNode = (id, geo, color, pos, scale = [1, 1, 1], opts = {}) => {
    const mat = makeGlass(THREE, color, { opacity: opts.opacity ?? 0.88, roughness: 0.2 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(...pos);
    mesh.scale.set(...scale);
    tagPickable(mesh, id);
    root.add(mesh);
    partMap.set(id, { mesh, mat, baseScale: new THREE.Vector3(...scale) });
    return mesh;
  };

  // Anatomical right on viewer-left (-x), anatomical left on viewer-right (+x)
  addNode("right-atrium", new THREE.SphereGeometry(0.56, 26, 20), PALETTE.venous, [-0.66, 0.52, 0.1], [0.95, 0.92, 0.85]);
  addNode("right-ventricle", new THREE.SphereGeometry(0.66, 26, 20), PALETTE.venous, [-0.56, -0.66, 0.14], [0.92, 1.12, 0.86]);
  addNode("left-atrium", new THREE.SphereGeometry(0.56, 26, 20), PALETTE.arterial, [0.66, 0.52, 0.1], [0.95, 0.92, 0.85]);
  addNode("left-ventricle", new THREE.SphereGeometry(0.7, 26, 20), PALETTE.arterial, [0.58, -0.66, 0.14], [0.96, 1.18, 0.9]);
  addNode("lungs", new THREE.TorusGeometry(0.46, 0.16, 16, 32), PALETTE.tealLight, [0, 2.02, -0.15], [1.45, 0.65, 0.72]);
  addNode("body", new THREE.TorusGeometry(0.62, 0.13, 16, 36), PALETTE.slate, [0, -2.02, -0.05], [1.55, 0.58, 0.72]);

  const flows = {
    "body-ra": createCurveFlow(THREE, [[-0.9, -1.9, 0], [-1.75, -0.6, 0.15], [-1.45, 0.6, 0.2], [-0.82, 0.55, 0.15]], { tubeColor: PALETTE.venous, particleColor: 0x7ac3f0 }),
    "ra-rv": createCurveFlow(THREE, [[-0.66, 0.42, 0.28], [-0.66, -0.05, 0.38], [-0.56, -0.62, 0.3]], { tubeColor: PALETTE.venous, particleColor: 0x7ac3f0, particleCount: 7 }),
    "rv-lungs": createCurveFlow(THREE, [[-0.5, -0.58, 0.3], [-0.25, 0.5, 0.52], [-0.28, 1.48, 0.25], [-0.2, 1.98, -0.05]], { tubeColor: PALETTE.venous, particleColor: 0x7ac3f0 }),
    "lungs-la": createCurveFlow(THREE, [[0.32, 1.96, -0.05], [0.85, 1.38, 0.12], [0.76, 0.68, 0.18]], { tubeColor: PALETTE.arterial, particleColor: 0xffa69e }),
    "la-lv": createCurveFlow(THREE, [[0.66, 0.42, 0.28], [0.66, -0.05, 0.38], [0.58, -0.62, 0.3]], { tubeColor: PALETTE.arterial, particleColor: 0xffa69e, particleCount: 7 }),
    "lv-body": createCurveFlow(THREE, [[0.52, -0.6, 0.32], [1.55, 0.25, 0.25], [1.82, -0.8, 0.1], [0.95, -1.9, 0]], { tubeColor: PALETTE.arterial, particleColor: 0xffa69e }),
  };
  Object.values(flows).forEach(f => root.add(f.group));

  const views = {
    "body-ra": [[-2.8, 0.15, 6.8], [-0.5, 0.0, 0]],
    "ra-rv": [[-2.4, -0.1, 6.4], [-0.4, -0.1, 0.1]],
    "rv-lungs": [[-1.5, 1.1, 6.9], [-0.2, 0.45, 0.1]],
    "lungs-la": [[2.0, 1.15, 6.8], [0.4, 0.65, 0]],
    "la-lv": [[2.4, -0.1, 6.4], [0.4, -0.1, 0.1]],
    "lv-body": [[2.8, -0.45, 7.0], [0.5, -0.45, 0]],
  };

  let lastKey = "";
  return {
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
      for (const [id, { mesh, mat, baseScale }] of partMap.entries()) {
        const focused = activePart === id || (!activePart && (activeFrom === id || activeTo === id));
        mat.emissiveIntensity = focused ? 0.52 : 0.06;
        mat.opacity = focused ? 0.96 : 0.62;
        const pulse = !reducedMotion && focused ? 1 + Math.sin(elapsed * 4) * 0.04 : 1;
        const factor = (focused ? 1.08 : 0.97) * pulse;
        mesh.scale.set(baseScale.x * factor, baseScale.y * factor, baseScale.z * factor);
      }
    },
  };
}

function buildLungScene({ THREE, scene }) {
  const root = new THREE.Group();
  scene.add(root);

  const partMap = new Map();
  const register = (id, obj, mat) => {
    tagPickable(obj, id);
    root.add(obj);
    partMap.set(id, { mesh: obj, mat, baseScale: obj.scale.clone() });
  };

  // Nose/Mouth intake capsule
  const intakeMat = makeGlass(THREE, PALETTE.mint, { opacity: 0.88 });
  const intake = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.36, 12, 20), intakeMat);
  intake.rotation.z = Math.PI / 2;
  intake.position.set(-1.72, 1.24, 0);
  register("nose-mouth", intake, intakeMat);

  // Trachea vertical ringed tube
  const tracheaGroup = new THREE.Group();
  const tracheaMat = makeGlass(THREE, PALETTE.tealLight, { opacity: 0.82 });
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.3, 22), tracheaMat);
  tracheaGroup.add(tube);
  for (const y of [-0.42, -0.14, 0.14, 0.42]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.028, 10, 24), makeCeramic(THREE, 0xe8f3f1));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    tracheaGroup.add(ring);
  }
  tracheaGroup.position.set(-0.95, 0.85, 0);
  register("trachea", tracheaGroup, tracheaMat);

  // Bronchi Y-branch
  const bronchiGroup = new THREE.Group();
  const bronchiMat = makeGlass(THREE, PALETTE.teal, { opacity: 0.8 });
  const leftBr = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.11, 1.1, 16), bronchiMat);
  leftBr.position.set(-0.42, -0.35, 0);
  leftBr.rotation.z = -0.68;
  const rightBr = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.11, 1.3, 16), bronchiMat);
  rightBr.position.set(0.45, -0.22, 0);
  rightBr.rotation.z = 1.05;
  bronchiGroup.add(leftBr, rightBr);
  bronchiGroup.position.set(-0.95, 0.1, 0);
  register("bronchi", bronchiGroup, bronchiMat);

  // Alveoli grape cluster
  const alveoliGroup = new THREE.Group();
  const alveoliMat = makeGlass(THREE, 0xf2dac8, { opacity: 0.86, roughness: 0.22 });
  const sacGeo = new THREE.SphereGeometry(0.32, 22, 18);
  const offsets = [
    [0, 0.28, 0], [0.34, 0.08, 0.18], [-0.3, 0.05, 0.2],
    [0.12, -0.22, 0.26], [-0.22, -0.24, -0.16], [0.28, -0.12, -0.24], [0, 0.1, -0.28],
  ];
  for (const [x, y, z] of offsets) {
    const m = new THREE.Mesh(sacGeo, alveoliMat);
    m.position.set(x, y, z);
    alveoliGroup.add(m);
  }
  alveoliGroup.position.set(1.15, 0.3, 0);
  register("alveoli", alveoliGroup, alveoliMat);

  // Capillaries wrapping ring below alveoli
  const capMat = makeGlass(THREE, PALETTE.arterial, { opacity: 0.88, roughness: 0.2 });
  const cap = new THREE.Mesh(new THREE.TorusGeometry(0.74, 0.13, 16, 36), capMat);
  cap.rotation.x = Math.PI / 2.6;
  cap.position.set(1.25, -0.92, 0.15);
  register("capillaries", cap, capMat);

  const flows = {
    "air-trachea": createCurveFlow(THREE, [[-1.8, 1.48, 0.1], [-1.2, 1.42, 0.1], [-0.95, 1.05, 0.1]], { tubeColor: PALETTE.teal, particleColor: PALETTE.tealLight, particleCount: 7 }),
    "trachea-bronchi": createCurveFlow(THREE, [[-0.95, 1.0, 0.14], [-0.95, 0.25, 0.14], [-0.75, -0.1, 0.14]], { tubeColor: PALETTE.teal, particleColor: PALETTE.tealLight, particleCount: 7 }),
    "bronchi-alveoli": createCurveFlow(THREE, [[-0.72, -0.08, 0.12], [0.18, 0.08, 0.18], [0.92, 0.28, 0.15]], { tubeColor: PALETTE.teal, particleColor: PALETTE.tealLight }),
    "alveoli-capillaries": createCurveFlow(THREE, [[1.0, 0.12, 0.26], [1.02, -0.4, 0.36], [1.18, -0.88, 0.32]], { tubeColor: PALETTE.venous, particleColor: 0x73c2fb, particleCount: 8 }),
    "capillaries-alveoli": createCurveFlow(THREE, [[1.48, -0.86, 0.24], [1.56, -0.35, 0.26], [1.34, 0.16, 0.22]], { tubeColor: PALETTE.amber, particleColor: 0xf4b668, particleCount: 8 }),
    "alveoli-air": createCurveFlow(THREE, [[0.92, 0.56, 0.12], [-0.15, 1.35, 0.22], [-1.78, 1.56, 0.14]], { tubeColor: PALETTE.amber, particleColor: 0xf4b668 }),
  };
  Object.values(flows).forEach(f => root.add(f.group));

  return {
    update(state, dt, elapsed, reducedMotion) {
      const stepId = state?.stepId;
      const activePart = state?.activePart;
      for (const [id, flow] of Object.entries(flows)) {
        flow.setActive(id === stepId);
        flow.tick(dt, reducedMotion);
      }
      for (const [id, { mesh, mat, baseScale }] of partMap.entries()) {
        const focused = activePart === id || (!activePart && (state?.from === id || state?.to === id));
        mat.emissiveIntensity = focused ? 0.5 : 0.06;
        mat.opacity = focused ? 0.96 : 0.62;
        const breathe = !reducedMotion && id === "alveoli" ? 1 + Math.sin(elapsed * 2.2) * 0.045 : 1;
        const f = (focused ? 1.08 : 0.97) * breathe;
        mesh.scale.set(baseScale.x * f, baseScale.y * f, baseScale.z * f);
      }
    },
  };
}

function buildKidneyScene({ THREE, scene }) {
  const root = new THREE.Group();
  scene.add(root);

  const partMap = new Map();
  const register = (id, obj, mat) => {
    tagPickable(obj, id);
    root.add(obj);
    partMap.set(id, { mesh: obj, mat, baseScale: obj.scale.clone() });
  };

  // Renal artery inlet
  const artMat = makeGlass(THREE, PALETTE.arterial, { opacity: 0.9 });
  const artery = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 1.15, 20), artMat);
  artery.rotation.z = Math.PI / 2;
  artery.position.set(-2.05, 0.25, 0);
  register("renal-artery", artery, artMat);

  // Glomerulus: outer glass Bowman's capsule + inner coiled knot filter
  const glomGroup = new THREE.Group();
  const glomMat = makeGlass(THREE, PALETTE.tealLight, { opacity: 0.56, transmission: 0.65 });
  const capsule = new THREE.Mesh(new THREE.SphereGeometry(0.76, 28, 22), glomMat);
  const knot = new THREE.Mesh(
    new THREE.TorusKnotGeometry(0.38, 0.085, 64, 12, 2, 3),
    makeCeramic(THREE, PALETTE.arterial, { roughness: 0.25 }),
  );
  // Large pearl albumin spheres retained inside glomerulus
  const proteinGeo = new THREE.SphereGeometry(0.085, 14, 12);
  const proteinMat = makeCeramic(THREE, 0xffffff, { roughness: 0.15, clearcoat: 1 });
  for (const pos of [[-0.22, 0.28, 0.28], [0.18, -0.25, 0.3], [-0.1, -0.1, -0.34]]) {
    const p = new THREE.Mesh(proteinGeo, proteinMat);
    p.position.set(...pos);
    glomGroup.add(p);
  }
  glomGroup.add(capsule, knot);
  glomGroup.position.set(-0.75, 0.25, 0);
  register("glomerulus", glomGroup, glomMat);

  // Tubule winding loop
  const tubuleCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.02, 0.25, 0),
    new THREE.Vector3(0.42, 0.68, 0.18),
    new THREE.Vector3(0.76, -0.38, -0.12),
    new THREE.Vector3(1.12, 0.45, 0.14),
    new THREE.Vector3(1.38, -0.05, 0),
  ]);
  const tubuleMat = makeGlass(THREE, PALETTE.gold, { opacity: 0.86, roughness: 0.22 });
  const tubule = new THREE.Mesh(new THREE.TubeGeometry(tubuleCurve, 56, 0.14, 16, false), tubuleMat);
  register("tubule", tubule, tubuleMat);

  // Blood return (reabsorbed clean water/nutrients)
  const retMat = makeGlass(THREE, PALETTE.venous, { opacity: 0.9 });
  const ret = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.72, 14, 22), retMat);
  ret.rotation.z = Math.PI / 2;
  ret.position.set(2.1, 1.05, 0.08);
  register("blood-return", ret, retMat);

  // Final urine outlet
  const urineMat = makeGlass(THREE, PALETTE.amber, { opacity: 0.9 });
  const urine = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.72, 14, 22), urineMat);
  urine.rotation.z = Math.PI / 2;
  urine.position.set(2.1, -1.02, 0.08);
  register("urine-out", urine, urineMat);

  const flows = {
    "blood-in": createCurveFlow(THREE, [[-2.55, 0.25, 0.12], [-1.6, 0.25, 0.12], [-0.95, 0.25, 0.12]], { tubeColor: PALETTE.arterial, particleColor: 0xff9f96, particleCount: 7 }),
    "filter-mesh": createCurveFlow(THREE, [[-0.65, 0.25, 0.2], [0.05, 0.35, 0.22], [0.65, 0.1, 0.2]], { tubeColor: PALETTE.teal, particleColor: PALETTE.tealLight, particleCount: 8 }),
    "reabsorb-back": createCurveFlow(THREE, [[0.85, 0.45, 0.18], [1.35, 0.95, 0.18], [2.2, 1.05, 0.18]], { tubeColor: PALETTE.venous, particleColor: 0x7bc5f7, particleCount: 8 }),
    "waste-urine": createCurveFlow(THREE, [[1.15, -0.1, 0.15], [1.45, -0.82, 0.16], [2.25, -1.02, 0.16]], { tubeColor: PALETTE.amber, particleColor: 0xf7bd6c, particleCount: 8 }),
  };
  Object.values(flows).forEach(f => root.add(f.group));

  return {
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
        mat.emissiveIntensity = focused ? 0.5 : 0.06;
        mat.opacity = focused ? 0.95 : 0.62;
        const f = focused ? 1.07 : 0.97;
        mesh.scale.set(baseScale.x * f, baseScale.y * f, baseScale.z * f);
      }
    },
  };
}

function buildThyroidScene({ THREE, scene }) {
  const root = new THREE.Group();
  scene.add(root);

  const partMap = new Map();
  const register = (id, obj, mat) => {
    tagPickable(obj, id);
    root.add(obj);
    partMap.set(id, { mesh: obj, mat, baseScale: obj.scale.clone() });
  };

  // Pituitary orb at top
  const pitMat = makeGlass(THREE, PALETTE.venous, { opacity: 0.94, roughness: 0.16 });
  const pit = new THREE.Mesh(new THREE.SphereGeometry(0.46, 28, 22), pitMat);
  pit.position.set(0, 1.56, 0);
  register("pituitary", pit, pitMat);

  // TSH signal node (right)
  const tshMat = makeGlass(THREE, PALETTE.tealLight, { opacity: 0.9 });
  const tsh = new THREE.Mesh(new THREE.OctahedronGeometry(0.34, 2), tshMat);
  tsh.position.set(1.78, 0.08, 0.12);
  register("tsh-signal", tsh, tshMat);

  // Butterfly thyroid gland wrapping white trachea rings at bottom
  const thyGroup = new THREE.Group();
  const thyMat = makeGlass(THREE, PALETTE.coral, { opacity: 0.92, roughness: 0.18 });
  const trachea = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 1.25, 22), makeCeramic(THREE, 0xe8eff2));
  const lobeGeo = new THREE.SphereGeometry(0.42, 24, 20);
  const leftLobe = new THREE.Mesh(lobeGeo, thyMat);
  leftLobe.position.set(-0.46, 0, 0.12);
  leftLobe.scale.set(0.84, 1.38, 0.72);
  const rightLobe = new THREE.Mesh(lobeGeo, thyMat);
  rightLobe.position.set(0.46, 0, 0.12);
  rightLobe.scale.set(0.84, 1.38, 0.72);
  const isthmus = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.5, 10, 16), thyMat);
  isthmus.rotation.z = Math.PI / 2;
  isthmus.position.set(0, -0.05, 0.22);
  thyGroup.add(trachea, leftLobe, rightLobe, isthmus);
  thyGroup.position.set(0, -1.32, 0);
  register("thyroid-gland", thyGroup, thyMat);

  // Blood T4/T3 node (left)
  const hormMat = makeGlass(THREE, PALETTE.amber, { opacity: 0.9 });
  const horm = new THREE.Mesh(new THREE.IcosahedronGeometry(0.36, 1), hormMat);
  horm.position.set(-1.78, 0.08, 0.12);
  register("hormone-level", horm, hormMat);

  const flows = {
    "pituitary-send": createCurveFlow(THREE, [[0.38, 1.48, 0.08], [1.45, 1.15, 0.24], [1.78, 0.34, 0.15]], { tubeColor: PALETTE.venous, particleColor: 0x7bc5f7 }),
    "tsh-drive": createCurveFlow(THREE, [[1.74, -0.22, 0.15], [1.45, -1.12, 0.24], [0.68, -1.32, 0.16]], { tubeColor: PALETTE.teal, particleColor: PALETTE.tealLight }),
    "hormone-work": createCurveFlow(THREE, [[-0.68, -1.32, 0.16], [-1.45, -1.12, 0.24], [-1.74, -0.22, 0.15]], { tubeColor: PALETTE.arterial, particleColor: 0xffa69e }),
    "negative-feedback": createCurveFlow(THREE, [[-1.78, 0.34, 0.15], [-1.45, 1.15, 0.24], [-0.38, 1.48, 0.08]], { tubeColor: PALETTE.amber, particleColor: 0xf7bd6c }),
  };
  Object.values(flows).forEach(f => root.add(f.group));

  return {
    update(state, dt, elapsed, reducedMotion) {
      const stepId = state?.stepId;
      const activePart = state?.activePart;
      if (!reducedMotion) {
        tsh.rotation.y += dt * 0.6;
        horm.rotation.y -= dt * 0.5;
      }
      for (const [id, flow] of Object.entries(flows)) {
        flow.setActive(id === stepId);
        flow.tick(dt, reducedMotion);
      }
      for (const [id, { mesh, mat, baseScale }] of partMap.entries()) {
        const focused = activePart === id || (!activePart && (state?.from === id || state?.to === id));
        mat.emissiveIntensity = focused ? 0.52 : 0.06;
        mat.opacity = focused ? 0.96 : 0.64;
        const f = focused ? 1.1 : 0.97;
        mesh.scale.set(baseScale.x * f, baseScale.y * f, baseScale.z * f);
      }
    },
  };
}

const BUILDERS = {
  "heart-flow-v1": { build: buildHeartScene, camera: [0, 0.2, 7.6], label: "心脏血液双循环 3D 互动沙盘" },
  "lung-gas-exchange-v1": { build: buildLungScene, camera: [0, 0.25, 6.8], label: "肺与肺泡气体交换 3D 互动沙盘" },
  "kidney-filtration-v1": { build: buildKidneyScene, camera: [0, 0.25, 6.4], label: "肾单位滤过与重吸收 3D 互动沙盘" },
  "thyroid-feedback-v1": { build: buildThyroidScene, camera: [0, 0.15, 6.2], label: "垂体与甲状腺负反馈 3D 互动沙盘" },
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
      badge="3D 互动沙盘 · 磨砂玻璃"
      hint="拖拽 360° 旋转 · 滚轮/双指缩放 · 点击任意结构查看解释"
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
