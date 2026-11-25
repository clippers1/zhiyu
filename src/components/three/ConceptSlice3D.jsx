import React, { useCallback, useState } from "react";
import { Box } from "lucide-react";
import ThreeStage from "./ThreeStage";
import { createCurveFlow, makeCeramic, makeGlass, makeGlow, PALETTE } from "./materials";

const CONFIGS = {
  "lung-nodule": {
    kicker: "3D 密度质感切片",
    title: "360° 对比：实性结节、纯磨玻璃（GGO）与部分实性长什么样？",
    intro: "文字里常说的「透见后方血管纹理」，转一圈透明肺叶切片就能一眼分清。",
    boundary: "本 3D 切片仅演示影像学中三种密度质感的视觉差别，不展示真实肺叶比例、毫米尺寸或良恶性判定标准。",
    camera: [0.9, 0.85, 5.2],
    modes: [
      { id: "ggo", label: "纯磨玻璃（GGO）", text: "像一层淡淡的磨砂薄雾，旋转观察时仍能隐约透过它看到背后的细微血管纹理。" },
      { id: "part-solid", label: "部分实性（混合型）", text: "外周是一圈半透明磨砂雾状晕，中央包含一颗致密不透光的实性核心。" },
      { id: "solid", label: "实性结节", text: "整体质地均匀致密、边界相对清晰，在影像上会遮挡后方的肺部细小血管。" },
    ],
    build({ THREE, scene }) {
      const root = new THREE.Group();
      scene.add(root);

      // Transparent frosted lung tissue cube
      const tissue = new THREE.Mesh(
        new THREE.BoxGeometry(2.6, 2.1, 2.1),
        makeGlass(THREE, PALETTE.mint, { opacity: 0.16, transmission: 0.72, roughness: 0.25, depthWrite: false }),
      );
      root.add(tissue);

      // Fine internal micro-vessels passing right through center (key visual cue for GGO!)
      const vesselMat = makeCeramic(THREE, 0x3b8c88, { roughness: 0.3 });
      const vesselPaths = [
        [[-1.25, -0.45, -0.25], [-0.35, -0.1, -0.05], [0.45, 0.2, 0.08], [1.25, 0.55, 0.25]],
        [[-1.2, 0.42, 0.15], [-0.25, 0.12, -0.08], [0.55, -0.25, -0.15], [1.2, -0.58, -0.22]],
        [[-0.35, -0.1, -0.05], [0.1, 0.52, -0.25], [0.65, 0.92, -0.3]],
      ];
      for (const pts of vesselPaths) {
        const c = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)));
        root.add(new THREE.Mesh(new THREE.TubeGeometry(c, 32, 0.036, 10, false), vesselMat));
      }

      // Outer hazy GGO sphere
      const ggoMat = makeGlass(THREE, 0xf2cfc2, {
        opacity: 0.46,
        transmission: 0.55,
        roughness: 0.72,
        clearcoat: 0.15,
        depthWrite: false,
      });
      const ggoSphere = new THREE.Mesh(new THREE.SphereGeometry(0.68, 32, 24), ggoMat);
      root.add(ggoSphere);

      // Inner solid core
      const solidMat = makeCeramic(THREE, PALETTE.arterial, { roughness: 0.26, clearcoat: 0.7 });
      const solidSphere = new THREE.Mesh(new THREE.SphereGeometry(0.56, 32, 24), solidMat);
      root.add(solidSphere);

      // Subtle floating CT ring around cube
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.92, 0.022, 12, 64),
        makeGlow(THREE, PALETTE.tealLight, 0.35),
      );
      ring.rotation.x = Math.PI / 2.2;
      root.add(ring);

      return {
        update(state, dt, elapsed, reducedMotion) {
          const mode = state?.mode || "ggo";
          if (!reducedMotion) root.rotation.y += dt * 0.2;
          if (mode === "ggo") {
            ggoSphere.visible = true;
            ggoSphere.scale.setScalar(1.06);
            ggoMat.opacity = 0.46;
            solidSphere.visible = false;
          } else if (mode === "part-solid") {
            ggoSphere.visible = true;
            ggoSphere.scale.setScalar(1.08);
            ggoMat.opacity = 0.42;
            solidSphere.visible = true;
            solidSphere.scale.setScalar(0.54);
          } else {
            ggoSphere.visible = false;
            solidSphere.visible = true;
            solidSphere.scale.setScalar(1.0);
          }
          ring.position.y = reducedMotion ? 0 : Math.sin(elapsed * 1.4) * 0.48;
        },
      };
    },
  },

  "bone-density": {
    kicker: "3D 骨小梁微结构切片",
    title: "360° 观察：致密骨小梁支架 vs 稀疏多孔支架",
    intro: "骨骼表面看起来完好，内部骨小梁却可能悄悄变细变疏；旋转这个微结构立方体可以直观看到差别。",
    boundary: "本 3D 模型为骨小梁微结构疏密概念对比，不代表任何具体部位的骨矿含量，也不包含 T 值或 Z 值诊断分界。",
    camera: [2.7, 1.95, 4.4],
    modes: [
      { id: "dense", label: "致密骨小梁支架", text: "纵横交错的立体网架完整紧密，能均匀分散日常承重与外力冲击。" },
      { id: "sparse", label: "稀疏多孔支架", text: "部分横向与斜向骨小梁变细甚至断开，内部孔隙明显增大，抗冲击能力下降。" },
    ],
    build({ THREE, scene }) {
      const root = new THREE.Group();
      scene.add(root);

      const boneMat = makeCeramic(THREE, 0xc4ae90, { roughness: 0.36, clearcoat: 0.38 });
      const thinMat = makeCeramic(THREE, 0xd8c6ab, { roughness: 0.42, clearcoat: 0.32 });

      // Outer subtle ivory cortical frame
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(2.38, 2.38, 2.38),
        makeGlass(THREE, PALETTE.tealLight, { opacity: 0.1, transmission: 0.72, depthWrite: false }),
      );
      root.add(frame);

      const coreStruts = [];
      const secondaryStruts = [];
      const coords = [-0.85, -0.28, 0.28, 0.85];
      const cylGeo = new THREE.CylinderGeometry(1, 1, 1.72, 10);

      for (let i = 0; i < coords.length; i++) {
        for (let j = 0; j < coords.length; j++) {
          const isOuter = i === 0 || i === 3 || j === 0 || j === 3;
          const sy = new THREE.Mesh(cylGeo, isOuter ? boneMat : thinMat);
          sy.position.set(coords[i], 0, coords[j]);
          root.add(sy);
          (isOuter || (i + j) % 2 === 0 ? coreStruts : secondaryStruts).push(sy);

          const sx = new THREE.Mesh(cylGeo, isOuter ? boneMat : thinMat);
          sx.rotation.z = Math.PI / 2;
          sx.position.set(0, coords[i], coords[j]);
          root.add(sx);
          (isOuter && (i + j) % 2 === 0 ? coreStruts : secondaryStruts).push(sx);

          const sz = new THREE.Mesh(cylGeo, isOuter ? boneMat : thinMat);
          sz.rotation.x = Math.PI / 2;
          sz.position.set(coords[i], coords[j], 0);
          root.add(sz);
          (isOuter && i === j ? coreStruts : secondaryStruts).push(sz);
        }
      }

      // Diagonal trabecular cross-braces (vanish in sparse mode for instant visual contrast)
      const diagGeo = new THREE.CylinderGeometry(0.065, 0.065, 2.35, 10);
      for (const [rx, ry, rz] of [
        [0, 0, Math.PI / 4],
        [0, 0, -Math.PI / 4],
        [Math.PI / 4, 0, 0],
        [-Math.PI / 4, 0, 0],
      ]) {
        const d = new THREE.Mesh(diagGeo, thinMat);
        d.rotation.set(rx, ry, rz);
        root.add(d);
        secondaryStruts.push(d);
      }

      // Dual low-energy DXA teal scan beams
      const beamMat = makeGlow(THREE, PALETTE.teal, 0.16);
      beamMat.side = THREE.DoubleSide;
      beamMat.depthWrite = false;
      const beam1 = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 2.7), beamMat);
      beam1.position.x = -0.28;
      const beam2 = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 2.7), beamMat);
      beam2.position.x = 0.28;
      const beams = new THREE.Group();
      beams.add(beam1, beam2);
      root.add(beams);

      return {
        update(state, dt, elapsed, reducedMotion) {
          const sparse = state?.mode === "sparse";
          if (!reducedMotion) root.rotation.y += dt * 0.24;
          const targetCoreR = sparse ? 0.052 : 0.1;
          for (const s of coreStruts) {
            s.scale.x += (targetCoreR - s.scale.x) * 0.16;
            s.scale.z += (targetCoreR - s.scale.z) * 0.16;
          }
          for (const s of secondaryStruts) {
            s.visible = !sparse;
            if (!sparse && s.geometry === cylGeo) {
              s.scale.x = 0.08;
              s.scale.z = 0.08;
            }
          }
          beams.position.z = reducedMotion ? 0 : Math.sin(elapsed * 1.1) * 0.85;
        },
      };
    },
  },

  "carotid-ultrasound": {
    kicker: "3D 血管剖面与血流观察",
    title: "360° 观察：光滑管壁、内中膜增厚与局部斑块的区别",
    intro: "旋转半剖动脉管腔，看清超声探头扫查的是哪一层，以及斑块和血流通畅度之间的关系。",
    boundary: "本 3D 剖面仅用于区分管壁光滑、内中膜增厚与局部斑块的形态概念，不代表真实血管直径、血流速度或管腔狭窄百分比阈值。",
    camera: [0, 0.55, 6.2],
    modes: [
      { id: "smooth", label: "光滑通畅管壁", text: "动脉内壁平整光滑，管腔宽阔，血流平稳通过。" },
      { id: "imt", label: "内中膜轻度增厚", text: "管壁内层整体比年轻时略厚一层，多与年龄或长期血压血脂负荷相关，管腔仍保持通畅。" },
      { id: "plaque", label: "局部斑块隆起", text: "脂质与钙质在管壁一侧局部沉积隆起，多数小斑块不阻断血流，医生重点评估流速与稳定性。" },
    ],
    build({ THREE, scene }) {
      const root = new THREE.Group();
      scene.add(root);

      // Cutaway frosted arterial cylinder (open front-facing arc so inside is clearly visible)
      const outerWall = new THREE.Mesh(
        new THREE.CylinderGeometry(0.95, 0.95, 4.4, 36, 1, true, Math.PI * 0.15, Math.PI * 1.35),
        makeGlass(THREE, PALETTE.glassShell, { opacity: 0.45, roughness: 0.22, side: THREE.DoubleSide }),
      );
      outerWall.rotation.z = Math.PI / 2;
      root.add(outerWall);

      // End rims
      const rimMat = makeCeramic(THREE, 0xd9e6ea, { roughness: 0.35 });
      for (const x of [-2.2, 2.2]) {
        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.04, 12, 36), rimMat);
        rim.rotation.y = Math.PI / 2;
        rim.position.x = x;
        root.add(rim);
      }

      // IMT thickening subtle inner lining
      const imtMat = makeGlass(THREE, PALETTE.gold, { opacity: 0.55, roughness: 0.35, side: THREE.DoubleSide });
      const imtLayer = new THREE.Mesh(
        new THREE.CylinderGeometry(0.84, 0.84, 4.2, 32, 1, true, Math.PI * 0.2, Math.PI * 1.25),
        imtMat,
      );
      imtLayer.rotation.z = Math.PI / 2;
      root.add(imtLayer);

      // Local plaque crescent mound along lower inner wall
      const plaqueMat = makeCeramic(THREE, PALETTE.amber, { roughness: 0.32, clearcoat: 0.65 });
      const plaque = new THREE.Mesh(new THREE.SphereGeometry(0.68, 28, 20), plaqueMat);
      plaque.scale.set(1.55, 0.52, 0.72);
      plaque.position.set(0.05, -0.68, -0.05);
      root.add(plaque);

      // Minimalist ultrasound probe + pulsing teal sound arcs above
      const probe = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.34, 12, 20), makeCeramic(THREE, 0xe8eff2));
      probe.position.set(0.05, 1.56, 0);
      root.add(probe);
      const waveRings = [0, 1, 2].map(i => {
        const w = new THREE.Mesh(
          new THREE.TorusGeometry(0.28 + i * 0.2, 0.02, 10, 32, Math.PI * 0.7),
          makeGlow(THREE, PALETTE.tealLight, 0.56 - i * 0.12),
        );
        w.rotation.z = -Math.PI * 0.85;
        w.position.set(0.05, 1.24 - i * 0.18, 0);
        root.add(w);
        return w;
      });

      const smoothFlow = createCurveFlow(THREE, [[-2.2, 0, 0], [-0.8, 0, 0], [0.8, 0, 0], [2.2, 0, 0]], {
        radius: 0.04, tubeColor: PALETTE.arterial, particleColor: 0xf07a6f, particleCount: 14, particleRadius: 0.085, speed: 0.34,
      });
      const plaqueFlow = createCurveFlow(THREE, [[-2.2, -0.1, 0], [-0.9, 0.02, 0], [0.05, 0.36, 0.05], [1.0, 0.02, 0], [2.2, -0.1, 0]], {
        radius: 0.04, tubeColor: PALETTE.arterial, particleColor: 0xf07a6f, particleCount: 14, particleRadius: 0.085, speed: 0.44,
      });
      smoothFlow.setActive(true);
      plaqueFlow.setActive(true);
      root.add(smoothFlow.group, plaqueFlow.group);

      return {
        update(state, dt, elapsed, reducedMotion) {
          const mode = state?.mode || "smooth";
          imtLayer.visible = mode === "imt" || mode === "plaque";
          plaque.visible = mode === "plaque";
          smoothFlow.group.visible = mode !== "plaque";
          plaqueFlow.group.visible = mode === "plaque";
          smoothFlow.tick(dt, reducedMotion);
          plaqueFlow.tick(dt, reducedMotion);
          if (!reducedMotion) {
            waveRings.forEach((w, idx) => {
              const s = 1 + Math.sin(elapsed * 3 - idx * 0.7) * 0.06;
              w.scale.setScalar(s);
            });
          }
        },
      };
    },
  },
};

