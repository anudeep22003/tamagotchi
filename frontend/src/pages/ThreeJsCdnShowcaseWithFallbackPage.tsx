import React, { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAppContext } from "@/context/AppContext";

// This page demonstrates a minimal Three.js scene (a rotating cube).
// Since "three" is not listed in package.json, we DO NOT import it.
// Instead, we optionally load Three.js from a CDN at runtime so the app runs without build errors.
// We also clearly ask the user to install the proper dependencies for a production setup.

type AnyThree = any;

// Helper to load Three.js from a CDN exactly once.
const loadThreeFromCDN = (): Promise<AnyThree> => {
  return new Promise((resolve, reject) => {
    // Already loaded
    if ((window as any).THREE) {
      resolve((window as any).THREE);
      return;
    }

    // Avoid injecting multiple times
    const existing = document.querySelector('script[data-three-cdn="true"]') as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve((window as any).THREE));
      existing.addEventListener("error", () => reject(new Error("Failed to load Three.js from CDN")));
      return;
    }

    const script = document.createElement("script");
    script.src = "https://unpkg.com/three@0.160.0/build/three.min.js";
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    script.setAttribute("data-three-cdn", "true");
    script.onload = () => resolve((window as any).THREE);
    script.onerror = () => reject(new Error("Failed to load Three.js from CDN"));
    document.head.appendChild(script);
  });
};

const createCubeScene = (THREE: AnyThree, canvas: HTMLCanvasElement) => {
  // Renderer
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setClearColor(0x000000, 0); // transparent background
  renderer.setPixelRatio(Math.min(window.devicePixelRatio ?? 1, 2));

  // Scene and Camera
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
  camera.position.set(2.5, 2, 3.5);
  camera.lookAt(0, 0, 0);
  scene.add(camera);

  // Lights
  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  const dir = new THREE.DirectionalLight(0xffffff, 1.0);
  dir.position.set(4, 6, 2);
  scene.add(ambient, dir);

  // Geometry and Material
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshStandardMaterial({
    color: 0x111111, // dark gray
    roughness: 0.4,
    metalness: 0.2,
  });
  const cube = new THREE.Mesh(geometry, material);
  scene.add(cube);

  // Ground plane for subtle contact shadow
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(6, 6),
    new THREE.ShadowMaterial({ opacity: 0.15 })
  );
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = -0.75;
  plane.receiveShadow = true;
  scene.add(plane);

  // Enable shadows
  renderer.shadowMap.enabled = true;
  dir.castShadow = true;
  cube.castShadow = true;

  // Resize handling
  const resize = () => {
    const parent = canvas.parentElement;
    const width = parent ? parent.clientWidth : 600;
    const height = Math.max(220, Math.round(width * 0.56)); // 16:9-ish bounded
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener("resize", resize);

  return {
    renderer,
    scene,
    camera,
    cube,
    dispose: () => {
      window.removeEventListener("resize", resize);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    },
  };
};

