import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAppContext } from "@/context/AppContext";

// A sleek, grayscale Snake.io game page.
// - Responsive canvas that scales to its container
// - Keyboard (WASD/Arrow) and on-screen controls
// - Start/Pause/Reset, Speed control, Score + High score with localStorage
// - Clean Shadcn UI using Card, Button, Badge
// - Uses requestAnimationFrame with time-based stepping for smooth gameplay

type Point = { x: number; y: number };
type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";

const GRID_COLS = 24; // logical grid columns
const GRID_ROWS = 24; // logical grid rows
const INITIAL_SNAKE_LENGTH = 4;
const HIGH_SCORE_KEY = "snake_highscore_v1";

const SPEED_PRESETS: Record<string, number> = {
  Slow: 160, // ms per step
  Normal: 110,
  Fast: 70,
  Turbo: 45,
};

function getOppositeDirection(dir: Direction): Direction {
  switch (dir) {
    case "UP":
      return "DOWN";
    case "DOWN":
      return "UP";
    case "LEFT":
      return "RIGHT";
    case "RIGHT":
      return "LEFT";
  }
}

function randomFood(snake: Point[], cols = GRID_COLS, rows = GRID_ROWS): Point {
  const occupied = new Set(snake.map((s) => `${s.x},${s.y}`));
  let tries = 0;
  while (tries < cols * rows) {
    const x = Math.floor(Math.random() * cols);
    const y = Math.floor(Math.random() * rows);
    const key = `${x},${y}`;
    if (!occupied.has(key)) return { x, y };
    tries++;
  }
  // fallback (should be rare)
  return { x: Math.floor(cols / 2), y: Math.floor(rows / 2) };
}

function initSnake(): Point[] {
  // Start horizontally centered, moving right
  const startX = Math.floor(GRID_COLS / 3);
  const startY = Math.floor(GRID_ROWS / 2);
  const body: Point[] = [];
  for (let i = 0; i < INITIAL_SNAKE_LENGTH; i++) {
    body.unshift({ x: startX + i, y: startY });
  }
  return body;
}

function drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number, cell: number) {
  ctx.save();
  ctx.strokeStyle = "rgba(0,0,0,0.08)";
  ctx.lineWidth = 1;

  // Vertical lines
  for (let x = 0.5; x <= width; x += cell) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  // Horizontal lines
  for (let y = 0.5; y <= height; y += cell) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  ctx.restore();
}

function drawSnake(ctx: CanvasRenderingContext2D, snake: Point[], cell: number, radius = 4) {
  // Head
  const head = snake[snake.length - 1];
  const headX = head.x * cell;
  const headY = head.y * cell;

  // Body styling
  ctx.save();
  // Body segments
  for (let i = 0; i < snake.length - 1; i++) {
    const seg = snake[i];
    ctx.fillStyle = i % 2 === 0 ? "#111111" : "#1f1f1f";
    roundRectFill(ctx, seg.x * cell + 2, seg.y * cell + 2, cell - 4, cell - 4, radius);
  }

  // Head with brighter edge
  const gradient = ctx.createLinearGradient(headX, headY, headX + cell, headY + cell);
  gradient.addColorStop(0, "#111111");
  gradient.addColorStop(1, "#000000");
  ctx.fillStyle = gradient;
  roundRectFill(ctx, headX + 1, headY + 1, cell - 2, cell - 2, radius + 2);

  // Eyes (minimalist)
  const eyeR = Math.max(1, Math.floor(cell * 0.08));
  ctx.fillStyle = "#FFFFFF";
  const eyeOffset = Math.max(2, Math.floor(cell * 0.18));
  // Determine eye placement based on direction vector from neck to head
  const neck = snake[snake.length - 2] ?? head;
  const dx = head.x - neck.x;
  const dy = head.y - neck.y;
  let ex1 = headX + cell / 2;
  let ey1 = headY + cell / 2;
  let ex2 = ex1;
  let ey2 = ey1;

  if (dx === 1) {
    // right
    ex1 = headX + cell - eyeOffset;
    ey1 = headY + eyeOffset + 1;
    ex2 = headX + cell - eyeOffset;
    ey2 = headY + cell - eyeOffset - 1;
  } else if (dx === -1) {
    // left
    ex1 = headX + eyeOffset;
    ey1 = headY + eyeOffset + 1;
    ex2 = headX + eyeOffset;
    ey2 = headY + cell - eyeOffset - 1;
  } else if (dy === 1) {
    // down
    ex1 = headX + eyeOffset + 1;
    ey1 = headY + cell - eyeOffset;
    ex2 = headX + cell - eyeOffset - 1;
    ey2 = headY + cell - eyeOffset;
  } else {
    // up
    ex1 = headX + eyeOffset + 1;
    ey1 = headY + eyeOffset;
    ex2 = headX + cell - eyeOffset - 1;
    ey2 = headY + eyeOffset;
  }
  circle(ctx, ex1, ey1, eyeR);
  circle(ctx, ex2, ey2, eyeR);

  ctx.restore();
}

