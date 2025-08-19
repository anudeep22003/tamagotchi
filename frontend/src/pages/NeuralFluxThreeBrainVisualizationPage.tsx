// IMPORTANT: This page requires the "three" package.
// Please install it before running:
//   npm install three
//
// This file is a single page you can drop into your src/pages folder.
// Then add a route to it in your routes.tsx. It is default-exported as required.

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  useLayoutEffect,
} from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// A single, one-shot page that builds a geometric "brain" and animated electrical particles
// using Three.js. The animation cycles between:
// - Calm equilibrium (particles loosely distributed inside)
// - Controlled outward burst (not too chaotic)
// - Convergence back to a loose inner shell (no dark clumping)
// - Rhythmic pulses traveling along pathways to the boundary, fading out on contact.
//
// The UI is grayscale, elegant, with controls to play with parameters.
// This uses only dependencies available + "three" which you must install (see top comment).

type Controls = {
  particleCount: number;
  particleSize: number;
  baseSpeed: number;
  outwardIntensity: number;
  convergenceStrength: number;
  pulseIntervalSec: number;
  burstIntervalSec: number;
  brainScale: { x: number; y: number; z: number };
  brightness: number;
};

type RuntimeRefs = {
  // Three objects and runtime state assigned after dynamic import
  THREE?: any;
  renderer?: any;
  scene?: any;
  camera?: any;
  brainGroup?: any;
  brainWire?: any;
  particles?: any; // THREE.Points
  particleGeo?: any; // THREE.BufferGeometry
  particleMat?: any; // THREE.PointsMaterial
  trailPool?: TrailPool | null;
  clock?: any; // THREE.Clock

  // Simulation buffers
  positions?: Float32Array;
  velocities?: Float32Array;
  life?: Float32Array;

  // Bookkeeping
  mounted: boolean;
  lastPulseAt: number;
  lastBurstAt: number;
  currentPhase: "calm" | "burst" | "converge" | "pulse";
  eqTargetRadius: number;
  desiredShellThickness: number;
  boundaryRadiusFn?: (x: number, y: number, z: number) => number;
};

class TrailPool {
  // Simple pool of "pathway" trails that propagate outward and fade at the boundary
  private THREE: any;
  private scene: any;
  private pool: Trail[];
  private active: Trail[];
  private max: number;
  private boundsFn: (x: number, y: number, z: number) => number;

  constructor(THREE: any, scene: any, maxTrails: number, boundaryRadiusFn: (x: number, y: number, z: number) => number) {
    this.THREE = THREE;
    this.scene = scene;
    this.pool = [];
    this.active = [];
    this.max = maxTrails;
    this.boundsFn = boundaryRadiusFn;
    for (let i = 0; i < maxTrails; i++) {
      this.pool.push(new Trail(THREE, scene, boundaryRadiusFn));
    }
  }

  spawnPathway(origin: { x: number; y: number; z: number }, dirHint: { x: number; y: number; z: number }, brightness: number) {
    const t = this.pool.pop();
    if (!t) return;
    t.spawn(origin, dirHint, brightness);
    this.active.push(t);
  }

  update(dt: number) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const t = this.active[i];
      t.update(dt);
      if (t.dead) {
        t.disposeToPool();
        this.pool.push(t);
        this.active.splice(i, 1);
      }
    }
  }

  dispose() {
    [...this.pool, ...this.active].forEach((t) => t.disposeToPool(true));
    this.pool = [];
    this.active = [];
  }
}

class Trail {
  private THREE: any;
  private scene: any;
  private boundaryRadiusFn: (x: number, y: number, z: number) => number;
  private curve: any | null;
  private geo: any | null;
  private mat: any | null;
  private line: any | null;
  private t: number;
  private speed: number;
  private fade: number;
  public dead: boolean;

