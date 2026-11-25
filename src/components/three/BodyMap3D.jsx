import React, { useCallback, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import ThreeStage from "./ThreeStage";
import { makeCeramic, makeGlass, makeGlow, PALETTE, tagPickable } from "./materials";
import { RouteLink } from "../RouteLink";

const ORGANS_META = [
  {
    id: "thyroid",
    name: "甲状腺",
    region: "颈部前方 · 气管两侧",
    role: "分泌 T4 / T3 激素调节全身能量消耗、体温与心跳节奏。",
    tests: "甲状腺功能（TSH / T4 / T3）· 甲状腺结节超声",
    pos: [0, 1.48, 0.16],
    cam: [0.6, 1.65, 3.6],
    color: PALETTE.coral,
  },
  {
    id: "lung",
    name: "肺",
    region: "胸腔左右两侧",
    role: "通过肺泡薄壁把吸入的氧气送入血液，同时呼出二氧化碳。",
    tests: "肺结节（低剂量胸部 CT）· 血常规（氧运输）",
    pos: [0, 0.74, 0.04],
    cam: [0.3, 0.85, 4.4],
    color: PALETTE.tealLight,
  },
  {
    id: "heart",
    name: "心脏",
    region: "胸腔中线略偏左",
    role: "四个腔室接力泵血，推动含氧血与回流血持续循环。",
    tests: "心电图 · 血压 · 血脂 · 颈动脉超声",
    pos: [0.16, 0.56, 0.22],
    cam: [0.85, 0.65, 3.7],
    color: PALETTE.arterial,
  },
  {
    id: "liver",
    name: "肝脏",
    region: "右上腹 · 膈肌下方",
    role: "处理消化道吸收的营养、调度血糖脂质，并分泌胆汁。",
    tests: "肝功能 · 脂肪肝 · 胆囊超声 · 血糖 · 血脂",
    pos: [-0.36, -0.06, 0.18],
    cam: [-1.1, 0.1, 3.8],
    color: 0xd07d65,
  },
  {
    id: "pancreas",
    name: "胰腺",
    region: "上腹深处 · 胃的后方",
    role: "外分泌消化酶分解食物，内分泌胰岛素调节血糖平稳。",
    tests: "空腹血糖（FPG）· 糖化血红蛋白（HbA1c）",
    pos: [0.12, -0.32, -0.02],
    cam: [0.7, -0.25, 3.8],
    color: PALETTE.gold,
  },
  {
    id: "kidney",
    name: "肾脏",
    region: "腰部脊柱两侧偏后",
    role: "昼夜过滤血液排出肌酐、尿酸与多余水分，维护水盐平衡。",
    tests: "肾功能（肌酐 / eGFR）· 尿酸 · 尿常规 · 血压",
    pos: [0, -0.44, -0.22],
    cam: [-1.6, -0.35, -3.6],
    color: PALETTE.venous,
  },
];

function createBodyScene({ THREE, scene, studio }) {
  const root = new THREE.Group();
  scene.add(root);
  if (studio?.pedestal) studio.pedestal.position.y = -1.78;

  // Sculpted frosted-glass human torso silhouette via smooth lathe + elliptical flattening
  const profile = [
    new THREE.Vector2(0.01, -1.65),
    new THREE.Vector2(0.76, -1.58),
    new THREE.Vector2(0.84, -1.18),
    new THREE.Vector2(0.74, -0.62),
    new THREE.Vector2(0.68, -0.18),
    new THREE.Vector2(0.86, 0.48),
    new THREE.Vector2(1.06, 1.02),
    new THREE.Vector2(0.92, 1.24),
    new THREE.Vector2(0.36, 1.38),
    new THREE.Vector2(0.32, 1.72),
    new THREE.Vector2(0.28, 1.88),
    new THREE.Vector2(0.01, 1.92),
  ];
  const torsoGeo = new THREE.LatheGeometry(profile, 44);
  const torsoMat = makeGlass(THREE, PALETTE.glassShell, {
    opacity: 0.24,
    transmission: 0.65,
    roughness: 0.28,
    emissiveIntensity: 0.02,
    depthWrite: false,
  });
  const torsoMesh = new THREE.Mesh(torsoGeo, torsoMat);
  torsoMesh.scale.set(1, 1, 0.62);
  root.add(torsoMesh);

  // Subtle internal spine axis for anatomical orientation
  const spineGeo = new THREE.CylinderGeometry(0.055, 0.065, 3.05, 16);
  const spineMat = makeCeramic(THREE, 0xd8e4e8, { transparent: true, opacity: 0.42, roughness: 0.5 });
  const spine = new THREE.Mesh(spineGeo, spineMat);
  spine.position.set(0, 0.05, -0.32);
  root.add(spine);

  // Faint ribcage guide rings
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x94b8b5,
    transparent: true,
    opacity: 0.16,
  });
  for (const [y, rx, rz] of [[1.0, 0.88, 0.5], [0.65, 0.86, 0.52], [0.3, 0.78, 0.47]]) {
    const ringGeo = new THREE.TorusGeometry(1, 0.008, 8, 48);
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.scale.set(rx, rz, 1);
    ring.position.y = y;
    root.add(ring);
  }

  const organMeshes = new Map();
  const haloRings = new Map();

  function addHalo(id, pos, color, radius = 0.28) {
    const geo = new THREE.TorusGeometry(radius, 0.016, 12, 36);
    const mat = makeGlow(THREE, color, 0.25);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(...pos);
    root.add(mesh);
    haloRings.set(id, { mesh, mat });
  }

  // 1. Thyroid: twin butterfly lobes
  {
    const g = new THREE.Group();
    const mat = makeGlass(THREE, PALETTE.coral, { opacity: 0.92, roughness: 0.2 });
    const lobeGeo = new THREE.SphereGeometry(0.11, 20, 16);
    const left = new THREE.Mesh(lobeGeo, mat);
    left.position.set(-0.11, 0, 0);
    left.scale.set(0.85, 1.35, 0.7);
    const right = new THREE.Mesh(lobeGeo, mat);
    right.position.set(0.11, 0, 0);
    right.scale.set(0.85, 1.35, 0.7);
    const bridge = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.14, 8, 12), mat);
    bridge.rotation.z = Math.PI / 2;
    g.add(left, right, bridge);
    g.position.set(0, 1.48, 0.16);
    tagPickable(g, "thyroid");
    root.add(g);
    organMeshes.set("thyroid", { group: g, mat });
    addHalo("thyroid", [0, 1.48, 0.16], PALETTE.coral, 0.24);
  }

  // 2. Lungs: bilateral translucent lobes
  {
    const g = new THREE.Group();
    const mat = makeGlass(THREE, PALETTE.tealLight, { opacity: 0.74, roughness: 0.26 });
    const lungGeo = new THREE.SphereGeometry(0.32, 24, 20);
    const left = new THREE.Mesh(lungGeo, mat);
    left.position.set(-0.46, 0, 0);
    left.scale.set(0.82, 1.45, 0.75);
    const right = new THREE.Mesh(lungGeo, mat);
    right.position.set(0.46, 0, 0);
    right.scale.set(0.78, 1.42, 0.74);
    g.add(left, right);
    g.position.set(0, 0.74, 0.04);
    tagPickable(g, "lung");
    root.add(g);
    organMeshes.set("lung", { group: g, mat });
    addHalo("lung", [0, 0.74, 0.04], PALETTE.tealLight, 0.64);
  }

  // 3. Heart: left-tilted sculptural core
  {
    const g = new THREE.Group();
    const mat = makeGlass(THREE, PALETTE.arterial, { opacity: 0.94, roughness: 0.18 });
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.21, 24, 20), mat);
    core.scale.set(0.92, 1.18, 0.85);
    core.rotation.z = -0.28;
    const aorta = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.036, 12, 24, Math.PI), mat);
    aorta.position.set(-0.02, 0.22, 0);
    g.add(core, aorta);
    g.position.set(0.16, 0.56, 0.22);
    tagPickable(g, "heart");
    root.add(g);
    organMeshes.set("heart", { group: g, mat });
    addHalo("heart", [0.16, 0.56, 0.22], PALETTE.arterial, 0.3);
  }

  // 4. Liver: smooth right-upper-abdomen wedge
  {
    const g = new THREE.Group();
    const mat = makeGlass(THREE, 0xd07d65, { opacity: 0.9, roughness: 0.22 });
    const main = new THREE.Mesh(new THREE.SphereGeometry(0.32, 24, 20), mat);
    main.scale.set(1.25, 0.78, 0.72);
    main.rotation.z = 0.22;
    g.add(main);
    g.position.set(-0.36, -0.06, 0.18);
    tagPickable(g, "liver");
    root.add(g);
    organMeshes.set("liver", { group: g, mat });
    addHalo("liver", [-0.36, -0.06, 0.18], 0xd07d65, 0.42);
  }

  // 5. Pancreas: elongated amber body behind stomach plane
  {
    const g = new THREE.Group();
    const mat = makeGlass(THREE, PALETTE.gold, { opacity: 0.92, roughness: 0.24 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.38, 12, 20), mat);
    body.rotation.z = Math.PI / 2 - 0.18;
    g.add(body);
    g.position.set(0.12, -0.32, -0.02);
    tagPickable(g, "pancreas");
    root.add(g);
    organMeshes.set("pancreas", { group: g, mat });
    addHalo("pancreas", [0.12, -0.32, -0.02], PALETTE.gold, 0.3);
  }

  // 6. Kidneys: paired retroperitoneal beans
  {
    const g = new THREE.Group();
    const mat = makeGlass(THREE, PALETTE.venous, { opacity: 0.92, roughness: 0.2 });
    const beanGeo = new THREE.CapsuleGeometry(0.095, 0.16, 12, 18);
    const left = new THREE.Mesh(beanGeo, mat);
    left.position.set(-0.38, -0.04, 0);
    left.rotation.z = 0.18;
    const right = new THREE.Mesh(beanGeo, mat);
    right.position.set(0.38, 0.04, 0);
    right.rotation.z = -0.18;
    g.add(left, right);
    g.position.set(0, -0.44, -0.22);
    tagPickable(g, "kidney");
    root.add(g);
    organMeshes.set("kidney", { group: g, mat });
    addHalo("kidney", [0, -0.44, -0.22], PALETTE.venous, 0.48);
  }

  let prevFocus = null;

  return {
    update(state, dt, elapsed, reducedMotion, glideTo) {
      const activeId = state?.activeId || "heart";
      if (state?.autoFocus && activeId !== prevFocus) {
        prevFocus = activeId;
        const meta = ORGANS_META.find(o => o.id === activeId);
        if (meta && glideTo) glideTo(meta.cam, meta.pos);
      }
      if (!reducedMotion && state?.autoRotate) {
        root.rotation.y += dt * 0.22;
      }
      for (const [id, { group, mat }] of organMeshes.entries()) {
        const isActive = id === activeId;
        mat.emissiveIntensity = isActive ? 0.48 : 0.06;
        mat.opacity = isActive ? 0.96 : 0.56;
        const beat = !reducedMotion && id === "heart"
          ? 1 + Math.sin(elapsed * 4.2) * 0.035
          : 1;
        const targetScale = (isActive ? 1.12 : 0.96) * beat;
        group.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.12);
        const halo = haloRings.get(id);
        if (halo) {
          halo.mesh.visible = isActive;
          if (isActive) {
            halo.mat.opacity = reducedMotion ? 0.55 : 0.35 + Math.sin(elapsed * 3.2) * 0.2;
            halo.mesh.rotation.y = elapsed * 0.8;
          }
        }
      }
    },
  };
}

