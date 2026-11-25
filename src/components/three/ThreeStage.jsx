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
  cameraPosition = [0, 0.5, 6.2],
  cameraTarget = [0, 0, 0],
  fov = 38,
  buildScene,
  sceneState,
  onPick,
  onFallback,
  fallback = null,
  controlsExtra = null,
}) {
  const mountRef = useRef(null);
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
    const onMotionChange = (e) => { reducedMotion = e.matches; };
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
          alpha: false,
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
        controls.minDistance = 2.6;
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

        const built = buildScene({
          THREE,
          scene,
          camera,
          controls,
          studio,
          glideTo,
          initialState: stateRef.current,
        }) || {};
        customDispose = built.dispose;

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
          const hit = hits.find(item => item.object?.userData?.partId);
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
          const hit = hits.find(item => item.object?.userData?.partId);
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
        };

        setStatus("ready");
        // Render first frame immediately so screenshots and reduced-motion see a crisp scene
        built.update?.(stateRef.current, 0.016, 0, reducedMotion, glideTo);
        controls.update();
        renderer.render(scene, camera);
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
    return fallback || (
      <div className="three-stage-fallback" role="status">
        当前设备暂不支持 WebGL 3D 视图，已保留静态图文解释。
      </div>
    );
  }

  return (
    <div className={`three-stage ${className}`.trim()}>
      <div className="three-stage-viewport">
        <div className="three-stage-host" ref={mountRef} />
        {status === "loading" && (
          <div className="three-stage-loading" role="status">
            <span className="three-stage-spinner" aria-hidden="true" />
            <span>正在加载 3D 互动舞台…</span>
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
    </div>
  );
}
