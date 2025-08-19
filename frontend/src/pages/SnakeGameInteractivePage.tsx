import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
/ SnakeGameInteractivePage
/ A fully working, elegant grayscale Snake game with keyboard (arrow/WASD) and on-screen controls.
/ - Uses a fixed grid and robust game loop to avoid instant game-over issues.
/ - Prevents 180-degree turns into itself.
/ - Start/Pause/Restart controls and speed selection.
/ - Stores high score in localStorage.
/ - Renders with shadcn/ui Card, Button, Badge for a refined look.
/ - No external dependencies required.
/ - Arrow keys and on-screen D-Pad both work; focus is auto-captured so keyboard works immediately.
/ - Grid is bounded; hitting walls or self ends the game.
*/

type Coord = { x: number; y: number };
type Direction = "up" | "down" | "left" | "right";

const GRID_SIZE = 20; // 20x20 grid

function getInitialSnake(): Coord[] {
  // Start centered, horizontal to the right, length 3:
  // Head at center, body trailing to the left. This avoids starting collisions.
  const mid = Math.floor(GRID_SIZE / 2);
  return [
    { x: mid, y: mid },
    { x: mid - 1, y: mid },
    { x: mid - 2, y: mid },
  ];
}

function randomFood(snake: Coord[]): Coord {
  // Place food not on snake. In small grids this could loop, but with typical sizes it's fine.
  const occupied = new Set(snake.map((p) => `${p.x},${p.y}`));
  while (true) {
    const x = Math.floor(Math.random() * GRID_SIZE);
    const y = Math.floor(Math.random() * GRID_SIZE);
    const key = `${x},${y}`;
    if (!occupied.has(key)) return { x, y };
  }
}

function directionToVector(dir: Direction): Coord {
  switch (dir) {
    case "up":
      return { x: 0, y: -1 };
    case "down":
      return { x: 0, y: 1 };
    case "left":
      return { x: -1, y: 0 };
    case "right":
      return { x: 1, y: 0 };
  }
}

function isOpposite(a: Direction, b: Direction) {
  return (
    (a === "up" && b === "down") ||
    (a === "down" && b === "up") ||
    (a === "left" && b === "right") ||
    (a === "right" && b === "left")
  );
}

const SPEED_OPTIONS = [
  { label: "Relaxed", ms: 180 },
  { label: "Normal", ms: 130 },
  { label: "Fast", ms: 90 },
  { label: "Insane", ms: 60 },
];

const HIGH_SCORE_KEY = "snake_high_score_v1";