function drawFood(ctx: CanvasRenderingContext2D, food: Point, cell: number) {
  ctx.save();
  const x = food.x * cell;
  const y = food.y * cell;
  // Food: crisp white diamond on grayscale board
  ctx.translate(x + cell / 2, y + cell / 2);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = "#FFFFFF";
  ctx.shadowColor = "rgba(0,0,0,0.25)";
  ctx.shadowBlur = 6;
  ctx.fillRect(-cell * 0.22, -cell * 0.22, cell * 0.44, cell * 0.44);
  ctx.restore();
}

function roundRectFill(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
  ctx.fill();
}

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function useResizeObserver<T extends HTMLElement>(onResize: (rect: DOMRectReadOnly) => void) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) onResize(entry.contentRect);
    });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [onResize]);
  return ref;
}

const SnakeIoPlaygroundPage: React.FC = () => {
  const { isConnected } = useAppContext(); // optional display to show socket availability from app context
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useResizeObserver<HTMLDivElement>((rect) => {
    // Resize canvas to maintain crisp pixels on devicePixelRatio changes
    setViewportSize({ w: rect.width, h: rect.height });
  });

  const [viewportSize, setViewportSize] = useState<{ w: number; h: number }>({ w: 640, h: 640 });
  const [snake, setSnake] = useState<Point[]>(() => initSnake());
  const [direction, setDirection] = useState<Direction>("RIGHT");
  const [pendingDir, setPendingDir] = useState<Direction | null>(null); // for processing one direction change per tick
  const [food, setFood] = useState<Point>(() => randomFood(initSnake()));
  const [running, setRunning] = useState<boolean>(false);
  const [paused, setPaused] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => {
    const v = Number(localStorage.getItem(HIGH_SCORE_KEY) || "0");
    return Number.isFinite(v) ? v : 0;
  });
  const [speedName, setSpeedName] = useState<keyof typeof SPEED_PRESETS>("Normal");
  const speedMs = SPEED_PRESETS[speedName];

  // Cell size computed from viewport so that full grid fits and is square
  const cellSize = useMemo(() => {
    const size = Math.floor(Math.min(viewportSize.w, viewportSize.h) / Math.max(GRID_COLS, GRID_ROWS));
    return Math.max(10, Math.min(40, size)); // clamp for good visuals
  }, [viewportSize.w, viewportSize.h]);

  // Fit canvas pixels to chosen cell size
  const canvasPixelSize = useMemo(() => {
    return {
      width: GRID_COLS * cellSize,
      height: GRID_ROWS * cellSize,
    };
  }, [cellSize]);

  // Handle keyboard controls with reverse-prevention
  const handleDirection = useCallback(
    (next: Direction) => {
      // Avoid reversing in a single step
      const current = pendingDir ?? direction;
      if (getOppositeDirection(current) === next) return;
      setPendingDir(next);
    },
    [direction, pendingDir]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" || e.key.toLowerCase() === "w") handleDirection("UP");
      else if (e.key === "ArrowDown" || e.key.toLowerCase() === "s") handleDirection("DOWN");
      else if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") handleDirection("LEFT");
      else if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") handleDirection("RIGHT");
      else if (e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        if (running) togglePause();
      } else if (e.key.toLowerCase() === "enter") {
        if (!running) startGame();
      } else if (e.key.toLowerCase() === "r") {
        resetGame();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleDirection, running]);

  // Game loop powered by requestAnimationFrame with time-step based movement
  const lastStepRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);

  const stepOnce = useCallback(() => {
    setSnake((prev) => {
      const currentDir = pendingDir ?? direction;
      // Commit any pending direction for this tick
      setDirection(currentDir);
      setPendingDir(null);

      const head = prev[prev.length - 1];
      let nextHead: Point = head;
      if (currentDir === "UP") nextHead = { x: head.x, y: head.y - 1 };
      if (currentDir === "DOWN") nextHead = { x: head.x, y: head.y + 1 };
      if (currentDir === "LEFT") nextHead = { x: head.x - 1, y: head.y };
      if (currentDir === "RIGHT") nextHead = { x: head.x + 1, y: head.y };

      // Wrap-around world (io-style)
      if (nextHead.x < 0) nextHead.x = GRID_COLS - 1;
      if (nextHead.x >= GRID_COLS) nextHead.x = 0;
      if (nextHead.y < 0) nextHead.y = GRID_ROWS - 1;
      if (nextHead.y >= GRID_ROWS) nextHead.y = 0;

      // Check collision with self
      const bodySet = new Set(prev.map((p) => `${p.x},${p.y}`));
      const willCollide = bodySet.has(`${nextHead.x},${nextHead.y}`);
      if (willCollide) {
        endGame();
        return prev;
      }

      // Move snake
      const newSnake = [...prev, nextHead];
      const ate = nextHead.x === food.x && nextHead.y === food.y;

      if (ate) {
        // Grow and place new food
        setScore((s) => {
          const ns = s + 1;
          if (ns > highScore) {
            setHighScore(ns);
            localStorage.setItem(HIGH_SCORE_KEY, String(ns));
          }
          return ns;
        });
        setFood((f) => randomFood(newSnake));
        // Keep tail to grow
      } else {
        // Remove tail
        newSnake.shift();
      }

      return newSnake;
    });
  }, [direction, pendingDir, food.x, food.y, highScore]);

  const gameLoop = useCallback(
    (t: number) => {
      if (!running || paused) return;
      if (!lastStepRef.current) lastStepRef.current = t;

      const elapsed = t - lastStepRef.current;
      if (elapsed >= speedMs) {
        lastStepRef.current = t;
        stepOnce();
      }
      rafRef.current = requestAnimationFrame(gameLoop);
    },
    [paused, running, speedMs, stepOnce]
  );

  useEffect(() => {
    if (running && !paused) {
      rafRef.current = requestAnimationFrame(gameLoop);
      return () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      };
    }
    return;
  }, [running, paused, gameLoop]);

  // Draw the board each frame after state updates
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = canvasPixelSize.width * dpr;
    canvas.height = canvasPixelSize.height * dpr;
    canvas.style.width = `${canvasPixelSize.width}px`;
    canvas.style.height = `${canvasPixelSize.height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Background
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, canvasPixelSize.width, canvasPixelSize.height);

    // Subtle vignette
    const grad = ctx.createRadialGradient(
      canvasPixelSize.width / 2,
      canvasPixelSize.height / 2,
      Math.min(canvasPixelSize.width, canvasPixelSize.height) * 0.2,
      canvasPixelSize.width / 2,
      canvasPixelSize.height / 2,
      Math.max(canvasPixelSize.width, canvasPixelSize.height) * 0.7
    );
    grad.addColorStop(0, "rgba(255,255,255,0.02)");
    grad.addColorStop(1, "rgba(0,0,0,0.6)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvasPixelSize.width, canvasPixelSize.height);

    // Grid
    drawGrid(ctx, canvasPixelSize.width, canvasPixelSize.height, cellSize);

    // Food and Snake
    drawFood(ctx, food, cellSize);
    drawSnake(ctx, snake, cellSize);
  }, [canvasPixelSize.height, canvasPixelSize.width, cellSize, food, snake]);

  // Controls
  const startGame = useCallback(() => {
    setSnake(initSnake());
    setDirection("RIGHT");
    setPendingDir(null);
    setFood((f) => randomFood(initSnake()));
    setScore(0);
    lastStepRef.current = 0;
    setPaused(false);
    setRunning(true);
  }, []);

  const togglePause = useCallback(() => {
    if (!running) return;
    setPaused((p) => !p);
  }, [running]);

  const endGame = useCallback(() => {
    setRunning(false);
    setPaused(false);
  }, []);

  const resetGame = useCallback(() => {
    setRunning(false);
    setPaused(false);
    setSnake(initSnake());
    setDirection("RIGHT");
    setPendingDir(null);
    setFood((f) => randomFood(initSnake()));
    setScore(0);
    lastStepRef.current = 0;
  }, []);

  // On-screen direction controls (mobile-friendly)
  const DirectionPad = () => {
    return (
      <div className="grid grid-cols-3 gap-2 items-center justify-items-center">
        <div />
        <Button
          variant="secondary"
          className="h-10 w-16 bg-neutral-800 text-white hover:bg-neutral-700"
          onClick={() => handleDirection("UP")}
        >
          ↑
        </Button>
        <div />

        <Button
          variant="secondary"
          className="h-10 w-16 bg-neutral-800 text-white hover:bg-neutral-700"
          onClick={() => handleDirection("LEFT")}
        >
          ←
        </Button>
        <div />
        <Button
          variant="secondary"
          className="h-10 w-16 bg-neutral-800 text-white hover:bg-neutral-700"
          onClick={() => handleDirection("RIGHT")}
        >
          →
        </Button>

        <div />
        <Button
          variant="secondary"
          className="h-10 w-16 bg-neutral-800 text-white hover:bg-neutral-700"
          onClick={() => handleDirection("DOWN")}
        >
          ↓
        </Button>
        <div />
      </div>
    );
  };

  return (
    <div className="w-full min-h-[100dvh] bg-white text-black flex items-center justify-center p-4">
      <Card className="w-full max-w-[980px] shadow-2xl border-neutral-200 bg-white">
        <CardHeader className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <CardTitle className="text-2xl font-semibold tracking-tight">
              Snake.io
            </CardTitle>
            <CardDescription className="text-neutral-500">
              Elegant grayscale take on the classic. Use arrows/WASD. Wrap-around world.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-black text-white">Score {score}</Badge>
            <Badge className="bg-neutral-200 text-neutral-900">High {highScore}</Badge>
            <Badge className={isConnected ? "bg-green-600 text-white" : "bg-neutral-300 text-neutral-800"}>
              {isConnected ? "Online" : "Offline"}
            </Badge>
          </div>
        </CardHeader>

        <CardContent>
          <div
            ref={wrapRef}
            className="w-full aspect-square max-h-[70vh] mx-auto rounded-lg border border-neutral-200 overflow-hidden bg-neutral-100 flex items-center justify-center"
          >
            <div
              className="relative"
              style={{
                width: `${canvasPixelSize.width}px`,
                height: `${canvasPixelSize.height}px`,
              }}
            >
              <canvas ref={canvasRef} className="rounded-md" />
              {!running && (
                <div className="absolute inset-0 bg-black/60 text-white flex flex-col items-center justify-center gap-4">
                  <div className="text-lg sm:text-xl text-neutral-200">Ready?</div>
                  <Button onClick={startGame} className="bg-white text-black hover:bg-neutral-200">
                    Start Game
                  </Button>
                  <div className="text-xs text-neutral-400">
                    Use Arrow Keys or WASD. Press Space to Pause.
                  </div>
                </div>
              )}
              {running && paused && (
                <div className="absolute inset-0 bg-black/50 text-white flex flex-col items-center justify-center gap-3">
                  <div className="text-xl font-medium">Paused</div>
                  <Button onClick={togglePause} className="bg-white text-black hover:bg-neutral-200">
                    Resume
                  </Button>
                </div>
              )}
              {!running && score > 0 && (
                <div className="absolute inset-x-0 bottom-0 p-3 text-center text-neutral-600 text-sm">
                  Game Over — press Start to try again
                </div>
              )}
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button
              onClick={startGame}
              className="bg-black text-white hover:bg-neutral-800"
              disabled={running && !paused}
            >
              {running ? "Restart" : "Start"}
            </Button>
            <Button
              onClick={togglePause}
              className="bg-neutral-900 text-white hover:bg-neutral-800"
              disabled={!running}
            >
              {paused ? "Resume" : "Pause"}
            </Button>
            <Button onClick={resetGame} variant="secondary" className="bg-neutral-200 text-black hover:bg-neutral-300">
              Reset
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {Object.keys(SPEED_PRESETS).map((k) => {
              const active = speedName === (k as keyof typeof SPEED_PRESETS);
              return (
                <Button
                  key={k}
                  onClick={() => setSpeedName(k as keyof typeof SPEED_PRESETS)}
                  className={active ? "bg-black text-white hover:bg-neutral-900" : "bg-white text-black hover:bg-neutral-100 border border-neutral-200"}
                  variant={active ? "default" : "secondary"}
                >
                  {k}
                </Button>
              );
            })}
          </div>

          <div className="w-full sm:w-auto">
            <DirectionPad />
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default SnakeIoPlaygroundPage;