export default function BodyMap3D({
  activeId: controlledId,
  onSelect,
  availableIds = null,
  compact = false,
}) {
  const [internalId, setInternalId] = useState(controlledId || "heart");
  const activeId = controlledId && ORGANS_META.some(o => o.id === controlledId) ? controlledId : internalId;
  const items = useMemo(
    () => (availableIds ? ORGANS_META.filter(o => availableIds.includes(o.id)) : ORGANS_META),
    [availableIds],
  );
  const current = items.find(o => o.id === activeId) || items[0] || ORGANS_META[0];
  const [autoFocus, setAutoFocus] = useState(false);

  const buildScene = useCallback((ctx) => createBodyScene(ctx), []);

  const choose = (id) => {
    setInternalId(id);
    setAutoFocus(true);
    onSelect?.(id);
  };

  if (compact) {
    return (
      <div className="tour-3d-wrap">
        <ThreeStage
          ariaLabel="3D 透明人体六大器官相对位置示意"
          badge="3D 人体透视"
          hint="拖拽旋转躯干 · 点击光点看器官位置"
          cameraPosition={[0, 0.35, 5.4]}
          cameraTarget={[0, 0.2, 0]}
          buildScene={buildScene}
          sceneState={{ activeId: current.id, autoFocus: false, autoRotate: true }}
          onPick={choose}
        />
      </div>
    );
  }

  return (
    <div className="body-map-grid">
      <ThreeStage
        className="body-map-stage"
        ariaLabel="3D 透明人体六大器官相对位置示意"
        badge="3D 人体透视 · 6 器官"
        hint="拖拽旋转人体轮廓 · 点击发光器官查看位置与对应体检项"
        cameraPosition={[0, 0.35, 5.6]}
        cameraTarget={[0, 0.18, 0]}
        buildScene={buildScene}
        sceneState={{ activeId: current.id, autoFocus, autoRotate: false }}
        onPick={choose}
      />
      <div className="body-map-info" aria-live="polite">
        <div className="body-map-pills" role="group" aria-label="选择器官位置">
          {items.map(item => (
            <button
              key={item.id}
              type="button"
              className={current.id === item.id ? "active" : ""}
              onClick={() => choose(item.id)}
            >
              {item.name}
            </button>
          ))}
        </div>
        <h3>{current.name}</h3>
        <span className="body-map-connection">相对位置：{current.region}</span>
        <p>{current.role}</p>
        <span className="body-map-connection">对应常见体检：{current.tests}</span>
        {onSelect ? (
          <RouteLink page="organs" id={current.id} className="text-link" onNavigate={() => onSelect(current.id)}>
            进入{current.name}专题 <ArrowRight size={15} aria-hidden="true" />
          </RouteLink>
        ) : null}
        <p className="concept-3d-note">
          <b>图示边界：</b>为简化玻璃轮廓概念模型，仅表达六大器官的相对上下左右与前后方位，不按真实人体解剖比例绘制。
        </p>
      </div>
    </div>
  );
}