const SnakeGameInteractivePage: React.FC = () => {
  // Core game state
  const [snake, setSnake] = useState<Coord[]>(() => getInitialSnake());
  const [direction, setDirection] = useState<Direction>("right"); // Initial direction matches initial snake orientation
  const [food, setFood] = useState<Coord>(() => randomFood(getInitialSnake()));
  const [running, setRunning] = useState<boolean>(false);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => {
    const raw = localStorage.getItem(HIGH_SCORE_KEY);
    return raw ? parseInt(raw, 10) : 0;
  });
  const [speedMs, setSpeedMs] = useState<number>(SPEED_OPTIONS[1].ms); // Default "Normal"

  // Prevent direction changes multiple times per tick
  const changedThisTickRef = useRef<boolean>(false);

  // Needed for keyboard focus so arrow keys work immediately
  const boardWrapperRef = useRef<HTMLDivElement | null>(null);

  // A Set for O(1) collision checks and fast cell styling
  const snakeSet = useMemo(() => new Set(snake.map((s) => `${s.x},${s.y}`)), [snake]);
  const head = snake[0];

  // Handle keyboard input
  const handleDirectionChange = useCallback(
    (next: Direction) => {
      // Don't allow reversing into yourself.
      if (isOpposite(direction, next)) return;
      // Avoid multiple direction changes before a single tick executes
      if (changedThisTickRef.current) return;
      changedThisTickRef.current = true;
      setDirection(next);
    },
    [direction]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Prevent scrolling with arrow keys and space
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
        e.preventDefault();
      }
      if (e.key === "ArrowUp" || e.key.toLowerCase() === "w") handleDirectionChange("up");
      if (e.key === "ArrowDown" || e.key.toLowerCase() === "s") handleDirectionChange("down");
      if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") handleDirectionChange("left");
      if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") handleDirectionChange("right");
      if (e.key === " ") {
        // Space to pause/resume
        setRunning((r) => !r);
      }
      if (e.key.toLowerCase() === "r") {
        // R to restart
        restartGame();
      }
    },
    [handleDirectionChange]
  );

  useEffect(() => {
    // Attach/detach key listeners on mount/unmount
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Ensure the wrapper is focused for keyboard controls
  useEffect(() => {
    boardWrapperRef.current?.focus();
  }, []);

  const tick = useCallback(() => {
    // Single game step
    setSnake((prev) => {
      const dirVec = directionToVector(direction);
      const newHead = { x: prev[0].x + dirVec.x, y: prev[0].y + dirVec.y };

      // Wall collision
      if (
        newHead.x < 0 ||
        newHead.x >= GRID_SIZE ||
        newHead.y < 0 ||
        newHead.y >= GRID_SIZE
      ) {
        setGameOver(true);
        setRunning(false);
        return prev;
      }

      // Self collision: allow moving into the tail if it will move away,
      // but our check is after constructing the new body below.
      const willEat = newHead.x === food.x && newHead.y === food.y;

      const nextSnake = [newHead, ...prev];
      if (!willEat) {
        nextSnake.pop(); // Move forward
      }

      // Self collision check
      const bodySet = new Set(nextSnake.slice(1).map((p) => `${p.x},${p.y}`));
      if (bodySet.has(`${newHead.x},${newHead.y}`)) {
        setGameOver(true);
        setRunning(false);
        return prev; // Keep old snake to show final state
      }

      // Eating food: Update score and place new food
      if (willEat) {
        setScore((s) => {
          const newScore = s + 1;
          if (newScore > highScore) {
            localStorage.setItem(HIGH_SCORE_KEY, String(newScore));
            setHighScore(newScore);
          }
          return newScore;
        });
        setFood(randomFood(nextSnake));
      }

      return nextSnake;
    });

    // Allow direction updates for the next tick
    changedThisTickRef.current = false;
  }, [direction, food, highScore]);

  // Main game loop timer
  useEffect(() => {
    if (!running || gameOver) return;
    const id = setInterval(tick, speedMs);
    return () => clearInterval(id);
  }, [running, gameOver, tick, speedMs]);

  const startGame = () => {
    if (gameOver) {
      restartGame();
      return;
    }
    setRunning(true);
    boardWrapperRef.current?.focus();
  };

  const pauseGame = () => setRunning(false);

  const restartGame = () => {
    const initial = getInitialSnake();
    setSnake(initial);
    setDirection("right");
    setFood(randomFood(initial));
    setScore(0);
    setGameOver(false);
    setRunning(true);
    changedThisTickRef.current = false;
    boardWrapperRef.current?.focus();
  };

  // Render helpers
  const isHead = (x: number, y: number) => head.x === x && head.y === y;
  const isFood = (x: number, y: number) => food.x === x && food.y === y;

  return (
    <div className="w-full min-h-[100dvh] bg-white text-black flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl shadow-2xl border-black/10">
        <CardHeader className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold tracking-tight">Snake</h1>
            <div className="flex items-center gap-2">
              <Badge className="bg-black text-white hover:bg-black">Score: {score}</Badge>
              <Badge className="bg-gray-800 text-white hover:bg-gray-800">High: {highScore}</Badge>
            </div>
          </div>
          <p className="text-sm text-gray-500">
            Arrow keys or WASD to move. Space to pause/resume. R to restart.
          </p>
        </CardHeader>

        <CardContent>
          {/* Controls Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              {!running ? (
                <Button
                  onClick={startGame}
                  className="bg-black text-white hover:bg-black/90"
                >
                  {gameOver ? "Restart" : "Start"}
                </Button>
              ) : (
                <Button
                  onClick={pauseGame}
                  variant="outline"
                  className="border-black text-black hover:bg-black/5"
                >
                  Pause
                </Button>
              )}
              <Button
                onClick={restartGame}
                variant="outline"
                className="border-black text-black hover:bg-black/5"
              >
                Restart
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Speed:</span>
              <div className="flex gap-1">
                {SPEED_OPTIONS.map((opt) => {
                  const active = speedMs === opt.ms;
                  return (
                    <Button
                      key={opt.label}
                      size="sm"
                      variant={active ? "default" : "outline"}
                      onClick={() => setSpeedMs(opt.ms)}
                      className={
                        active
                          ? "bg-black text-white hover:bg-black/90"
                          : "border-black text-black hover:bg-black/5"
                      }
                    >
                      {opt.label}
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Board Wrapper (focusable) */}
          <div
            ref={boardWrapperRef}
            tabIndex={0}
            className="outline-none"
            onKeyDown={(e) => {
              // Extra safety for nested focus, though window listener already handles it.
              if (e.key === "ArrowUp" || e.key.toLowerCase() === "w") handleDirectionChange("up");
              if (e.key === "ArrowDown" || e.key.toLowerCase() === "s") handleDirectionChange("down");
              if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") handleDirectionChange("left");
              if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") handleDirectionChange("right");
            }}
          >
            {/* Game Board: Responsive square using min(92vw, 60vh) for comfortable size */}
            <div
              className="mx-auto border border-black/20 bg-gray-50 rounded-lg overflow-hidden"
              style={{
                width: "min(92vw, 60vh)",
                height: "min(92vw, 60vh)",
                display: "grid",
                gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
                gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)`,
              }}
            >
              {Array.from({ length: GRID_SIZE }).map((_, y) =>
                Array.from({ length: GRID_SIZE }).map((__, x) => {
                  const key = `${x}-${y}`;
                  const isSnake = snakeSet.has(`${x},${y}`);
                  const headCell = isHead(x, y);
                  const foodCell = isFood(x, y);

                  // Elegant grayscale cells:
                  // - Empty: subtle grid background
                  // - Snake body: dark gray
                  // - Snake head: black
                  // - Food: white with a bold black ring
                  return (
                    <div
                      key={key}
                      className="relative"
                      style={{
                        backgroundColor: isSnake ? (headCell ? "#000000" : "#1f2937") : "#f8fafc",
                        borderRight: "1px solid rgba(0,0,0,0.06)",
                        borderBottom: "1px solid rgba(0,0,0,0.06)",
                      }}
                    >
                      {foodCell && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-[55%] h-[55%] rounded-full bg-white border-2 border-black shadow-[0_0_0_2px_rgba(0,0,0,0.1)_inset]" />
                        </div>
                      )}
                      {headCell && (
                        // Direction cue: small lighter square "eye" to indicate heading
                        <div className="absolute inset-0">
                          {direction === "up" && (
                            <div className="w-1.5 h-1.5 bg-white/80 absolute top-1.5 left-1/2 -translate-x-1/2 rounded-sm" />
                          )}
                          {direction === "down" && (
                            <div className="w-1.5 h-1.5 bg-white/80 absolute bottom-1.5 left-1/2 -translate-x-1/2 rounded-sm" />
                          )}
                          {direction === "left" && (
                            <div className="w-1.5 h-1.5 bg-white/80 absolute left-1.5 top-1/2 -translate-y-1/2 rounded-sm" />
                          )}
                          {direction === "right" && (
                            <div className="w-1.5 h-1.5 bg-white/80 absolute right-1.5 top-1/2 -translate-y-1/2 rounded-sm" />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Status */}
          <div className="mt-3 text-center text-sm text-gray-600 min-h-5">
            {!running && !gameOver && <span>Paused</span>}
            {running && <span>Running</span>}
            {gameOver && <span className="text-black font-medium">Game Over</span>}
          </div>

          {/* On-screen D-Pad for touch/mouse users */}
          <div className="mt-4 flex items-center justify-center">
            <div className="grid grid-cols-3 grid-rows-3 gap-2">
              <div />
              <Button
                variant="outline"
                className="border-black text-black hover:bg-black/5"
                onClick={() => handleDirectionChange("up")}
              >
                ↑
              </Button>
              <div />
              <Button
                variant="outline"
                className="border-black text-black hover:bg-black/5"
                onClick={() => handleDirectionChange("left")}
              >
                ←
              </Button>
              <Button
                className="bg-black text-white hover:bg-black/90"
                onClick={() => setRunning((r) => !r)}
              >
                {running ? "Pause" : "Play"}
              </Button>
              <Button
                variant="outline"
                className="border-black text-black hover:bg-black/5"
                onClick={() => handleDirectionChange("right")}
              >
                →
              </Button>
              <div />
              <Button
                variant="outline"
                className="border-black text-black hover:bg-black/5"
                onClick={() => handleDirectionChange("down")}
              >
                ↓
              </Button>
              <div />
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            Tip: Use Space to pause/resume and R to restart quickly.
          </div>
          <div className="text-xs text-gray-400">Bounded grid • Grayscale UI</div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default SnakeGameInteractivePage;