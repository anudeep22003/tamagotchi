// NOTE: This page uses Three.js. Please install it before running:
//   npm install three
// (Optional, but recommended for glow): uses EffectComposer/UnrealBloomPass from three/examples (included in three).
// No other packages are required.

import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type MutableRefObject,
} from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// A fully self-contained one-shot page that renders a striking Three.js brain-like geometric shell
// with chaotic electric particles that explode then converge to the center. It can run as a component
// inside your page or as a background visualizer via a toggle. Styled in grayscale using shadcn/ui.

type Quality = "low" | "medium" | "high";

type SceneRefs = {
  renderer: THREE.WebGLRenderer | null;
  scene: THREE.Scene | null;
  camera: THREE.PerspectiveCamera | null;
  composer: EffectComposer | null;
  particlePoints: THREE.Points | null;
  particlePositions: Float32Array | null;
  particleVelocities: Float32Array | null;
  particleGeometry: THREE.BufferGeometry | null;
  brainGroup: THREE.Group | null;
  clock: THREE.Clock | null;
  rafId: number | null;
};

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

const createParticleSystem = (count: number, radius: number) => {
  // Build particle geometry and data
  const positions = new Float32Array(count * 3);
  const velocities = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  // Random distribution inside sphere
  for (let i = 0; i < count; i++) {
    // Sample point within sphere
    const u = Math.random();
    const v = Math.random();
    const w = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    // Radius biased slightly towards surface for better look
    const r = radius * Math.cbrt(w) * (0.8 + 0.2 * Math.random());

    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);

    positions[i * 3 + 0] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    // Initial small random velocity
    velocities[i * 3 + 0] = (Math.random() - 0.5) * 0.01;
    velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.01;
    velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.01;

    // Color: grayscale whiteish
    const c = 0.9 + Math.random() * 0.1;
    colors[i * 3 + 0] = c;
    colors[i * 3 + 1] = c;
    colors[i * 3 + 2] = c;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  // Shader material for additive glowing points
  const material = new THREE.PointsMaterial({
    size: 0.02,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const points = new THREE.Points(geometry, material);

  return { points, positions, velocities, geometry };
};

// Builds a stylized "geometric brain" shell using layered wireframe icosahedrons with subtle animation-friendly parameters.
const createGeometricBrain = () => {
  const group = new THREE.Group();

  // Icosahedron-based shell layers for geometric look.
  const baseRadius = 1.2;
  const layers = [
    { scale: 1.0, opacity: 0.14, lineColor: 0xffffff, detail: 3 },
    { scale: 0.96, opacity: 0.12, lineColor: 0xffffff, detail: 4 },
    { scale: 1.05, opacity: 0.08, lineColor: 0xffffff, detail: 2 },
  ];

  for (const layer of layers) {
    const geo = new THREE.IcosahedronGeometry(baseRadius * layer.scale, layer.detail);
    // Turn geometry edges into line segments for wireframe
    const edges = new THREE.EdgesGeometry(geo);
    const mat = new THREE.LineBasicMaterial({
      color: layer.lineColor,
      transparent: true,
      opacity: layer.opacity,
    });
    const mesh = new THREE.LineSegments(edges, mat);
    group.add(mesh);
  }

  // A faint inner surface for subtle fill
  {
    const geo = new THREE.IcosahedronGeometry(baseRadius * 0.9, 2);
    const mat = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.05,
      wireframe: false,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    group.add(mesh);
  }

  return group;
};

// Computes a simple "curl-like" rotational component from a rotating axis to keep motion lively and brain-like.
const swirlForce = (pos: THREE.Vector3, time: number) => {
  // Rotate axis over time for chaotic feel
  const axis = new THREE.Vector3(
    Math.sin(time * 0.3),
    Math.cos(time * 0.21),
    Math.sin(time * 0.17)
  ).normalize();

  // Force perpendicular to axis using cross product
  const perp = new THREE.Vector3().copy(pos).cross(axis).normalize();
  const radius = Math.max(0.001, pos.length());
  const magnitude = 0.08 / (1.0 + radius * 6.0);
  return perp.multiplyScalar(magnitude);
};

// Main page
function BrainElectricVisualizationShowcase() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // UI state
  const [isBackground, setIsBackground] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [quality, setQuality] = useState<Quality>("high"); // default high looks best
  const [showHud, setShowHud] = useState(true);

  // Internal scene references
  const refs = useRef<SceneRefs>({
    renderer: null,
    scene: null,
    camera: null,
    composer: null,
    particlePoints: null,
    particlePositions: null,
    particleVelocities: null,
    particleGeometry: null,
    brainGroup: null,
    clock: null,
    rafId: null,
  });

  const particleCount = useMemo(() => {
    switch (quality) {
      case "low":
        return 1800;
      case "medium":
        return 4500;
      default:
        return 9000;
    }
  }, [quality]);

  const bloomStrength = useMemo(() => {
    switch (quality) {
      case "low":
        return 0.8;
      case "medium":
        return 1.1;
      default:
        return 1.4;
    }
  }, [quality]);

  // Initialization of Three.js scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Clean any previous canvas on quality/background toggles
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x000000, 8, 15);

    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 100);
    camera.position.set(0, 0.8, 3.2);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: isBackground, // transparent when used as background
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(clamp(window.devicePixelRatio, 1, quality === "high" ? 2 : 1.5));
    renderer.setClearColor(isBackground ? 0x000000 : 0x000000, isBackground ? 0 : 1);

    container.appendChild(renderer.domElement);

    // Lights: balanced grayscale
    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    scene.add(ambient);
    const keyLight = new THREE.PointLight(0xffffff, 1.0, 0, 2);
    keyLight.position.set(4, 3, 7);
    scene.add(keyLight);
    const rimLight = new THREE.PointLight(0xffffff, 0.8, 0, 2);
    rimLight.position.set(-6, -2, -4);
    scene.add(rimLight);

    // Brain group
    const brain = createGeometricBrain();
    scene.add(brain);

    // Slight continuous rotation for life
    brain.rotation.z = 0.25;

    // Particles inside brain
    const { points, positions, velocities, geometry } = createParticleSystem(
      particleCount,
      1.0
    );
    scene.add(points);

    // Postprocessing for glow
    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      bloomStrength,
      0.9,
      0.01
    );
    composer.addPass(bloomPass);

    // Store refs
    refs.current.scene = scene;
    refs.current.camera = camera;
    refs.current.renderer = renderer;
    refs.current.composer = composer;
    refs.current.particlePoints = points;
    refs.current.particlePositions = positions;
    refs.current.particleVelocities = velocities;
    refs.current.particleGeometry = geometry;
    refs.current.brainGroup = brain;
    refs.current.clock = new THREE.Clock();

    // Handle resize
    const handleResize = () => {
      if (!container || !refs.current.renderer || !refs.current.camera || !refs.current.composer) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      refs.current.renderer.setSize(w, h);
      refs.current.renderer.setPixelRatio(
        clamp(window.devicePixelRatio, 1, quality === "high" ? 2 : 1.5)
      );
      refs.current.camera.aspect = w / h;
      refs.current.camera.updateProjectionMatrix();
      refs.current.composer.setSize(w, h);
    };
    const ro = new ResizeObserver(handleResize);
    ro.observe(container);

    // Animation loop
    let explosionPhase = 1.0; // start with a strong outward "blow up"
    const tmp = new THREE.Vector3();

    const animate = () => {
      if (!refs.current.scene || !refs.current.camera || !refs.current.composer || !refs.current.particleGeometry || !refs.current.particlePositions || !refs.current.particleVelocities || !refs.current.brainGroup || !refs.current.clock) {
        refs.current.rafId = requestAnimationFrame(animate);
        return;
      }

      const dt = refs.current.clock.getDelta();
      const t = refs.current.clock.elapsedTime;

      // Animate brain subtle breathing and slow rotation
      const breathe = 1.0 + Math.sin(t * 1.2) * 0.015;
      refs.current.brainGroup.scale.setScalar(breathe);
      refs.current.brainGroup.rotation.y += 0.0035;
      refs.current.brainGroup.rotation.x = Math.sin(t * 0.3) * 0.08 + 0.1;

      // Update particles
      const pos = refs.current.particlePositions;
      const vel = refs.current.particleVelocities;

      // Decay explosion phase over ~6 seconds
      explosionPhase = Math.max(0, explosionPhase - dt * 0.16);

      for (let i = 0; i < pos.length; i += 3) {
        const x = pos[i + 0];
        const y = pos[i + 1];
        const z = pos[i + 2];

        tmp.set(x, y, z);

        // Outward push early on
        let force = new THREE.Vector3();
        if (explosionPhase > 0) {
          const outward = tmp.length() > 0 ? tmp.clone().normalize() : new THREE.Vector3(0, 0, 0);
          // strong at start, quickly taper
          force.add(outward.multiplyScalar(0.6 * explosionPhase));
        }

        // Chaotic swirl around dynamic axis
        force.add(swirlForce(tmp, t));

        // Attraction to center (convergence)
        const toCenter = tmp.clone().multiplyScalar(-1);
        const dist = tmp.length();
        const attractStrength = 0.045 + 0.02 * Math.sin(t * 0.7 + dist * 3.0);
        toCenter.normalize().multiplyScalar(attractStrength);
        force.add(toCenter);

        // Add small jitter noise
        const jitter = 0.005;
        force.x += (Math.random() - 0.5) * jitter;
        force.y += (Math.random() - 0.5) * jitter;
        force.z += (Math.random() - 0.5) * jitter;

        // Integrate velocity
        vel[i + 0] = vel[i + 0] * 0.94 + force.x * dt * 60;
        vel[i + 1] = vel[i + 1] * 0.94 + force.y * dt * 60;
        vel[i + 2] = vel[i + 2] * 0.94 + force.z * dt * 60;

        // Apply velocity
        pos[i + 0] += vel[i + 0] * dt;
        pos[i + 1] += vel[i + 1] * dt;
        pos[i + 2] += vel[i + 2] * dt;

        // Soft bounds to keep particles in scene vicinity
        const softLimit = 2.2;
        if (Math.abs(pos[i + 0]) > softLimit || Math.abs(pos[i + 1]) > softLimit || Math.abs(pos[i + 2]) > softLimit) {
          pos[i + 0] *= 0.9;
          pos[i + 1] *= 0.9;
          pos[i + 2] *= 0.9;
        }
      }

      // Flag update to GPU
      refs.current.particleGeometry.attributes.position.needsUpdate = true;

      // Render with bloom
      refs.current.composer.render();

      refs.current.rafId = requestAnimationFrame(animate);
    };

    refs.current.rafId = requestAnimationFrame(animate);

    // Cleanup
    return () => {
      ro.disconnect();
      if (refs.current.rafId) cancelAnimationFrame(refs.current.rafId);
      renderer.dispose();
      geometry.dispose();
      container.innerHTML = "";
    };
    // Rebuild if quality or background toggles
  }, [particleCount, bloomStrength, isBackground, quality]);

  const handlePauseToggle = useCallback(() => {
    const { rafId } = refs.current;
    if (!isPaused) {
      if (rafId) cancelAnimationFrame(rafId);
      setIsPaused(true);
    } else {
      // resume
      if (refs.current.clock) refs.current.clock.getDelta(); // reset delta to avoid jump
      const animate = () => {
        if (!refs.current.scene || !refs.current.camera || !refs.current.composer || !refs.current.particleGeometry || !refs.current.particlePositions || !refs.current.particleVelocities || !refs.current.brainGroup || !refs.current.clock) {
          refs.current.rafId = requestAnimationFrame(animate);
          return;
        }
        const dt = refs.current.clock.getDelta();
        const t = refs.current.clock.elapsedTime;

        // Minimal resume step: just render once then hand back to main effect loop
        refs.current.brainGroup.rotation.y += 0.0035;
        refs.current.composer.render();
        refs.current.rafId = requestAnimationFrame(animate);
      };
      refs.current.rafId = requestAnimationFrame(animate);
      setIsPaused(false);
    }
  }, [isPaused]);

  const handleReset = useCallback(() => {
    // Soft reset: randomize particle positions/velocities in current system
    if (!refs.current.particleGeometry || !refs.current.particlePositions || !refs.current.particleVelocities) return;

    const pos = refs.current.particlePositions;
    const vel = refs.current.particleVelocities;

    for (let i = 0; i < pos.length; i += 3) {
      const u = Math.random();
      const v = Math.random();
      const w = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = 1.0 * Math.cbrt(w) * (0.8 + 0.2 * Math.random());

      pos[i + 0] = r * Math.sin(phi) * Math.cos(theta);
      pos[i + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i + 2] = r * Math.cos(phi);

      vel[i + 0] = (Math.random() - 0.5) * 0.01;
      vel[i + 1] = (Math.random() - 0.5) * 0.01;
      vel[i + 2] = (Math.random() - 0.5) * 0.01;
    }

    refs.current.particleGeometry.attributes.position.needsUpdate = true;
  }, []);

  // Styles switch to background mode: canvas fills the viewport behind content
  const backgroundWrapperClass = isBackground
    ? "fixed inset-0 -z-10 pointer-events-none"
    : "relative w-full h-[70vh] md:h-[78vh] rounded-xl overflow-hidden border border-zinc-800";

  return (
    <div className="min-h-[100dvh] w-full bg-black text-white">
      {/* Header / minimal navbar */}
      <div className="mx-auto w-full max-w-6xl px-4 pt-6 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="border-zinc-700 text-zinc-300">
            THREE
          </Badge>
          <h1 className="text-lg md:text-2xl font-semibold tracking-tight text-zinc-100">
            Geometric Brain — Electric Convergence
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="border-zinc-700 text-zinc-200 hover:bg-zinc-900"
            onClick={() => setShowHud((v) => !v)}
          >
            {showHud ? "Hide UI" : "Show UI"}
          </Button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl px-4">
        <Card className="bg-zinc-950/70 border-zinc-900">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-sm uppercase tracking-wider text-zinc-500">
                  Visualization
                </span>
                <span className="text-xl md:text-2xl font-medium text-zinc-100">
                  Chaotic Sparks within a Geometric Brain
                </span>
              </div>
              <div className="hidden md:flex items-center gap-2">
                <Badge className="bg-white text-black">Grayscale</Badge>
                <Badge variant="outline" className="border-zinc-700 text-zinc-300">
                  Glow
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className={backgroundWrapperClass}>
              {/* Canvas container: we mount Three.js renderer here */}
              <div ref={containerRef} className="w-full h-full" />
            </div>
          </CardContent>

          {showHud && (
            <CardFooter className="flex flex-col md:flex-row items-stretch md:items-center gap-3 justify-between">
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setIsBackground((v) => !v)}
                  className="bg-white text-black hover:bg-zinc-200"
                >
                  {isBackground ? "Use as Inline Component" : "Use as Page Background"}
                </Button>
                <Button
                  variant="outline"
                  className="border-zinc-700 text-zinc-200 hover:bg-zinc-900"
                  onClick={handlePauseToggle}
                >
                  {isPaused ? "Play" : "Pause"}
                </Button>
                <Button
                  variant="outline"
                  className="border-zinc-700 text-zinc-200 hover:bg-zinc-900"
                  onClick={handleReset}
                >
                  Reset Sparks
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-400">Quality:</span>
                <Button
                  variant={quality === "low" ? "default" : "outline"}
                  className={
                    quality === "low"
                      ? "bg-white text-black"
                      : "border-zinc-700 text-zinc-200 hover:bg-zinc-900"
                  }
                  onClick={() => setQuality("low")}
                >
                  Low
                </Button>
                <Button
                  variant={quality === "medium" ? "default" : "outline"}
                  className={
                    quality === "medium"
                      ? "bg-white text-black"
                      : "border-zinc-700 text-zinc-200 hover:bg-zinc-900"
                  }
                  onClick={() => setQuality("medium")}
                >
                  Med
                </Button>
                <Button
                  variant={quality === "high" ? "default" : "outline"}
                  className={
                    quality === "high"
                      ? "bg-white text-black"
                      : "border-zinc-700 text-zinc-200 hover:bg-zinc-900"
                  }
                  onClick={() => setQuality("high")}
                >
                  High
                </Button>
              </div>
            </CardFooter>
          )}
        </Card>

        <div className="mt-6 text-sm text-zinc-500 leading-relaxed">
          Tip: Toggle “Use as Page Background” to float the visualization behind your content. It is designed to
          be minimal, grayscale, and high-contrast so it complements most layouts.
        </div>
      </div>
    </div>
  );
}

export default BrainElectricVisualizationShowcase;