  constructor(THREE: any, scene: any, boundaryRadiusFn: (x: number, y: number, z: number) => number) {
    this.THREE = THREE;
    this.scene = scene;
    this.boundaryRadiusFn = boundaryRadiusFn;
    this.curve = null;
    this.geo = null;
    this.mat = null;
    this.line = null;
    this.t = 0;
    this.speed = 0.35 + Math.random() * 0.45;
    this.fade = 1;
    this.dead = true;
  }

  spawn(origin: { x: number; y: number; z: number }, dirHint: { x: number; y: number; z: number }, brightness: number) {
    // Build a cubic Bezier that heads outward and ends on boundary
    const o = new this.THREE.Vector3(origin.x, origin.y, origin.z);
    const dir = new this.THREE.Vector3(dirHint.x, dirHint.y, dirHint.z).normalize();
    if (dir.lengthSq() < 1e-6) dir.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();

    const p0 = o.clone();
    const p1 = o.clone().add(dir.clone().multiplyScalar(0.6 + Math.random() * 0.6));
    const p2 = p1.clone().add(new this.THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(0.8));
    // Project p3 to boundary along direction
    const endDir = p2.clone().normalize();
    const R = this.boundaryRadiusFn(endDir.x, endDir.y, endDir.z);
    const p3 = endDir.multiplyScalar(R);

    this.curve = new this.THREE.CubicBezierCurve3(p0, p1, p2, p3);

    const points = this.curve.getPoints(60);
    this.geo = new this.THREE.BufferGeometry().setFromPoints(points);
    this.mat = new this.THREE.LineBasicMaterial({
      color: new this.THREE.Color(brightness, brightness, brightness),
      transparent: true,
      opacity: 0.9,
    });
    this.line = new this.THREE.Line(this.geo, this.mat);
    this.scene.add(this.line);

    this.t = 0;
    this.fade = 1;
    this.dead = false;
  }

  update(dt: number) {
    if (this.dead || !this.curve || !this.line || !this.mat) return;
    // Reveal more of the curve by updating geometry draw range and fade at the tip
    this.t += dt * this.speed;
    const total = 60;
    const shown = Math.min(total, Math.floor(this.t * total));
    this.line.geometry.setDrawRange(0, shown > 2 ? shown : 2);

    // Fade out when we reach the boundary
    if (shown >= total) {
      this.fade -= dt * 1.2;
      this.mat.opacity = Math.max(0, this.fade * 0.9);
      if (this.fade <= 0) {
        this.dead = true;
      }
    }
  }

  disposeToPool(hard = false) {
    if (this.line) {
      this.scene.remove(this.line);
      if (hard) {
        this.line.geometry.dispose();
        this.mat?.dispose();
      }
    }
    this.curve = null;
    this.geo = null;
    this.mat = null;
    this.line = null;
    this.t = 0;
    this.fade = 1;
    this.dead = true;
  }
}

function useResizeObserver(ref: React.RefObject<HTMLDivElement>, cb: (w: number, h: number) => void) {
  useLayoutEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const cr = e.contentRect;
        cb(cr.width, cr.height);
      }
    });
    ro.observe(ref.current);
    return () => {
      ro.disconnect();
    };
  }, [ref, cb]);
}

const defaultControls: Controls = {
  particleCount: 2000,
  particleSize: 4.5,
  baseSpeed: 0.55,
  outwardIntensity: 0.8,
  convergenceStrength: 0.22,
  pulseIntervalSec: 3.5,
  burstIntervalSec: 12,
  brainScale: { x: 1.2, y: 1.0, z: 1.5 },
  brightness: 0.95,
};

function seededNoise3(x: number, y: number, z: number): number {
  // Fast hash-based pseudo-noise in [-1, 1]
  const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
  return (s - Math.floor(s)) * 2 - 1;
}