export function hasConcept3D(id) {
  return Boolean(CONFIGS[id]);
}

export default function ConceptSlice3D({ id }) {
  const config = CONFIGS[id];
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState(config?.modes?.[0]?.id || "");

  const buildScene = useCallback((ctx) => config?.build(ctx), [config]);

  if (!config) return null;
  const activeMode = config.modes.find(m => m.id === mode) || config.modes[0];

  return (
    <section className="concept-3d-box" id="article-concept-3d" aria-labelledby="concept-3d-title">
      <div className="concept-3d-head">
        <div>
          <span className="concept-3d-kicker">{config.kicker} · THREE.JS</span>
          <h3 id="concept-3d-title">{config.title}</h3>
          <p>{config.intro}</p>
        </div>
        <button
          type="button"
          className="body-map-toggle"
          aria-expanded={open}
          onClick={() => setOpen(v => !v)}
        >
          <Box size={15} aria-hidden="true" />
          {open ? "收起 3D 观察" : "打开 3D 观察"}
        </button>
      </div>
      {open && (
        <div className="concept-3d-stage">
          <ThreeStage
            ariaLabel={config.title}
            badge={config.kicker}
            hint="拖拽 360° 旋转观察 · 滚轮/双指缩放 · 点击下方切换形态"
            cameraPosition={config.camera || [0, 0.75, 5.4]}
            cameraTarget={[0, 0, 0]}
            buildScene={buildScene}
            sceneState={{ mode: activeMode.id }}
          />
          <div className="concept-3d-modes" role="group" aria-label="切换概念形态">
            {config.modes.map(item => (
              <button
                key={item.id}
                type="button"
                className={activeMode.id === item.id ? "active" : ""}
                onClick={() => setMode(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <p className="concept-3d-caption">
            <b>{activeMode.label}：</b>{activeMode.text}
          </p>
          <p className="concept-3d-note">
            <b>图示边界：</b>{config.boundary}
          </p>
        </div>
      )}
    </section>
  );
}
