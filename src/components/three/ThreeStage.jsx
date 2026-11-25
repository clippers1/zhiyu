import React, { useEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { disposeObject, setupStudio } from "./materials";
import "./three-stage.css";

function supportsWebGL() {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext("webgl2") || canvas.getContext("webgl")),
    );
  } catch {
    return false;
  }
}

export default function ThreeStage({
  className = "",
  ariaLabel = "3D 互动示意图",
  badge = "3D 互动沙盘",
  hint = "拖拽旋转 · 滚轮/双指缩放 · 点击高亮结构",
  attribution = null,
  cameraPosition = [0, 0.5, 6.2],
  cameraTarget = [0, 0, 0],
  fov = 36,
  buildScene,
  sceneState,
  onPick,
  onFallback,
  fallback = null,
  controlsExtra = null,
}) {
  const mountRef = useRef(null);
  const pinsRef = useRef(null);
  const stateRef = useRef(sceneState);
  const pickRef = useRef(onPick);
  const fallbackRef = useRef(onFallback);
  const resetFnRef = useRef(null);
  const [status, setStatus] = useState("loading"); // loading | ready | unavailable

  stateRef.current = sceneState;
  pickRef.current = onPick;
  fallbackRef.current = onFallback;

  useEffect(() => {
    const container = mountRef.current;
    if (!container || typeof window === "undefined") return;
    if (!supportsWebGL()) {
      setStatus("unavailable");
      fallbackRef.current?.();
      return;
    }

    let cancelled = false;
    let renderer;
    let studio;
    let controls;
    let scene;
    let camera;
    let rafId = 0;
    let customDispose;
    let resizeObserver;
    let intersectionObserver;
    let visible = true;
    let reducedMotion = Boolean(
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches,
    );

    const mediaQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const onMotionChange = (e) => {
      reducedMotion = e.matches;
    };
    mediaQuery?.addEventListener?.("change", onMotionChange);

    async function init() {
      try {
        const [THREE, { OrbitControls }, { RoomEnvironment }] = await Promise.all([
          import("three"),
          import("three/examples/jsm/controls/OrbitControls.js"),
          import("three/examples/jsm/environments/RoomEnvironment.js"),
        ]);
        if (cancelled || !mountRef.current) return;

        const width = Math.max(240, container.clientWidth || 560);
        const height = Math.max(240, container.clientHeight || 360);

        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(fov, width / height, 0.1, 100);
        camera.position.set(...cameraPosition);

        renderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(width, height, false);
        renderer.domElement.className = "three-stage-canvas";
        renderer.domElement.setAttribute("role", "img");
        renderer.domElement.setAttribute("aria-label", ariaLabel);
        container.innerHTML = "";
        container.appendChild(renderer.domElement);

        studio = setupStudio(THREE, RoomEnvironment, scene, renderer);

        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;
        controls.enablePan = false;
        controls.minDistance = 2.4;
        controls.maxDistance = 11.5;
        controls.maxPolarAngle = Math.PI * 0.88;
        controls.minPolarAngle = Math.PI * 0.12;
        controls.target.set(...cameraTarget);
        controls.update();

        const desiredCamPos = new THREE.Vector3(...cameraPosition);
        const desiredTarget = new THREE.Vector3(...cameraTarget);
        let gliding = false;

        controls.addEventListener("start", () => {
          gliding = false;
        });

        const glideTo = (pos, target) => {
          if (pos) desiredCamPos.set(...pos);
          if (target) desiredTarget.set(...target);
          gliding = true;
        };

        resetFnRef.current = () => {
          glideTo(cameraPosition, cameraTarget);
        };

        // Support both sync and async buildScene (e.g. awaiting compressed GLB loads)
        const built =
          (await buildScene({
            THREE,
            scene,
            camera,
            controls,
            studio,
            glideTo,
            initialState: stateRef.current,
          })) || {};
        if (cancelled) {
          built.dispose?.();
          return;
        }
        customDispose = built.dispose;

        // Projected 3D-to-2D HTML callout pins (DOM-driven for 60 FPS with zero React churn)
        const pinNodes = new Map();
        const projVec = new THREE.Vector3();
        const updatePins = () => {
          const pinHost = pinsRef.current;
          if (!pinHost || typeof built.getPins !== "function") return;
          const items = built.getPins(stateRef.current) || [];
          const activeIds = new Set();
          const w = container.clientWidth || width;
          const h = container.clientHeight || height;

          for (const item of items) {
            activeIds.add(item.id);
            let el = pinNodes.get(item.id);
            if (!el) {
              el = document.createElement("div");
              el.className = "three-pin";
              const dot = document.createElement("span");
              dot.className = "three-pin-dot";
              const card = document.createElement("span");
              card.className = "three-pin-card";
              const title = document.createElement("b");
              const sub = document.createElement("small");
              card.append(title, sub);
              el.append(dot, card);
              pinHost.appendChild(el);
              pinNodes.set(item.id, el);
            }
            const titleEl = el.querySelector("b");
            const subEl = el.querySelector("small");
            if (titleEl && titleEl.textContent !== item.title) titleEl.textContent = item.title;
            const subText = item.subtitle || "";
            if (subEl && subEl.textContent !== subText) subEl.textContent = subText;
            if (subEl) subEl.style.display = subText ? "" : "none";
            el.dataset.active = item.active ? "true" : "false";
            if (item.tone) el.dataset.tone = item.tone;

            if (item.worldObject) {
              item.worldObject.getWorldPosition(projVec);
              if (item.offset) projVec.add(item.offset);
            } else if (Array.isArray(item.pos)) {
              projVec.set(item.pos[0], item.pos[1], item.pos[2]);
            }
            projVec.project(camera);
            if (projVec.z > 1) {
              el.style.opacity = "0";
              continue;
            }
            const sx = (projVec.x * 0.5 + 0.5) * w;
            const sy = (-projVec.y * 0.5 + 0.5) * h;
            const padX = 16;
            const padY = 44;
            const clampedX = Math.max(padX, Math.min(w - padX, sx));
            const clampedY = Math.max(padY, Math.min(h - 24, sy));
            // Flip label left when pin is on the right half so it never clips off the edge
            el.dataset.side = clampedX > w * 0.58 ? "left" : "right";
            el.style.opacity = "1";
            el.style.left = `${clampedX.toFixed(1)}px`;
            el.style.top = `${clampedY.toFixed(1)}px`;
          }
          for (const [id, el] of pinNodes.entries()) {
            if (!activeIds.has(id)) {
              el.remove();
              pinNodes.delete(id);
            }
          }
        };

        // Pointer click picking vs orbit drag
        const raycaster = new THREE.Raycaster();
        const pointer = new THREE.Vector2();
        let downX = 0;
        let downY = 0;

        const onPointerDown = (event) => {
          downX = event.clientX;
          downY = event.clientY;
        };

        const onPointerUp = (event) => {
          const dist = Math.hypot(event.clientX - downX, event.clientY - downY);
          if (dist > 7 || !pickRef.current) return;
          const rect = renderer.domElement.getBoundingClientRect();
          pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
          pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
          raycaster.setFromCamera(pointer, camera);
          const hits = raycaster.intersectObjects(scene.children, true);
          const hit = hits.find((item) => item.object?.userData?.partId);
          if (hit) {
            pickRef.current(hit.object.userData.partId);
          }
        };

        const onPointerMove = (event) => {
          if (!pickRef.current) return;
          const rect = renderer.domElement.getBoundingClientRect();
          pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
          pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
          raycaster.setFromCamera(pointer, camera);
          const hits = raycaster.intersectObjects(scene.children, true);
          const hit = hits.find((item) => item.object?.userData?.partId);
          renderer.domElement.style.cursor = hit ? "pointer" : "grab";
        };

        const onContextLost = (event) => {
          event.preventDefault();
          setStatus("unavailable");
          fallbackRef.current?.();
        };

        renderer.domElement.addEventListener("pointerdown", onPointerDown);
        renderer.domElement.addEventListener("pointerup", onPointerUp);
        renderer.domElement.addEventListener("pointermove", onPointerMove);
        renderer.domElement.addEventListener("webglcontextlost", onContextLost);

        resizeObserver = new ResizeObserver(() => {
          if (!container || !renderer || !camera) return;
          const w = Math.max(240, container.clientWidth);
          const h = Math.max(240, container.clientHeight);
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h, false);
          updatePins();
        });
        resizeObserver.observe(container);

        intersectionObserver = new IntersectionObserver(
          (entries) => {
            visible = Boolean(entries[0]?.isIntersecting);
          },
          { threshold: 0.05 },
        );
        intersectionObserver.observe(container);

        let lastTime = performance.now();
        let elapsed = 0;

        const loop = (now) => {
          if (cancelled) return;
          rafId = window.requestAnimationFrame(loop);
          if (!visible || document.hidden) {
            lastTime = now;
            return;
          }
          const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
          lastTime = now;
          if (!reducedMotion) elapsed += dt;

          if (gliding) {
            const factor = reducedMotion ? 1 : Math.min(1, dt * 5.2);
            camera.position.lerp(desiredCamPos, factor);
            controls.target.lerp(desiredTarget, factor);
            if (
              camera.position.distanceTo(desiredCamPos) < 0.02 &&
              controls.target.distanceTo(desiredTarget) < 0.02
            ) {
              gliding = false;
            }
          }

          built.update?.(stateRef.current, dt, elapsed, reducedMotion, glideTo);
          controls.update();
          renderer.render(scene, camera);
          updatePins();
        };

        setStatus("ready");
        built.update?.(stateRef.current, 0.016, 0, reducedMotion, glideTo);
        controls.update();
        renderer.render(scene, camera);
        updatePins();
        rafId = window.requestAnimationFrame(loop);
      } catch {
        if (!cancelled) {
          setStatus("unavailable");
          fallbackRef.current?.();
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      mediaQuery?.removeEventListener?.("change", onMotionChange);
      if (rafId) window.cancelAnimationFrame(rafId);
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      if (pinsRef.current) pinsRef.current.innerHTML = "";
      customDispose?.();
      controls?.dispose();
      studio?.dispose();
      disposeObject(scene);
      if (renderer) {
        renderer.dispose();
        renderer.domElement?.remove();
      }
      resetFnRef.current = null;
    };
  }, [buildScene, ariaLabel, fov]);

  if (status === "unavailable") {
    return (
      fallback || (
        <div className="three-stage-fallback" role="status">
          当前设备暂不支持 WebGL 3D 视图，已保留静态图文解释。
        </div>
      )
    );
  }

  return (
    <div className={`three-stage ${className}`.trim()}>
      <div className="three-stage-viewport">
        <div className="three-stage-host" ref={mountRef} />
        <div className="three-stage-pins" ref={pinsRef} aria-hidden="true" />
        {status === "loading" && (
          <div className="three-stage-loading" role="status">
            <span className="three-stage-spinner" aria-hidden="true" />
            <span>正在加载真实 3D 解剖模型…</span>
          </div>
        )}
      </div>
      {badge && <span className="three-stage-badge">{badge}</span>}
      <button
        type="button"
        className="three-stage-reset"
        onClick={() => resetFnRef.current?.()}
        aria-label="重置 3D 视角"
      >
        <RotateCcw size={14} aria-hidden="true" />
        <span>重置视角</span>
      </button>
      {controlsExtra && <div className="three-stage-extra">{controlsExtra}</div>}
      {hint && <p className="three-stage-hint">{hint}</p>}
      {attribution && (
        <p className="three-stage-attribution">
          3D 解剖模型：
          <a href={attribution.url} target="_blank" rel="noreferrer">
            {attribution.name}
          </a>
          {" · "}
          <a href={attribution.licenseUrl} target="_blank" rel="noreferrer">
            {attribution.license}
          </a>
        </p>
      )}
    </div>
  );
}
