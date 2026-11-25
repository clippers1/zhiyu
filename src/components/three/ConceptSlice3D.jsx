import React, { useCallback, useState } from "react";
import { Box } from "lucide-react";
import ThreeStage from "./ThreeStage";
import {
  createCurveFlow,
  makeCeramic,
  makeFresnelShell,
  makeGlass,
  makeGlow,
  makeOrganMaterial,
  PALETTE,
} from "./materials";

function makeOrganicSolidNodule(THREE, radius = 0.52) {
  const geo = new THREE.SphereGeometry(radius, 36, 28);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n =
      1 +
      0.065 * Math.sin(v.x * 6.2 + 0.5) * Math.cos(v.y * 5.4) +
      0.045 * Math.sin(v.z * 7.1 + v.y * 4.3);
    v.multiplyScalar(n);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

const CONFIGS = {
  "lung-nodule": {
    kicker: "3D 密度质感切片",
    title: "360° 对比：实性结节、纯磨玻璃（GGO）与部分实性长什么样？",
    intro: "文字里常说的「透见后方血管纹理」，转一圈透明肺叶切片就能一眼分清。",
    boundary: "本 3D 切片仅演示影像学中三种密度质感的视觉差别，不展示真实肺叶比例、毫米尺寸或良恶性判定标准。",
    camera: [1.1, 0.85, 5.1],
    modes: [
      { id: "ggo", label: "纯磨玻璃（GGO）", text: "像一层淡淡的磨砂薄雾，旋转观察时仍能隐约透过它看到背后的细微血管纹理。" },
      { id: "part-solid", label: "部分实性（混合型）", text: "外周是一圈半透明磨砂雾状晕，中央包含一颗致密不透光的实性核心。" },
      { id: "solid", label: "实性结节", text: "整体质地均匀致密、边界相对清晰，在影像上会遮挡后方的肺部细小血管。" },
    ],
    build({ THREE, scene, studio }) {
      const root = new THREE.Group();
      scene.add(root);
      if (studio?.pedestal) studio.pedestal.position.y = -1.68;

      // Frosted Fresnel CT lung parenchyma slab with crisp optical rim
      const tissueBox = new THREE.Mesh(
        new THREE.BoxGeometry(2.65, 2.05, 2.05),
        makeFresnelShell(THREE, {
          rimColor: 0x1e8a80,
          coreColor: 0xd9f1ee,
          rimPower: 1.75,
          rimStrength: 0.45,
          baseOpacity: 0.08,
          side: THREE.DoubleSide,
        }),
      );
      tissueBox.renderOrder = 6;
      root.add(tissueBox);

      // Subtle architectural CT slice wireframe edges
      const edgeGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(2.66, 2.06, 2.06));
      const edgeLines = new THREE.LineSegments(
        edgeGeo,
        new THREE.LineBasicMaterial({ color: 0x5aa6a0, transparent: true, opacity: 0.28 }),
      );
      root.add(edgeLines);

      // Organic branching pulmonary micro-vessels passing right through center (visual cue for GGO!)
      const arteryMat = makeOrganMaterial(THREE, 0x267977, { roughness: 0.3, clearcoat: 0.65, opacity: 0.94 });
      const veinMat = makeOrganMaterial(THREE, 0x457c9e, { roughness: 0.32, clearcoat: 0.6, opacity: 0.9 });
      const branches = [
        { pts: [[-1.25, -0.52, -0.26], [-0.45, -0.16, -0.06], [0.38, 0.18, 0.08], [1.24, 0.56, 0.24]], r: 0.044, mat: arteryMat },
        { pts: [[-0.45, -0.16, -0.06], [0.08, 0.48, -0.24], [0.68, 0.88, -0.34]], r: 0.03, mat: arteryMat },
        { pts: [[0.38, 0.18, 0.08], [0.78, -0.14, 0.36], [1.15, -0.42, 0.52]], r: 0.026, mat: arteryMat },
        { pts: [[-1.2, 0.44, 0.2], [-0.26, 0.12, -0.1], [0.54, -0.24, -0.18], [1.18, -0.56, -0.24]], r: 0.04, mat: veinMat },
        { pts: [[-0.26, 0.12, -0.1], [-0.62, -0.38, 0.34], [-0.96, -0.74, 0.56]], r: 0.025, mat: veinMat },
      ];
      for (const b of branches) {
        const c = new THREE.CatmullRomCurve3(b.pts.map((p) => new THREE.Vector3(...p)));
        root.add(new THREE.Mesh(new THREE.TubeGeometry(c, 36, b.r, 12, false), b.mat));
      }

      // Multi-layered soft volumetric GGO haze (outer soft cloud + inner denser mist)
      const ggoGroup = new THREE.Group();
      const ggoOuterMat = makeFresnelShell(THREE, {
        rimColor: 0xe69e8a,
        coreColor: 0xf7e3dc,
        rimPower: 1.4,
        rimStrength: 0.28,
        baseOpacity: 0.2,
      });
      const ggoInnerMat = makeGlass(THREE, 0xf2cfc2, {
        opacity: 0.34,
        transmission: 0.45,
        roughness: 0.82,
        clearcoat: 0.08,
        depthWrite: false,
      });
      const ggoOuter = new THREE.Mesh(makeOrganicSolidNodule(THREE, 0.74), ggoOuterMat);
      const ggoInner = new THREE.Mesh(makeOrganicSolidNodule(THREE, 0.58), ggoInnerMat);
      ggoOuter.renderOrder = 5;
      ggoInner.renderOrder = 4;
      ggoGroup.add(ggoOuter, ggoInner);
      root.add(ggoGroup);

      // Organic lobulated solid nodule core
      const solidMat = makeOrganMaterial(THREE, PALETTE.arterial, {
        roughness: 0.3,
        clearcoat: 0.72,
        opacity: 0.98,
      });
      const solidSphere = new THREE.Mesh(makeOrganicSolidNodule(THREE, 0.54), solidMat);
      solidSphere.renderOrder = 3;
      root.add(solidSphere);

      // Subtle glowing CT scan plane ring
      const scanPlane = new THREE.Mesh(
        new THREE.RingGeometry(1.62, 1.66, 64),
        new THREE.MeshBasicMaterial({ color: PALETTE.tealLight, transparent: true, opacity: 0.42, side: THREE.DoubleSide }),
      );
      scanPlane.rotation.x = Math.PI / 2;
      root.add(scanPlane);

      return {
        getPins(state) {
          const mode = state?.mode || "ggo";
          const label =
            mode === "ggo"
              ? { title: "磨玻璃薄雾（GGO）", subtitle: "后方细小血管仍隐约可见", tone: "amber" }
              : mode === "part-solid"
                ? { title: "磨玻璃晕 + 实性核心", subtitle: "外周半透 · 中央致密", tone: "arterial" }
                : { title: "均匀实性结节", subtitle: "边界清晰 · 遮挡后方血管", tone: "arterial" };
          return [{ id: "nodule-pin", pos: [0, 0.62, 0.25], ...label, active: true }];
        },
        update(state, dt, elapsed, reducedMotion) {
          const mode = state?.mode || "ggo";
          if (!reducedMotion) root.rotation.y += dt * 0.2;
          if (mode === "ggo") {
            ggoGroup.visible = true;
            ggoGroup.scale.setScalar(1.04);
            solidSphere.visible = false;
          } else if (mode === "part-solid") {
            ggoGroup.visible = true;
            ggoGroup.scale.setScalar(1.08);
            solidSphere.visible = true;
            solidSphere.scale.setScalar(0.52);
          } else {
            ggoGroup.visible = false;
            solidSphere.visible = true;
            solidSphere.scale.setScalar(1.0);
          }
          scanPlane.position.y = reducedMotion ? 0 : Math.sin(elapsed * 1.25) * 0.55;
        },
      };
    },
  },

  "bone-density": {
    kicker: "3D 骨小梁微结构切片",
    title: "360° 观察：致密骨小梁支架 vs 稀疏多孔支架",
    intro: "骨骼表面看起来完好，内部骨小梁却可能悄悄变细变疏；旋转这个有机骨小梁微结构就能直观看到差别。",
    boundary: "本 3D 模型为骨小梁微结构疏密概念对比，不代表任何具体部位的骨矿含量，也不包含 T 值或 Z 值诊断分界。",
    camera: [2.5, 1.8, 4.35],
    modes: [
      { id: "dense", label: "致密骨小梁支架", text: "纵横交错的立体蜂窝骨小梁厚实完整，能均匀分散日常承重与外力冲击。" },
      { id: "sparse", label: "稀疏多孔支架", text: "部分横向与斜向骨小梁变细甚至断开，内部孔隙明显增大，抗冲击能力下降。" },
    ],
    build({ THREE, scene, studio }) {
      const root = new THREE.Group();
      scene.add(root);
      if (studio?.pedestal) studio.pedestal.position.y = -1.78;

      // Translucent cortical bone outer shell cylinder (clean specimen core biopsy look!)
      const cortexMat = makeFresnelShell(THREE, {
        rimColor: 0x8f7a5e,
        coreColor: 0xf4eee4,
        rimPower: 1.8,
        rimStrength: 0.42,
        baseOpacity: 0.08,
        side: THREE.DoubleSide,
      });
      const cortex = new THREE.Mesh(new THREE.CylinderGeometry(1.36, 1.36, 2.25, 42, 1, true), cortexMat);
      cortex.renderOrder = 5;
      root.add(cortex);

      // Subtle ivory top/bottom cortical ring rims
      const rimMat = makeCeramic(THREE, 0xd8cbb6, { roughness: 0.45, clearcoat: 0.25 });
      for (const y of [-1.12, 1.12]) {
        const r = new THREE.Mesh(new THREE.TorusGeometry(1.36, 0.045, 14, 48), rimMat);
        r.rotation.x = Math.PI / 2;
        r.position.y = y;
        root.add(r);
      }

      // Deterministic pseudo-random organic trabecular node cloud inside cylinder
      let seed = 4219;
      const rand = () => {
        seed = (seed * 16807) % 2147483647;
        return (seed - 1) / 2147483646;
      };

      const nodes = [];
      for (let layer = -2; layer <= 2; layer++) {
        const yBase = layer * 0.48;
        // Center node + inner ring + outer ring with organic jitter
        nodes.push({ pos: new THREE.Vector3((rand() - 0.5) * 0.24, yBase + (rand() - 0.5) * 0.14, (rand() - 0.5) * 0.24), core: Math.abs(layer) <= 2 });
        const ringCount = 6;
        for (let k = 0; k < ringCount; k++) {
          const ang = (k / ringCount) * Math.PI * 2 + layer * 0.52 + (rand() - 0.5) * 0.32;
          const rad = 0.62 + (rand() - 0.5) * 0.2;
          nodes.push({
            pos: new THREE.Vector3(Math.cos(ang) * rad, yBase + (rand() - 0.5) * 0.18, Math.sin(ang) * rad),
            core: k % 2 === 0,
          });
        }
        const outerCount = 8;
        for (let k = 0; k < outerCount; k++) {
          const ang = (k / outerCount) * Math.PI * 2 + layer * 0.38 + (rand() - 0.5) * 0.22;
          const rad = 1.12 + (rand() - 0.5) * 0.14;
          nodes.push({
            pos: new THREE.Vector3(Math.cos(ang) * rad, yBase + (rand() - 0.5) * 0.16, Math.sin(ang) * rad),
            core: true,
          });
        }
      }

      const primaryBoneMat = makeCeramic(THREE, 0xcab698, { roughness: 0.44, clearcoat: 0.22 });
      const secondaryBoneMat = makeCeramic(THREE, 0xd8c6ab, { roughness: 0.48, clearcoat: 0.18 });

      // Organic flared trabecular strut geometry (slightly hourglass-tapered like real bone bridges!)
      const strutProfile = [
        new THREE.Vector2(1.45, -0.5),
        new THREE.Vector2(1.05, -0.32),
        new THREE.Vector2(0.84, 0),
        new THREE.Vector2(1.05, 0.32),
        new THREE.Vector2(1.45, 0.5),
      ];
      const strutGeo = new THREE.LatheGeometry(strutProfile, 12);
      const nodeGeo = new THREE.SphereGeometry(1, 12, 10);

      const coreStruts = [];
      const secondaryStruts = [];
      const nodeMeshes = [];
      const up = new THREE.Vector3(0, 1, 0);
      const dir = new THREE.Vector3();
      const mid = new THREE.Vector3();

      // Add organic rounded trabecular junction nodes
      for (const n of nodes) {
        const m = new THREE.Mesh(nodeGeo, n.core ? primaryBoneMat : secondaryBoneMat);
        m.position.copy(n.pos);
        m.scale.setScalar(0.115);
        root.add(m);
        nodeMeshes.push({ mesh: m, core: n.core });
      }

      // Connect nearby nodes to form organic 3D honeycomb trabeculae
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dist = nodes[i].pos.distanceTo(nodes[j].pos);
          if (dist < 0.35 || dist > 0.86) continue;
          const isVertical = Math.abs(nodes[i].pos.y - nodes[j].pos.y) > 0.34;
          const isCore = (nodes[i].core && nodes[j].core && isVertical) || (dist < 0.62 && (i + j) % 3 === 0);
          const m = new THREE.Mesh(strutGeo, isCore ? primaryBoneMat : secondaryBoneMat);
          mid.addVectors(nodes[i].pos, nodes[j].pos).multiplyScalar(0.5);
          dir.subVectors(nodes[j].pos, nodes[i].pos).normalize();
          m.position.copy(mid);
          m.quaternion.setFromUnitVectors(up, dir);
          m.userData.len = dist;
          m.scale.set(0.088, dist, 0.088);
          root.add(m);
          (isCore ? coreStruts : secondaryStruts).push(m);
        }
      }

      // Subtle DXA low-energy teal scan ring gliding vertically
      const dxaRing = new THREE.Mesh(
        new THREE.TorusGeometry(1.58, 0.02, 12, 64),
        makeGlow(THREE, PALETTE.tealLight, 0.48),
      );
      dxaRing.rotation.x = Math.PI / 2;
      root.add(dxaRing);

      return {
        getPins(state) {
          const sparse = state?.mode === "sparse";
          return [
            {
              id: "bone-pin",
              pos: [0.6, 0.85, 0.55],
              title: sparse ? "骨小梁变细 · 孔隙增大" : "骨小梁厚实 · 网架致密",
              subtitle: sparse ? "横向桥接减少" : "均匀承重缓冲",
              tone: sparse ? "amber" : "teal",
              active: true,
            },
          ];
        },
        update(state, dt, elapsed, reducedMotion) {
          const sparse = state?.mode === "sparse";
          if (!reducedMotion) root.rotation.y += dt * 0.22;
          const targetCoreR = sparse ? 0.052 : 0.095;
          for (const s of coreStruts) {
            const nr = s.scale.x + (targetCoreR - s.scale.x) * 0.14;
            s.scale.set(nr, s.userData.len, nr);
          }
          for (const s of secondaryStruts) {
            s.visible = !sparse;
            if (!sparse) s.scale.set(0.072, s.userData.len, 0.072);
          }
          for (const n of nodeMeshes) {
            n.mesh.visible = n.core || !sparse;
            const nr = sparse ? 0.072 : 0.112;
            n.mesh.scale.setScalar(nr);
          }
          dxaRing.position.y = reducedMotion ? 0 : Math.sin(elapsed * 1.05) * 0.92;
        },
      };
    },
  },

  "carotid-ultrasound": {
    kicker: "3D 血管剖面与血流观察",
    title: "360° 观察：光滑管壁、内中膜增厚与局部斑块的区别",
    intro: "旋转半剖动脉管腔，看清血管外膜/中膜/内膜层次，以及斑块和血流速度变化之间的关系。",
    boundary: "本 3D 剖面仅用于区分管壁光滑、内中膜增厚与局部斑块的形态概念，不代表真实血管直径、血流速度或管腔狭窄百分比阈值。",
    camera: [0, 0.55, 6.0],
    modes: [
      { id: "smooth", label: "光滑通畅管壁", text: "动脉内壁平整光滑，管腔宽阔，红细胞平稳层流通过。" },
      { id: "imt", label: "内中膜轻度增厚", text: "管壁内中膜层整体略厚一层，多与年龄或长期血压血脂负荷相关，管腔仍保持通畅。" },
      { id: "plaque", label: "局部斑块隆起", text: "脂质与钙质在管壁一侧局部沉积隆起，多数小斑块不阻断血流，医生重点评估流速与稳定性。" },
    ],
    build({ THREE, scene, studio }) {
      const root = new THREE.Group();
      scene.add(root);
      if (studio?.pedestal) studio.pedestal.position.y = -1.55;

      // 3-layer anatomical arterial cutaway: Adventitia (outer glass) + Media (rose wall) + Intima (inner lining)
      const arcStart = Math.PI * 0.12;
      const arcLen = Math.PI * 1.42;

      const adventitia = new THREE.Mesh(
        new THREE.CylinderGeometry(1.02, 1.02, 4.4, 42, 1, true, arcStart, arcLen),
        makeFresnelShell(THREE, {
          rimColor: 0x8e5656,
          coreColor: 0xebd7d5,
          rimPower: 1.8,
          rimStrength: 0.52,
          baseOpacity: 0.22,
          side: THREE.DoubleSide,
        }),
      );
      adventitia.rotation.z = Math.PI / 2;
      root.add(adventitia);

      const media = new THREE.Mesh(
        new THREE.CylinderGeometry(0.92, 0.92, 4.34, 42, 1, true, arcStart + 0.03, arcLen - 0.06),
        makeOrganMaterial(THREE, 0xd8887f, { opacity: 0.62, roughness: 0.34, side: THREE.DoubleSide }),
      );
      media.rotation.z = Math.PI / 2;
      root.add(media);

      // End cross-section arterial rims
      const rimMat = makeCeramic(THREE, 0xdfb1aa, { roughness: 0.36 });
      for (const x of [-2.2, 2.2]) {
        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.97, 0.055, 14, 42), rimMat);
        rim.rotation.y = Math.PI / 2;
        rim.position.x = x;
        root.add(rim);
      }

      // IMT thickening smooth inner lining layer
      const imtLayer = new THREE.Mesh(
        new THREE.CylinderGeometry(0.81, 0.81, 4.2, 36, 1, true, arcStart + 0.06, arcLen - 0.12),
        makeOrganMaterial(THREE, PALETTE.gold, { opacity: 0.65, roughness: 0.32, side: THREE.DoubleSide }),
      );
      imtLayer.rotation.z = Math.PI / 2;
      root.add(imtLayer);

      // Sculpted organic irregular plaque (inner lipid core + translucent fibrous cap)
      const plaqueGroup = new THREE.Group();
      const capGeo = makeOrganicSolidNodule(THREE, 0.66);
      capGeo.scale(1.62, 0.48, 0.72);
      const fibrousCap = new THREE.Mesh(
        capGeo,
        makeOrganMaterial(THREE, 0xe0a54f, { roughness: 0.3, clearcoat: 0.72, opacity: 0.94 }),
      );
      const lipidCore = new THREE.Mesh(
        new THREE.SphereGeometry(0.45, 22, 16),
        makeCeramic(THREE, 0xc77726, { roughness: 0.45 }),
      );
      lipidCore.scale.set(1.45, 0.42, 0.6);
      lipidCore.position.y = -0.08;
      plaqueGroup.add(fibrousCap, lipidCore);
      plaqueGroup.position.set(0.05, -0.66, -0.05);
      root.add(plaqueGroup);

      // Sleek modern ultrasound transducer probe + pulsing acoustic fan arcs above
      const probeGroup = new THREE.Group();
      const bodyMat = makeCeramic(THREE, 0xf2f6f8, { roughness: 0.2, clearcoat: 0.9 });
      const headMat = makeCeramic(THREE, PALETTE.teal, { roughness: 0.25, clearcoat: 0.8 });
      const handle = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.45, 14, 24), bodyMat);
      handle.position.y = 0.26;
      const tip = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.16, 0.28), headMat);
      tip.position.y = -0.08;
      probeGroup.add(handle, tip);
      probeGroup.position.set(0.05, 1.56, 0);
      root.add(probeGroup);

      const waveRings = [0, 1, 2].map((i) => {
        const w = new THREE.Mesh(
          new THREE.TorusGeometry(0.26 + i * 0.2, 0.018, 10, 36, Math.PI * 0.65),
          makeGlow(THREE, PALETTE.tealLight, 0.56 - i * 0.13),
        );
        w.rotation.z = -Math.PI * 0.825;
        w.position.set(0.05, 1.32 - i * 0.18, 0);
        root.add(w);
        return w;
      });

      // Multi-lane red blood stream (laminar smooth vs narrowed accelerated arch over plaque)
      const smoothFlow = createCurveFlow(THREE, [[-2.18, 0.08, 0.05], [-0.75, 0.08, 0.05], [0.75, 0.08, 0.05], [2.18, 0.08, 0.05]], {
        radius: 0.036, tubeColor: PALETTE.arterial, particleColor: 0xef6c60, particleCount: 14, particleRadius: 0.082, speed: 0.34,
      });
      const smoothFlow2 = createCurveFlow(THREE, [[-2.18, -0.22, -0.06], [-0.75, -0.22, -0.06], [0.75, -0.22, -0.06], [2.18, -0.22, -0.06]], {
        radius: 0.03, tubeColor: PALETTE.arterial, particleColor: 0xf48b80, particleCount: 11, particleRadius: 0.07, speed: 0.29,
      });
      const plaqueFlow = createCurveFlow(THREE, [[-2.18, -0.08, 0.04], [-0.95, 0.02, 0.04], [0.05, 0.38, 0.06], [1.05, 0.04, 0.04], [2.18, -0.08, 0.04]], {
        radius: 0.038, tubeColor: PALETTE.arterial, particleColor: 0xef6c60, particleCount: 15, particleRadius: 0.082, speed: 0.48,
      });
      smoothFlow.setActive(true);
      smoothFlow2.setActive(true);
      plaqueFlow.setActive(true);
      root.add(smoothFlow.group, smoothFlow2.group, plaqueFlow.group);

      return {
        getPins(state) {
          const mode = state?.mode || "smooth";
          if (mode === "plaque") {
            return [{ id: "carotid-pin", pos: [0.08, -0.42, 0.35], title: "局部斑块隆起", subtitle: "血流经狭窄处流速加快", tone: "amber", active: true }];
          }
          if (mode === "imt") {
            return [{ id: "carotid-pin", pos: [0.1, -0.78, 0.35], title: "内中膜层轻度增厚", subtitle: "管腔仍保持通畅", tone: "amber", active: true }];
          }
          return [{ id: "carotid-pin", pos: [0.1, 0.12, 0.35], title: "平稳层流 · 光滑管壁", subtitle: "外膜 / 中膜 / 内膜清晰", tone: "teal", active: true }];
        },
        update(state, dt, elapsed, reducedMotion) {
          const mode = state?.mode || "smooth";
          imtLayer.visible = mode === "imt" || mode === "plaque";
          plaqueGroup.visible = mode === "plaque";
          smoothFlow.group.visible = mode !== "plaque";
          smoothFlow2.group.visible = mode !== "plaque";
          plaqueFlow.group.visible = mode === "plaque";
          smoothFlow.tick(dt, reducedMotion);
          smoothFlow2.tick(dt, reducedMotion);
          plaqueFlow.tick(dt, reducedMotion);
          if (!reducedMotion) {
            waveRings.forEach((w, idx) => {
              const s = 1 + Math.sin(elapsed * 3.1 - idx * 0.7) * 0.06;
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
  const activeMode = config.modes.find((m) => m.id === mode) || config.modes[0];

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
          onClick={() => setOpen((v) => !v)}
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
            {config.modes.map((item) => (
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
