import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";

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

interface ThreeJsVisualizationProps {
  className?: string;
  style?: React.CSSProperties;
  particleCount?: number;
  wireframe?: boolean;
  linksEnabled?: boolean;
  autoPlay?: boolean;
  showControls?: boolean;
  height?: string | number;
  width?: string | number;
}

/**
 * A reusable Three.js visualization component that can be embedded anywhere in your website.
 * Features:
 * - Interactive orbit controls
 * - Monochrome particle field orbiting a wireframe sculpture
 * - Proximity-link lines between nearby particles
 * - Configurable particle count, wireframe, and links
 * - Responsive design with customizable dimensions
 */
const ThreeJsVisualization: React.FC<ThreeJsVisualizationProps> = ({
  className = "",
  style = {},
  particleCount = 800,
  wireframe = true,
  linksEnabled = true,
  autoPlay = true,
  showControls = true,
  height = "400px",
  width = "100%",
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);

  // Internal state
  const [threeReady, setThreeReady] = useState<boolean>(false);
  const [threeError, setThreeError] = useState<string | null>(null);
  const [paused, setPaused] = useState<boolean>(!autoPlay);
  const [linkCount, setLinkCount] = useState<number>(0);

  // We dynamically import three to avoid build errors if the user hasn't installed it yet.
  const loadThree = useCallback(async (): Promise<SceneBundle> => {
    try {
      const THREE = await import("three");
      const { OrbitControls } = await import(
        "three/examples/jsm/controls/OrbitControls.js"
      );
      return { THREE, OrbitControls };
    } catch (err: any) {
      throw new Error(
        "Three.js not found. Please install it with: npm i three"
      );
    }
  }, []);

  // Derived UI helpers
  const actionLabel = useMemo(
    () => (paused ? "Resume" : "Pause"),
    [paused]
  );

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

    const createParticleSystem = (
      THREE: any,
      count: number
    ): ParticleSystem => {
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
      geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(positions, 3)
      );

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
      geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(positions, 3)
      );
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

    const updateLinks = (
      THREE: any,
      particle: ParticleSystem,
      line: LineSystem
    ) => {
      const posAttr = particle.geometry.getAttribute("position");
      const particlePositions = posAttr.array as Float32Array;

      const maxDistance = 0.35; // link threshold
      const maxSegments =
        (line.geometry.getAttribute("position").array as Float32Array)
          .length / 6;

      let segmentIndex = 0;
      const linkPositions = line.geometry.getAttribute("position")
        .array as Float32Array;

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
      (line.geometry.getAttribute("position") as any).needsUpdate =
        true;
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
          const posAttr =
            particleSystem.geometry.getAttribute("position");
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
        camera.position.x +=
          (mouse.x * 0.002 - camera.position.x) * 0.02;
        camera.position.y +=
          (-mouse.y * 0.002 + 1.5 - camera.position.y) * 0.02;
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
        containerRef.current!.addEventListener(
          "mousemove",
          onMouseMove
        );

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
      containerRef.current?.removeEventListener(
        "mousemove",
        onMouseMove
      );

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

        if (
          renderer?.domElement &&
          containerRef.current?.contains(renderer.domElement)
        ) {
          containerRef.current.removeChild(renderer.domElement);
        }
      } catch (e) {
        // no-op
      }
    };
  }, [particleCount, wireframe, linksEnabled, paused, loadThree]);

  const handleRegenerateParticles = () => {
    // Trigger re-init by changing particle count (even to the same value)
    // This is a simple way to regenerate without complex state management
    const newCount = particleCount === 800 ? 801 : 800;
    // Force re-render by updating a dependency
    setPaused(paused); // This will trigger the effect to re-run
  };

  const containerStyle: React.CSSProperties = {
    width,
    height,
    ...style,
  };

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={containerStyle}
    >
      {/* 3D Canvas Container */}
      <div
        ref={containerRef}
        className="relative w-full h-full rounded-lg overflow-hidden border border-zinc-800 bg-gradient-to-b from-black via-zinc-950 to-black"
      >
        {/* Fallback overlay if Three isn't installed */}
        {threeError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="text-center space-y-3">
              <p className="text-zinc-100 text-lg">
                Three.js not installed
              </p>
              <p className="text-zinc-400">
                Please install it to view the 3D experience:
              </p>
              <div className="font-mono text-sm bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-zinc-200 inline-block">
                npm i three
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Optional Controls Overlay */}
      {showControls && (
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          <button
            onClick={() => setPaused((p) => !p)}
            className="px-3 py-1 bg-white text-black text-sm rounded hover:bg-zinc-200 transition-colors"
          >
            {actionLabel}
          </button>
          <button
            onClick={handleRegenerateParticles}
            className="px-3 py-1 bg-zinc-800 text-white text-sm rounded hover:bg-zinc-900 transition-colors border border-zinc-700"
          >
            Regenerate
          </button>
        </div>
      )}

      {/* Optional Stats Overlay */}
      {showControls && (
        <div className="absolute top-4 right-4 text-xs text-zinc-400 bg-black/50 px-2 py-1 rounded">
          Particles:{" "}
          {particleCount % 2 === 0 ? particleCount : particleCount - 1}
          {linksEnabled && ` | Links: ${linkCount}`}
        </div>
      )}
    </div>
  );
};

export default ThreeJsVisualization;


