import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAppContext } from "@/context/AppContext";

// IMPORTANT: This page uses Three.js. Please install it before running:
// npm i three
// If three is not installed, the page will render a helpful message instead of the 3D scene.

type SceneBundle = {
  THREE: any;
  OrbitControls: any;
};

type ParticleSystem = {
  points: any;
  geometry: any;
  material: any;
  velocities: Float32Array;
};

type LineSystem = {
  lines: any;
  geometry: any;
  material: any;
};

/**
 * A modern grayscale Three.js experience:
 * - Interactive orbit controls
 * - Monochrome particle field orbiting a wireframe sculpture
 * - Proximity-link lines between nearby particles (toggleable)
 * - Elegant, high-contrast UI with shadcn card, buttons, and badges
 */
const GrayscaleThreeShowcaseExperiencePage: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);

  // UI state
  const [threeReady, setThreeReady] = useState<boolean>(false);
  const [threeError, setThreeError] = useState<string | null>(null);
  const [wireframe, setWireframe] = useState<boolean>(true);
  const [linksEnabled, setLinksEnabled] = useState<boolean>(true);
  const [paused, setPaused] = useState<boolean>(false);
  const [particleCount, setParticleCount] = useState<number>(800);
  const [linkCount, setLinkCount] = useState<number>(0);

  // Optional: show socket connectivity status from app context
  const { isConnected } = useAppContext();

  // We dynamically import three to avoid build errors if the user hasn't installed it yet.
  const loadThree = useCallback(async (): Promise<SceneBundle> => {
    try {
      const THREE = await import("three");
      // Include explicit extension for compatibility with some bundlers
      const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");
      return { THREE, OrbitControls };
    } catch (err: any) {
      throw new Error(
        "Three.js not found. Please install it with: npm i three"
      );
    }
  }, []);

  // Derived UI helpers
  const actionLabel = useMemo(() => (paused ? "Resume" : "Pause"), [paused]);

  // Main 3D setup and animation
  useEffect(() => {
    let mounted = true;

    if (!containerRef.current) return;

    let three: any = null;
    let OrbitControlsCtor: any = null;

    // Three essentials
    let renderer: any = null;
    let scene: any = null;
    let camera: any = null;
    let controls: any = null;

    // Visual elements
    let sculpture: any = null;
    let particleSystem: ParticleSystem | null = null;
    let lineSystem: LineSystem | null = null;

    // For interactions
    const mouse = { x: 0, y: 0 };

    // Timing
    let lastTime = performance.now();

    // Utility: create the renderer to match container
    const createRenderer = (THREE: any, container: HTMLDivElement) => {
      const r = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
      });
      r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      r.setSize(container.clientWidth, container.clientHeight);
      r.outputColorSpace = THREE.LinearSRGBColorSpace;
      r.setClearColor(0x000000, 1); // true black background to honor grayscale theme
      container.appendChild(r.domElement);
      return r;
    };

    const createCamera = (THREE: any, container: HTMLDivElement) => {
      const fov = 50;
      const aspect = container.clientWidth / container.clientHeight;
      const near = 0.1;
      const far = 1000;
      const cam = new THREE.PerspectiveCamera(fov, aspect, near, far);
      cam.position.set(0, 1.5, 6);
      return cam;
    };

    const createSculpture = (THREE: any) => {
      // A TorusKnot as a wireframe sculpture
      const geometry = new THREE.TorusKnotGeometry(1, 0.35, 180, 24);
      const material = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.4,
        metalness: 0.2,
        wireframe: wireframe,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      scene.add(mesh);
      return mesh;
    };

    const createLights = (THREE: any) => {
      const ambient = new THREE.AmbientLight(0xffffff, 0.6); // soft white
      scene.add(ambient);

      const dir1 = new THREE.DirectionalLight(0xffffff, 0.7);
      dir1.position.set(3, 4, 2);
      scene.add(dir1);

      const dir2 = new THREE.DirectionalLight(0xffffff, 0.4);
      dir2.position.set(-2, -1, -3);
      scene.add(dir2);
    };

    const createParticleSystem = (THREE: any, count: number): ParticleSystem => {
      // Particles within a sphere
      const positions = new Float32Array(count * 3);
      const velocities = new Float32Array(count * 3);

      const radius = 3.2;

      for (let i = 0; i < count; i++) {
        // Random point inside sphere
        const r = radius * Math.cbrt(Math.random());
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.sin(phi) * Math.sin(theta);
        const z = r * Math.cos(phi);

        positions[i * 3 + 0] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;

        // Small random drift velocity
        velocities[i * 3 + 0] = (Math.random() - 0.5) * 0.003;
        velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.003;
        velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.003;
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

      const material = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.02,
        transparent: true,
        opacity: 0.9,
      });

      const points = new THREE.Points(geometry, material);
      scene.add(points);

      return { points, geometry, material, velocities };
    };

    const createLineSystem = (THREE: any): LineSystem => {
      const maxSegments = 12000; // upper bound; adjusted dynamically
      const positions = new Float32Array(maxSegments * 2 * 3);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geometry.setDrawRange(0, 0);

      const material = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.12,
      });

      const lines = new THREE.LineSegments(geometry, material);
      scene.add(lines);

      return { lines, geometry, material };
    };

    const updateLinks = (THREE: any, particle: ParticleSystem, line: LineSystem) => {
      const posAttr = particle.geometry.getAttribute("position");
      const particlePositions = posAttr.array as Float32Array;

      const maxDistance = 0.35; // link threshold
      const maxSegments = (line.geometry.getAttribute("position").array as Float32Array).length / 6;

      let segmentIndex = 0;
      const linkPositions = line.geometry.getAttribute("position").array as Float32Array;

      const count = particlePositions.length / 3;
      for (let i = 0; i < count; i++) {
        const ax = particlePositions[i * 3 + 0];
        const ay = particlePositions[i * 3 + 1];
        const az = particlePositions[i * 3 + 2];

        for (let j = i + 1; j < count; j++) {
          const bx = particlePositions[j * 3 + 0];
          const by = particlePositions[j * 3 + 1];
          const bz = particlePositions[j * 3 + 2];

          const dx = ax - bx;
          const dy = ay - by;
          const dz = az - bz;
          const dist2 = dx * dx + dy * dy + dz * dz;

          if (dist2 < maxDistance * maxDistance) {
            if (segmentIndex >= maxSegments) break;

            // line start
            linkPositions[segmentIndex * 6 + 0] = ax;
            linkPositions[segmentIndex * 6 + 1] = ay;
            linkPositions[segmentIndex * 6 + 2] = az;
            // line end
            linkPositions[segmentIndex * 6 + 3] = bx;
            linkPositions[segmentIndex * 6 + 4] = by;
            linkPositions[segmentIndex * 6 + 5] = bz;

            segmentIndex++;
          }
        }
        if (segmentIndex >= maxSegments) break;
      }

      line.geometry.setDrawRange(0, segmentIndex * 2);
      (line.geometry.getAttribute("position") as any).needsUpdate = true;
      setLinkCount(segmentIndex);
    };

    const animate = (THREE: any) => {
      if (!mounted) return;
      rafRef.current = requestAnimationFrame(() => animate(THREE));

      const now = performance.now();
      const delta = Math.min((now - lastTime) / 16.6667, 2); // ~ 60 fps normalized
      lastTime = now;

      if (!paused) {
        // Rotate sculpture
        if (sculpture) {
          sculpture.rotation.y += 0.0018 * delta;
          sculpture.rotation.x += 0.0006 * delta;
        }

        // Update particles and gently steer toward center
        if (particleSystem) {
          const posAttr = particleSystem.geometry.getAttribute("position");
          const positions = posAttr.array as Float32Array;
          const velocities = particleSystem.velocities;
          const count = positions.length / 3;

          for (let i = 0; i < count; i++) {
            const ix = i * 3;
            let x = positions[ix + 0];
            let y = positions[ix + 1];
            let z = positions[ix + 2];

            // Mouse attraction in x/y slightly
            const mx = mouse.x * 0.0025;
            const my = -mouse.y * 0.0025;
            velocities[ix + 0] += mx * 0.001 * delta;
            velocities[ix + 1] += my * 0.001 * delta;

            // Mild pull toward center
            velocities[ix + 0] += -x * 0.00003 * delta;
            velocities[ix + 1] += -y * 0.00003 * delta;
            velocities[ix + 2] += -z * 0.00003 * delta;

            // Dampen velocities
            velocities[ix + 0] *= 0.998;
            velocities[ix + 1] *= 0.998;
            velocities[ix + 2] *= 0.998;

            x += velocities[ix + 0] * delta * 60;
            y += velocities[ix + 1] * delta * 60;
            z += velocities[ix + 2] * delta * 60;

            // Soft bounds
            const limit = 3.4;
            if (x > limit || x < -limit) velocities[ix + 0] *= -0.9;
            if (y > limit || y < -limit) velocities[ix + 1] *= -0.9;
            if (z > limit || z < -limit) velocities[ix + 2] *= -0.9;

            positions[ix + 0] = Math.max(Math.min(x, limit), -limit);
            positions[ix + 1] = Math.max(Math.min(y, limit), -limit);
            positions[ix + 2] = Math.max(Math.min(z, limit), -limit);
          }

          (posAttr as any).needsUpdate = true;

          // Update links
          if (linksEnabled && lineSystem) {
            updateLinks(THREE, particleSystem, lineSystem);
          } else if (lineSystem) {
            lineSystem.geometry.setDrawRange(0, 0);
            setLinkCount(0);
          }
        }
      }

      // Subtle camera dolly based on mouse
      if (camera) {
        camera.position.x += ((mouse.x * 0.002) - camera.position.x) * 0.02;
        camera.position.y += ((-mouse.y * 0.002) + 1.5 - camera.position.y) * 0.02;
      }

      if (controls) controls.update();
      if (renderer && scene && camera) renderer.render(scene, camera);
    };

    const onResize = () => {
      if (!containerRef.current || !renderer || !camera) return;
      const { clientWidth, clientHeight } = containerRef.current;
      renderer.setSize(clientWidth, clientHeight);
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    };

    const init = async () => {
      try {
        const { THREE, OrbitControls } = await loadThree();
        if (!mounted) return;

        three = THREE;
        OrbitControlsCtor = OrbitControls;

        scene = new THREE.Scene();

        camera = createCamera(THREE, containerRef.current!);
        renderer = createRenderer(THREE, containerRef.current!);

        controls = new OrbitControlsCtor(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.rotateSpeed = 0.5;
        controls.enablePan = false;
        controls.minDistance = 2.5;
        controls.maxDistance = 12;

        createLights(THREE);
        sculpture = createSculpture(THREE);
        particleSystem = createParticleSystem(THREE, particleCount);
        lineSystem = createLineSystem(THREE);

        window.addEventListener("resize", onResize);
        containerRef.current!.addEventListener("mousemove", onMouseMove);

        setThreeReady(true);
        onResize();
        lastTime = performance.now();
        animate(THREE);
      } catch (err: any) {
        console.error(err);
        setThreeError(err?.message ?? "Unknown error loading Three.js");
      }
    };

    init();

    return () => {
      mounted = false;

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      window.removeEventListener("resize", onResize);
      containerRef.current?.removeEventListener("mousemove", onMouseMove);

      // Dispose scene elements
      try {
        if (scene) {
          if (sculpture) {
            sculpture.geometry?.dispose?.();
            sculpture.material?.dispose?.();
            scene.remove(sculpture);
          }
          if (particleSystem) {
            particleSystem.geometry?.dispose?.();
            particleSystem.material?.dispose?.();
            scene.remove(particleSystem.points);
          }
          if (lineSystem) {
            lineSystem.geometry?.dispose?.();
            lineSystem.material?.dispose?.();
            scene.remove(lineSystem.lines);
          }
        }
        controls?.dispose?.();
        renderer?.dispose?.();

        if (renderer?.domElement && containerRef.current?.contains(renderer.domElement)) {
          containerRef.current.removeChild(renderer.domElement);
        }
      } catch (e) {
        // no-op
      }
    };
    // Intentionally re-run when particleCount changes to regenerate system
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [particleCount, wireframe, linksEnabled, paused, loadThree]);

  // Handle toggles that affect materials without recreating the whole scene tree:
  // We simply signal a full rebuild by bumping a key when these change (already included above).

  const handleRegenerateParticles = () => {
    // Trigger re-init by changing particle count (even to the same value)
    setParticleCount((prev) => (prev === 800 ? 801 : 800));
  };

  return (
    <div className="min-h-[100dvh] w-full bg-black text-white relative overflow-hidden">
      {/* Soft vignette and gradient overlay for depth, grayscale only */}
      <div className="pointer-events-none absolute inset-0 opacity-60"
           style={{
             background: "radial-gradient(1200px 600px at 70% -20%, rgba(255,255,255,0.08), rgba(0,0,0,0) 60%), radial-gradient(900px 600px at 10% 110%, rgba(255,255,255,0.05), rgba(0,0,0,0) 60%)"
           }}
      />

      <div className="mx-auto max-w-6xl px-4 py-8 md:py-10 relative z-10">
        <Card className="bg-zinc-950/80 border-zinc-800">
          <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="text-2xl md:text-3xl font-semibold tracking-tight">
                Monochrome Orb Field
              </CardTitle>
              <p className="text-zinc-400 mt-1">
                A grayscale Three.js vignette: sculptural wireframe, drifting particles, and proximity links.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-zinc-100 text-zinc-900 hover:bg-zinc-200">
                {isConnected ? "Socket: Connected" : "Socket: Offline"}
              </Badge>
              {threeReady && <Badge className="bg-zinc-800 text-zinc-200">Three Ready</Badge>}
              {!threeReady && !threeError && <Badge className="bg-zinc-800 text-zinc-200">Loading Three…</Badge>}
            </div>
          </CardHeader>

          <CardContent>
            {/* Controls */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <Button
                variant="default"
                onClick={() => setPaused((p) => !p)}
                className="bg-white text-black hover:bg-zinc-200"
              >
                {actionLabel}
              </Button>
              <Button
                variant="outline"
                onClick={() => setWireframe((w) => !w)}
                className="border-zinc-700 text-zinc-200 hover:bg-zinc-900"
              >
                {wireframe ? "Disable Wireframe" : "Enable Wireframe"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setLinksEnabled((l) => !l)}
                className="border-zinc-700 text-zinc-200 hover:bg-zinc-900"
              >
                {linksEnabled ? "Hide Links" : "Show Links"}
              </Button>
              <Button
                variant="outline"
                onClick={handleRegenerateParticles}
                className="border-zinc-700 text-zinc-200 hover:bg-zinc-900"
              >
                Regenerate Particles
              </Button>

              <div className="ml-auto flex items-center gap-2 text-sm text-zinc-400">
                <span>Particles:</span>
                <Badge className="bg-zinc-900 border border-zinc-700 text-zinc-200">
                  {particleCount % 2 === 0 ? particleCount : particleCount - 1}
                </Badge>
                <span>Links:</span>
                <Badge className="bg-zinc-900 border border-zinc-700 text-zinc-200">
                  {linksEnabled ? linkCount : 0}
                </Badge>
              </div>
            </div>

            {/* 3D Canvas Container */}
            <div
              ref={containerRef}
              className="relative w-full h-[60vh] md:h-[68vh] rounded-lg overflow-hidden border border-zinc-800 bg-gradient-to-b from-black via-zinc-950 to-black"
            >
              {/* Fallback overlay if Three isn't installed */}
              {threeError && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                  <div className="text-center space-y-3">
                    <p className="text-zinc-100 text-lg">Three.js not installed</p>
                    <p className="text-zinc-400">Please install it to view the 3D experience:</p>
                    <div className="font-mono text-sm bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-zinc-200 inline-block">
                      npm i three
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>

          <CardFooter className="flex items-center justify-between text-zinc-500">
            <div className="text-xs md:text-sm">
              Tip: Drag to orbit. Move your mouse to subtly influence the particle drift.
            </div>
            <div className="text-xs md:text-sm">
              Palette: Pure black and white for maximum contrast, softened with zinc tones.
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default GrayscaleThreeShowcaseExperiencePage;