const ThreeJsCdnShowcaseWithFallbackPage: React.FC = () => {
  // From global app context (already provided at app root)
  const { isConnected } = useAppContext();

  // Canvas ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Local state
  const [isThreeReady, setIsThreeReady] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Scene handles
  const threeRef = useRef<AnyThree | null>(null);
  const sceneRef = useRef<ReturnType<typeof createCubeScene> | null>(null);
  const rafRef = useRef<number | null>(null);

  // Animation loop
  const animate = useCallback(() => {
    const sceneObj = sceneRef.current;
    if (!sceneObj) return;

    // Rotate cube subtly for an elegant motion
    if (sceneObj.cube) {
      sceneObj.cube.rotation.x += 0.01;
      sceneObj.cube.rotation.y += 0.015;
    }

    sceneObj.renderer.render(sceneObj.scene, sceneObj.camera);
    rafRef.current = requestAnimationFrame(animate);
  }, []);

  // Start Demo: loads three if needed and sets up scene
  const handleStart = useCallback(async () => {
    if (isRunning) return;
    setErrorMsg(null);
    setLoading(true);
    try {
      const THREE = await loadThreeFromCDN();
      threeRef.current = THREE;
      const canvas = canvasRef.current;
      if (!canvas) throw new Error("Canvas not available");
      const sceneObj = createCubeScene(THREE, canvas);
      sceneRef.current = sceneObj;
      setIsThreeReady(true);
      setIsRunning(true);
      rafRef.current = requestAnimationFrame(animate);
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Failed to start demo");
    } finally {
      setLoading(false);
    }
  }, [animate, isRunning]);

  // Stop Demo: cancels animation and disposes resources
  const handleStop = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setIsRunning(false);
  }, []);

  // Cleanup scene
  const cleanupScene = useCallback(() => {
    handleStop();
    if (sceneRef.current) {
      sceneRef.current.dispose();
      sceneRef.current = null;
    }
    setIsThreeReady(false);
  }, [handleStop]);

  // Toggle play/pause
  const handleToggle = useCallback(() => {
    if (!isThreeReady) return;
    if (isRunning) {
      handleStop();
      return;
    }
    rafRef.current = requestAnimationFrame(animate);
    setIsRunning(true);
  }, [animate, handleStop, isRunning, isThreeReady]);

  // Unload demo (removes scene and leaves canvas clean)
  const handleUnload = useCallback(() => {
    cleanupScene();
  }, [cleanupScene]);

  // Ensure cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupScene();
    };
  }, [cleanupScene]);

  return (
    <div className="min-h-[100dvh] w-full bg-white text-black">
      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Three.js Mini Demo</h1>
            <p className="text-sm text-gray-600">
              Elegant grayscale showcase — no build-time dependency required.
            </p>
          </div>
          <Badge
            variant="secondary"
            className={`text-xs ${
              isConnected ? "bg-black text-white" : "bg-gray-200 text-gray-800"
            }`}
          >
            {isConnected ? "Socket: Connected" : "Socket: Disconnected"}
          </Badge>
        </div>

        {/* Install guidance */}
        <Card className="mb-6 border border-gray-200 bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Prefer native installs?</CardTitle>
            <CardDescription className="text-gray-600">
              For production, install these packages and replace the CDN loader with direct imports.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-md bg-gray-50 p-3 text-xs text-gray-800">
              npm i three @react-three/fiber @react-three/drei
            </div>
            <p className="text-xs text-gray-600">
              We currently load Three.js from a CDN at runtime to keep this page working with the
              existing package.json. If you want direct imports, please install the packages above.
            </p>
          </CardContent>
        </Card>

        {/* Demo card */}
        <Card className="border border-gray-200 bg-white">
          <CardHeader>
            <CardTitle className="text-lg">Rotating Cube</CardTitle>
            <CardDescription className="text-gray-600">
              Start to load Three.js from CDN and render a minimal scene. Uses black and white with subtle motion.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {/* Canvas container */}
            <div className="relative w-full rounded-md border border-gray-200 bg-white">
              <canvas ref={canvasRef} className="block h-[320px] w-full" />
              {!isThreeReady && (
                <div className="absolute inset-0 grid place-items-center bg-white/70">
                  <div className="text-center">
                    <p className="text-sm text-gray-700">Three.js not loaded</p>
                    <p className="text-xs text-gray-500">Click Start to fetch from CDN</p>
                  </div>
                </div>
              )}
            </div>

            {/* Error notice */}
            {errorMsg && (
              <div className="mt-4 rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-red-600">
                {errorMsg}
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-wrap items-center gap-2">
            {!isThreeReady ? (
              <Button
                variant="default"
                className={`bg-black text-white hover:bg-black/90`}
                onClick={handleStart}
                disabled={loading}
              >
                {loading ? "Loading Three.js…" : "Start"}
              </Button>
            ) : (
              <>
                <Button
                  variant="default"
                  className="bg-black text-white hover:bg-black/90"
                  onClick={handleToggle}
                >
                  {isRunning ? "Pause" : "Resume"}
                </Button>
                <Button variant="secondary" className="bg-gray-200 text-black hover:bg-gray-300" onClick={handleUnload}>
                  Unload
                </Button>
              </>
            )}

            <div className="ml-auto">
              <Badge
                variant="outline"
                className={`text-xs ${
                  isThreeReady ? "border-black text-black" : "border-gray-300 text-gray-600"
                }`}
              >
                {isThreeReady ? "Three.js: Ready (CDN)" : "Three.js: Not Loaded"}
              </Badge>
            </div>
          </CardFooter>
        </Card>

        {/* Subtle footer note */}
        <div className="mt-6 text-center text-xs text-gray-500">
          Tip: After installing three locally, you can swap the CDN loader with import statements for optimal DX.
        </div>
      </div>
    </div>
  );
};

export default ThreeJsCdnShowcaseWithFallbackPage;