function makeBoundaryRadiusFn(scale: { x: number; y: number; z: number }) {
  // Returns radius of the "brain" in direction (x,y,z).
  // Two lobes: a slightly deformed ellipsoid with soft bilateral perturbation.
  return (x: number, y: number, z: number) => {
    const dirLen = Math.max(1e-6, Math.hypot(x, y, z));
    const nx = x / dirLen;
    const ny = y / dirLen;
    const nz = z / dirLen;

    // Base ellipsoid radius
    const invR2 = (nx * nx) / (scale.x * scale.x) + (ny * ny) / (scale.y * scale.y) + (nz * nz) / (scale.z * scale.z);
    let R = 1 / Math.sqrt(invR2);

    // Gentle bilateral "brain" indentation and ridges using harmonics
    const ridge = 0.07 * Math.sin(8 * nx + 5 * ny) + 0.05 * Math.sin(9 * nz - 4 * nx);
    const hemi = 0.05 * Math.sign(nx) * Math.sin(6 * ny + 3 * nz);
    const noise = 0.04 * seededNoise3(nx * 3, ny * 3, nz * 3);
    R *= 1 + ridge + hemi + noise;

    return R;
  };
}

function buildBrainMesh(THREE: any, boundaryRadiusFn: (x: number, y: number, z: number) => number) {
  // Build a low-poly geometric shell by pushing vertices to the boundary radius
  const group = new THREE.Group();

  const ico = new THREE.IcosahedronGeometry(1, 5); // dense enough for silhouette
  const pos = ico.attributes.position as any;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const R = boundaryRadiusFn(v.x, v.y, v.z);
    v.normalize().multiplyScalar(R);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  ico.computeVertexNormals();

  // Solid-ish dark shell (double-sided to ensure visibility)
  const shellMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0.1, 0.1, 0.1),
    metalness: 0.15,
    roughness: 0.9,
    transparent: true,
    opacity: 0.65,
    side: THREE.DoubleSide,
  });
  const shell = new THREE.Mesh(ico, shellMat);

  // Wireframe overlay
  const wire = new THREE.LineSegments(
    new THREE.WireframeGeometry(ico),
    new THREE.LineBasicMaterial({ color: new THREE.Color(0.85, 0.85, 0.85), opacity: 0.35, transparent: true })
  );

  group.add(shell);
  group.add(wire);
  return { group, wire };
}

function seedParticlesInside(boundaryRadiusFn: (x: number, y: number, z: number) => number, count: number, shellTarget: number, shellThickness: number) {
  // Distribute particles loosely in a shell near shellTarget radius, with jitter thickness.
  const positions = new Float32Array(count * 3);
  const velocities = new Float32Array(count * 3);
  const life = new Float32Array(count);
  const tmp = [0, 0, 0];

  for (let i = 0; i < count; i++) {
    // random direction
    let x = Math.random() * 2 - 1;
    let y = Math.random() * 2 - 1;
    let z = Math.random() * 2 - 1;
    let len = Math.hypot(x, y, z) || 1;
    x /= len; y /= len; z /= len;

    const boundaryR = boundaryRadiusFn(x, y, z);
    const targetR = Math.min(boundaryR * 0.85, shellTarget + (Math.random() - 0.5) * shellThickness);
    positions[i * 3 + 0] = x * targetR;
    positions[i * 3 + 1] = y * targetR;
    positions[i * 3 + 2] = z * targetR;

    // small initial random velocities
    velocities[i * 3 + 0] = (Math.random() - 0.5) * 0.02;
    velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.02;
    velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02;

    life[i] = Math.random();
  }

  return { positions, velocities, life };
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function length3(x: number, y: number, z: number) {
  return Math.hypot(x, y, z);
}

function normalize3(x: number, y: number, z: number) {
  const len = Math.max(1e-6, Math.hypot(x, y, z));
  return [x / len, y / len, z / len] as const;
}

function NeuralFluxThreeBrainVisualizationPage() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rt = useRef<RuntimeRefs>({
    mounted: false,
    lastPulseAt: 0,
    lastBurstAt: 0,
    currentPhase: "calm",
    eqTargetRadius: 0.75,
    desiredShellThickness: 0.35,
    trailPool: null,
  });

  const [controls, setControls] = useState<Controls>(defaultControls);
  const [running, setRunning] = useState(true);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");

  const handleResize = useCallback((w: number, h: number) => {
    const curr = rt.current;
    if (!curr.renderer || !curr.camera) return;
    curr.renderer.setSize(w, h, false);
    curr.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    curr.camera.aspect = w / h;
    curr.camera.updateProjectionMatrix();
  }, []);

  useResizeObserver(containerRef, handleResize);

  const initialize = useCallback(async () => {
    setStatus("loading");
    try {
      const THREE = await import("three");
      const curr = rt.current;
      curr.THREE = THREE;

      // Renderer
      const renderer = new THREE.WebGLRenderer({
        canvas: canvasRef.current!,
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
      renderer.setClearColor(new THREE.Color(0, 0, 0), 1);
      curr.renderer = renderer;

      // Scene and Camera
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 100);
      camera.position.set(0, 0.6, 3.8);
      scene.add(camera);
      curr.scene = scene;
      curr.camera = camera;

      // Lights (grayscale palette)
      scene.add(new THREE.AmbientLight(new THREE.Color(0.6, 0.6, 0.6), 0.6));
      const dir = new THREE.DirectionalLight(new THREE.Color(0.9, 0.9, 0.9), 0.85);
      dir.position.set(3, 5, 2);
      scene.add(dir);
      const rim = new THREE.DirectionalLight(new THREE.Color(0.5, 0.5, 0.5), 0.35);
      rim.position.set(-3, -2, -1);
      scene.add(rim);

      // Brain boundary function and mesh
      const boundaryRadiusFn = makeBoundaryRadiusFn(controls.brainScale);
      curr.boundaryRadiusFn = boundaryRadiusFn;

      const { group: brainGroup, wire: brainWire } = buildBrainMesh(THREE, boundaryRadiusFn);
      curr.brainGroup = brainGroup;
      curr.brainWire = brainWire;
      scene.add(brainGroup);

      // Particles
      const { positions, velocities, life } = seedParticlesInside(boundaryRadiusFn, controls.particleCount, curr.eqTargetRadius, curr.desiredShellThickness);
      curr.positions = positions;
      curr.velocities = velocities;
      curr.life = life;

      const geom = new THREE.BufferGeometry();
      geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.PointsMaterial({
        size: controls.particleSize / 100,
        color: new THREE.Color(controls.brightness, controls.brightness, controls.brightness),
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const points = new THREE.Points(geom, mat);

      curr.particleGeo = geom;
      curr.particleMat = mat;
      curr.particles = points;
      scene.add(points);

      // Trails for pulse pathways
      curr.trailPool = new TrailPool(THREE, scene, 32, boundaryRadiusFn);

      // Clock
      curr.clock = new THREE.Clock();

      // Initial size
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        handleResize(rect.width, rect.height);
      }

      curr.mounted = true;
      setStatus("ready");

      // Start loop
      animate();
    } catch (e) {
      console.error(e);
      setStatus("error");
    }
  }, [controls.brightness, controls.particleCount, controls.particleSize, controls.brainScale, handleResize]);

  useEffect(() => {
    initialize();
    return () => {
      // Dispose objects on unmount
      const curr = rt.current;
      curr.mounted = false;
      try {
        curr.trailPool?.dispose();
        curr.particleGeo?.dispose();
        curr.particleMat?.dispose();
        if (curr.scene && curr.brainGroup) curr.scene.remove(curr.brainGroup);
        if (curr.renderer) curr.renderer.dispose();
      } catch {
        // ignore
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const triggerBurst = useCallback(() => {
    const curr = rt.current;
    curr.currentPhase = "burst";
    curr.lastBurstAt = performance.now() / 1000;
  }, []);

  const resetParticles = useCallback(() => {
    const curr = rt.current;
    if (!curr.boundaryRadiusFn || !curr.particleGeo) return;
    const seeded = seedParticlesInside(curr.boundaryRadiusFn, controls.particleCount, curr.eqTargetRadius, curr.desiredShellThickness);
    curr.positions = seeded.positions;
    curr.velocities = seeded.velocities;
    curr.life = seeded.life;
    curr.particleGeo.setAttribute("position", new (curr.THREE as any).BufferAttribute(curr.positions, 3));
    curr.particleGeo.attributes.position.needsUpdate = true;
  }, [controls.particleCount]);

  const randomPulse = useCallback(() => {
    const curr = rt.current;
    if (!curr.trailPool) return;
    // choose a few sources around inner shell with random directions
    const pulses = 3 + Math.floor(Math.random() * 4);
    for (let i = 0; i < pulses; i++) {
      const dir = normalize3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
      const R = curr.eqTargetRadius * (0.9 + Math.random() * 0.2);
      const origin = { x: dir[0] * R, y: dir[1] * R, z: dir[2] * R };
      const hint = { x: dir[0] + (Math.random() - 0.5) * 0.6, y: dir[1] + (Math.random() - 0.5) * 0.6, z: dir[2] + (Math.random() - 0.5) * 0.6 };
      curr.trailPool.spawnPathway(origin, hint, controls.brightness);
    }
  }, [controls.brightness]);

  function animate() {
    const curr = rt.current;
    if (!curr.mounted || !curr.THREE) return;
    requestAnimationFrame(animate);

    if (!running) {
      curr.clock?.getDelta(); // consume to avoid big dt
      curr.renderer?.render(curr.scene, curr.camera);
      return;
    }

    const dt = Math.min(0.033, curr.clock?.getDelta?.() ?? 0.016); // cap dt for stability
    updatePhysics(dt);
    curr.trailPool?.update(dt);

    // Slow rotation for aesthetics
    if (curr.brainGroup) {
      curr.brainGroup.rotation.y += dt * 0.08;
      curr.brainGroup.rotation.x = Math.sin(performance.now() * 0.0001) * 0.05;
    }

    curr.renderer?.render(curr.scene, curr.camera);
  }

  function updatePhysics(dt: number) {
    const curr = rt.current;
    if (!curr.positions || !curr.velocities || !curr.life || !curr.boundaryRadiusFn || !curr.particleGeo) return;

    const now = performance.now() / 1000;
    const timeSincePulse = now - curr.lastPulseAt;
    const timeSinceBurst = now - curr.lastBurstAt;

    // Phase scheduling:
    // - Trigger burst every burstIntervalSec
    if (timeSinceBurst > controls.burstIntervalSec) {
      curr.currentPhase = "burst";
      curr.lastBurstAt = now;
    }
    // - Trigger pulse periodically in equilibrium
    if (curr.currentPhase !== "burst" && timeSincePulse > controls.pulseIntervalSec) {
      curr.currentPhase = "pulse";
      curr.lastPulseAt = now;
      randomPulse();
    }

    // After short pulse time, go to calm
    if (curr.currentPhase === "pulse" && timeSincePulse > 1.2) {
      curr.currentPhase = "calm";
    }

    // After short burst time, switch to converge
    if (curr.currentPhase === "burst" && timeSinceBurst > 2.6) {
      curr.currentPhase = "converge";
    }

    const N = controls.particleCount;
    const outwardGain = controls.outwardIntensity;
    const baseSpeed = controls.baseSpeed;
    const convergeK = controls.convergenceStrength;
    const shellTarget = curr.eqTargetRadius;
    const shellThickness = curr.desiredShellThickness;

    for (let i = 0; i < N; i++) {
      const pi = i * 3;
      let x = curr.positions[pi + 0];
      let y = curr.positions[pi + 1];
      let z = curr.positions[pi + 2];

      let vx = curr.velocities[pi + 0];
      let vy = curr.velocities[pi + 1];
      let vz = curr.velocities[pi + 2];

      // Gentle baseline jitter using hash noise
      const n = seededNoise3(x * 2.1 + i * 0.17, y * 2.3 + i * 0.11, z * 2.5 - i * 0.07);
      vx += n * 0.02 * dt;
      vy += n * 0.02 * dt;
      vz += n * 0.02 * dt;

      // Determine boundary radius for direction
      const len = Math.max(1e-6, length3(x, y, z));
      const nx = x / len, ny = y / len, nz = z / len;
      const boundaryR = curr.boundaryRadiusFn(nx, ny, nz);

      // Forces by phase
      if (curr.currentPhase === "burst") {
        // Controlled outward flow, not too chaotic
        const push = 0.6 + 0.4 * Math.sin(now * 2 + i); // rhythmic mod
        vx += nx * outwardGain * push * dt;
        vy += ny * outwardGain * push * dt;
        vz += nz * outwardGain * push * dt;
      } else if (curr.currentPhase === "converge") {
        // Draw into a loose shell, not a single point
        const targetR = Math.min(boundaryR * 0.8, shellTarget + (seededNoise3(i, i * 1.23, i * -0.7) * shellThickness) / 2);
        const deltaR = targetR - len;
        vx += nx * deltaR * convergeK * dt;
        vy += ny * deltaR * convergeK * dt;
        vz += nz * deltaR * convergeK * dt;
      } else if (curr.currentPhase === "pulse") {
        // Subtle inward-outward breathing during pulses
        const breath = Math.sin(now * 6 + i) * 0.05;
        vx += nx * breath * dt;
        vy += ny * breath * dt;
        vz += nz * breath * dt;
      } else {
        // Calm equilibrium: damp velocities toward target shell
        const targetR = Math.min(boundaryR * 0.82, shellTarget + seededNoise3(i * 1.2, i * 0.77, i * -0.91) * (shellThickness * 0.5));
        const deltaR = targetR - len;
        vx += nx * deltaR * (convergeK * 0.3) * dt;
        vy += ny * deltaR * (convergeK * 0.3) * dt;
        vz += nz * deltaR * (convergeK * 0.3) * dt;
      }

      // Base damping and speed normalization to avoid blow-ups
      vx *= 0.995;
      vy *= 0.995;
      vz *= 0.995;

      // Clamp speed softly around baseSpeed
      const vlen = Math.max(1e-6, length3(vx, vy, vz));
      const maxV = baseSpeed * 0.7;
      if (vlen > maxV) {
        const s = maxV / vlen;
        vx *= s; vy *= s; vz *= s;
      }

      // Integrate
      x += vx * dt;
      y += vy * dt;
      z += vz * dt;

      // Soft boundary kill and reflect: on crossing boundary, fade a bit and reflect component
      const newLen = Math.max(1e-6, length3(x, y, z));
      const nnx = x / newLen, nny = y / newLen, nnz = z / newLen;
      const Rb = curr.boundaryRadiusFn(nnx, nny, nnz);

      if (newLen > Rb) {
        // Nudge slightly inside and reflect
        const over = newLen - Rb;
        x = nnx * (Rb - 0.002);
        y = nny * (Rb - 0.002);
        z = nnz * (Rb - 0.002);
        // Reflect velocity on normal with damping
        const dot = vx * nnx + vy * nny + vz * nnz;
        vx = (vx - 1.8 * dot * nnx) * 0.8;
        vy = (vy - 1.8 * dot * nny) * 0.8;
        vz = (vz - 1.8 * dot * nnz) * 0.8;
      }

      // Save back
      curr.positions[pi + 0] = x;
      curr.positions[pi + 1] = y;
      curr.positions[pi + 2] = z;
      curr.velocities[pi + 0] = vx;
      curr.velocities[pi + 1] = vy;
      curr.velocities[pi + 2] = vz;
    }

    curr.particleGeo.attributes.position.needsUpdate = true;
  }

  // React to control changes that impact materials/visuals
  useEffect(() => {
    const curr = rt.current;
    if (curr.particleMat) {
      curr.particleMat.size = controls.particleSize / 100;
      curr.particleMat.color = new (curr.THREE as any).Color(controls.brightness, controls.brightness, controls.brightness);
      curr.particleMat.needsUpdate = true;
    }
  }, [controls.particleSize, controls.brightness]);

  // Rebuild brain when scale changes
  useEffect(() => {
    const curr = rt.current;
    if (!curr.THREE || !curr.scene) return;
    const br = makeBoundaryRadiusFn(controls.brainScale);
    curr.boundaryRadiusFn = br;

    // remove old group
    if (curr.brainGroup) curr.scene.remove(curr.brainGroup);
    const { group, wire } = buildBrainMesh(curr.THREE, br);
    curr.brainGroup = group;
    curr.brainWire = wire;
    curr.scene.add(group);
  }, [controls.brainScale]);

  // Handle particle count changes by reseeding
  useEffect(() => {
    const curr = rt.current;
    if (!curr.boundaryRadiusFn || !curr.THREE) return;
    const seeded = seedParticlesInside(curr.boundaryRadiusFn, controls.particleCount, curr.eqTargetRadius, curr.desiredShellThickness);
    curr.positions = seeded.positions;
    curr.velocities = seeded.velocities;
    curr.life = seeded.life;

    if (curr.particleGeo) {
      curr.particleGeo.dispose();
    }
    const geom = new (curr.THREE as any).BufferGeometry();
    geom.setAttribute("position", new (curr.THREE as any).BufferAttribute(curr.positions, 3));
    curr.particleGeo = geom;

    if (curr.particles) {
      curr.particles.geometry = geom;
    }
  }, [controls.particleCount]);

  // UI Handlers
  const onRangeChange = (key: keyof Controls, parse: (v: string) => any = (v) => Number(v)) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setControls((c) => ({ ...c, [key]: parse(e.target.value) }));

  const onBrainScaleChange = (axis: "x" | "y" | "z") => (e: React.ChangeEvent<HTMLInputElement>) =>
    setControls((c) => ({ ...c, brainScale: { ...c.brainScale, [axis]: Number(e.target.value) } }));

  return (
    <div className="w-full h-dvh overflow-hidden bg-black text-white">
      <div className="h-14 border-b border-white/10 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Badge className="bg-white text-black hover:bg-white">Neural Flux</Badge>
          <div className="text-sm text-white/70">Geometric Brain | Rhythmic Electric Pathways</div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setRunning((r) => !r)}
            className="bg-white text-black hover:bg-white/90"
            variant="default"
          >
            {running ? "Pause" : "Play"}
          </Button>
          <Button onClick={triggerBurst} className="bg-transparent border border-white/30 hover:bg-white/10">
            Trigger Burst
          </Button>
          <Button onClick={resetParticles} className="bg-transparent border border-white/30 hover:bg-white/10">
            Reset
          </Button>
        </div>
      </div>

      <div className="w-full h-[calc(100dvh-3.5rem)] grid grid-cols-1 lg:grid-cols-[1fr_360px]">
        <div className="relative" ref={containerRef}>
          <canvas ref={canvasRef} className="w-full h-full block" />
          {status !== "ready" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black">
              <div className="text-center">
                <div className="text-white/80 text-sm">
                  {status === "loading" && "Loading visualization..."}
                  {status === "idle" && "Initializing..."}
                  {status === "error" && (
                    <span>
                      Error: ensure you have installed the dependency "three"
                      (npm install three)
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-l border-white/10 bg-black/60 backdrop-blur-sm p-4 space-y-4">
          <Card className="bg-black border-white/10 p-4 space-y-3">
            <div className="font-medium text-white">Global</div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-3">
                <label className="block text-xs text-white/60">Particles: {controls.particleCount}</label>
                <input
                  type="range"
                  min={500}
                  max={8000}
                  step={100}
                  value={controls.particleCount}
                  onChange={onRangeChange("particleCount")}
                  className="w-full accent-white"
                />
              </div>
              <div className="col-span-3">
                <label className="block text-xs text-white/60">Particle Size: {controls.particleSize.toFixed(1)}</label>
                <input
                  type="range"
                  min={1}
                  max={8}
                  step={0.1}
                  value={controls.particleSize}
                  onChange={onRangeChange("particleSize")}
                  className="w-full accent-white"
                />
              </div>
              <div className="col-span-3">
                <label className="block text-xs text-white/60">Brightness: {controls.brightness.toFixed(2)}</label>
                <input
                  type="range"
                  min={0.3}
                  max={1.2}
                  step={0.01}
                  value={controls.brightness}
                  onChange={onRangeChange("brightness")}
                  className="w-full accent-white"
                />
              </div>
            </div>
          </Card>

          <Card className="bg-black border-white/10 p-4 space-y-3">
            <div className="font-medium text-white">Dynamics</div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-white/60">Base Speed: {controls.baseSpeed.toFixed(2)}</label>
                <input
                  type="range"
                  min={0.2}
                  max={1.2}
                  step={0.01}
                  value={controls.baseSpeed}
                  onChange={onRangeChange("baseSpeed")}
                  className="w-full accent-white"
                />
              </div>
              <div>
                <label className="block text-xs text-white/60">Outward Intensity (burst): {controls.outwardIntensity.toFixed(2)}</label>
                <input
                  type="range"
                  min={0.2}
                  max={1.6}
                  step={0.02}
                  value={controls.outwardIntensity}
                  onChange={onRangeChange("outwardIntensity")}
                  className="w-full accent-white"
                />
              </div>
              <div>
                <label className="block text-xs text-white/60">Convergence Strength: {controls.convergenceStrength.toFixed(2)}</label>
                <input
                  type="range"
                  min={0.1}
                  max={0.6}
                  step={0.01}
                  value={controls.convergenceStrength}
                  onChange={onRangeChange("convergenceStrength")}
                  className="w-full accent-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-white/60">Pulse Interval (s): {controls.pulseIntervalSec.toFixed(1)}</label>
                  <input
                    type="range"
                    min={1}
                    max={8}
                    step={0.1}
                    value={controls.pulseIntervalSec}
                    onChange={onRangeChange("pulseIntervalSec")}
                    className="w-full accent-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/60">Burst Interval (s): {controls.burstIntervalSec.toFixed(1)}</label>
                  <input
                    type="range"
                    min={6}
                    max={24}
                    step={0.5}
                    value={controls.burstIntervalSec}
                    onChange={onRangeChange("burstIntervalSec")}
                    className="w-full accent-white"
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card className="bg-black border-white/10 p-4 space-y-3">
            <div className="font-medium text-white">Brain Shape</div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-white/60">Scale X: {controls.brainScale.x.toFixed(2)}</label>
                <input
                  type="range"
                  min={0.8}
                  max={1.8}
                  step={0.02}
                  value={controls.brainScale.x}
                  onChange={onBrainScaleChange("x")}
                  className="w-full accent-white"
                />
              </div>
              <div>
                <label className="block text-xs text-white/60">Scale Y: {controls.brainScale.y.toFixed(2)}</label>
                <input
                  type="range"
                  min={0.7}
                  max={1.5}
                  step={0.02}
                  value={controls.brainScale.y}
                  onChange={onBrainScaleChange("y")}
                  className="w-full accent-white"
                />
              </div>
              <div>
                <label className="block text-xs text-white/60">Scale Z: {controls.brainScale.z.toFixed(2)}</label>
                <input
                  type="range"
                  min={0.8}
                  max={2.0}
                  step={0.02}
                  value={controls.brainScale.z}
                  onChange={onBrainScaleChange("z")}
                  className="w-full accent-white"
                />
              </div>
            </div>
            <div className="pt-2">
              <Button
                onClick={() => {
                  setControls((c) => ({ ...c, brainScale: defaultControls.brainScale }));
                }}
                className="bg-transparent border border-white/30 hover:bg-white/10"
              >
                Reset Shape
              </Button>
            </div>
          </Card>

          <Card className="bg-black border-white/10 p-4 space-y-2">
            <div className="text-xs text-white/60">
              Tip: Trigger a burst and watch particles bloom outward, then settle into a loose inner shell.
              Rhythmic pulses will form pathways that propagate to the boundary and fade.
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default NeuralFluxThreeBrainVisualizationPage;