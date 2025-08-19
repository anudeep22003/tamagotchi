import React, { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { Dumbbell, Plus, Play, Pause, Save, Trash2, Check, Clock, Calendar, ChevronRight, ChevronLeft, RefreshCw } from "lucide-react";
import { useAppContext } from "@/context/AppContext";

// Types for workouts and recovery entries
type UUID = string;

type PlannedSet = {
  id: UUID;
  targetReps: number;
  targetWeight: number; // in kg or lbs (user choice)
};

type LoggedSet = {
  id: UUID;
  performedReps: number;
  performedWeight: number;
  rpe?: number; // Rate of Perceived Exertion (1-10)
  completedAt?: string; // ISO date-time
};

type ExercisePlan = {
  id: UUID;
  name: string;
  notes?: string;
  sets: PlannedSet[];
};

type ExerciseLog = {
  id: UUID;
  planId: UUID; // link to exercise plan
  loggedSets: LoggedSet[];
};

type WorkoutPlan = {
  id: UUID;
  name: string;
  createdAt: string; // ISO
  exercises: ExercisePlan[];
};

type WorkoutSession = {
  id: UUID;
  date: string; // ISO date
  planId?: UUID;
  name: string; // display name (defaults from plan)
  startedAt?: string;
  finishedAt?: string;
  exerciseLogs: ExerciseLog[];
  notes?: string;
  unit: "kg" | "lb";
};

type RecoveryEntry = {
  id: UUID;
  date: string; // ISO date
  sleepHours: number; // 0-24
  soreness: number; // 1-10
  energy: number; // 1-10
  hydration: number; // 1-10
  notes?: string;
};

type PersistedState = {
  plans: WorkoutPlan[];
  sessions: WorkoutSession[];
  recovery: RecoveryEntry[];
  preferredUnit: "kg" | "lb";
};

// Utility helpers
const uid = () => crypto.randomUUID();
const todayISODate = () => new Date().toISOString().slice(0, 10);
const fmtTime = (iso?: string) => (iso ? new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--:--");
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString();
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

// Weight unit conversion helpers
const kgToLb = (kg: number) => Math.round(kg * 2.20462 * 10) / 10;
const lbToKg = (lb: number) => Math.round((lb / 2.20462) * 10) / 10;

// Compute a readiness score from recovery inputs (0-100)
const computeReadiness = (r: RecoveryEntry) => {
  // Simple weighted model:
  // sleep: up to 8 hours optimal; soreness lower is better; energy/hydration higher is better
  const sleepScore = clamp((r.sleepHours / 8) * 100, 0, 100);
  const sorenessScore = 100 - ((clamp(r.soreness, 1, 10) - 1) / 9) * 100;
  const energyScore = ((clamp(r.energy, 1, 10) - 1) / 9) * 100;
  const hydrationScore = ((clamp(r.hydration, 1, 10) - 1) / 9) * 100;
  // Weights
  const score = 0.35 * sleepScore + 0.25 * energyScore + 0.25 * hydrationScore + 0.15 * sorenessScore;
  return Math.round(score);
};

// Default seed data to ensure a nice first-run experience
const defaultSeedPlan = (): WorkoutPlan => ({
  id: uid(),
  name: "Push Day A",
  createdAt: new Date().toISOString(),
  exercises: [
    {
      id: uid(),
      name: "Barbell Bench Press",
      notes: "Warm up adequately. Focus on controlled eccentric.",
      sets: [
        { id: uid(), targetReps: 8, targetWeight: 60 },
        { id: uid(), targetReps: 8, targetWeight: 60 },
        { id: uid(), targetReps: 6, targetWeight: 70 },
      ],
    },
    {
      id: uid(),
      name: "Incline Dumbbell Press",
      notes: "",
      sets: [
        { id: uid(), targetReps: 10, targetWeight: 24 },
        { id: uid(), targetReps: 10, targetWeight: 24 },
        { id: uid(), targetReps: 8, targetWeight: 26 },
      ],
    },
    {
      id: uid(),
      name: "Cable Fly",
      notes: "Slow squeeze and stretch.",
      sets: [
        { id: uid(), targetReps: 12, targetWeight: 20 },
        { id: uid(), targetReps: 12, targetWeight: 20 },
      ],
    },
  ],
});

// LocalStorage keys
const LS_KEY = "gym_workout_and_recovery_state_v1";

// Main page component (default export). This will be registered in routes.tsx by the host app.
// Note: We rely on Tailwind and shadcn/ui components (Card, Button, Badge) which are already available in the project.
export default function GymWorkoutAndRecoveryPlannerPage() {
  // We can access global context if needed (messages, connection, etc.)
  // Not required for core functionality, but we show a small connectivity badge for fun.
  const { isConnected } = useAppContext();

  // Local persisted state for plans, sessions, recovery
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [recovery, setRecovery] = useState<RecoveryEntry[]>([]);
  const [preferredUnit, setPreferredUnit] = useState<"kg" | "lb">("kg");

  // UI state
  const [activePlanId, setActivePlanId] = useState<UUID | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<UUID | null>(null);
  const [restTimer, setRestTimer] = useState<number>(90); // seconds
  const [isResting, setIsResting] = useState<boolean>(false);
  const [restRemaining, setRestRemaining] = useState<number>(90);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as PersistedState;
        setPlans(parsed.plans ?? []);
        setSessions(parsed.sessions ?? []);
        setRecovery(parsed.recovery ?? []);
        setPreferredUnit(parsed.preferredUnit ?? "kg");
        // Set a sensible active plan if exists
        if ((parsed.plans ?? []).length > 0) {
          setActivePlanId(parsed.plans[0].id);
        } else {
          // Seed data on first run
          const seed = defaultSeedPlan();
          setPlans([seed]);
          setActivePlanId(seed.id);
        }
      } else {
        // First run: seed with a plan
        const seed = defaultSeedPlan();
        setPlans([seed]);
        setActivePlanId(seed.id);
      }
    } catch {
      // If parsing fails, reset with defaults
      const seed = defaultSeedPlan();
      setPlans([seed]);
      setActivePlanId(seed.id);
      setSessions([]);
      setRecovery([]);
      setPreferredUnit("kg");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist to localStorage whenever data changes
  useEffect(() => {
    const state: PersistedState = {
      plans,
      sessions,
      recovery,
      preferredUnit,
    };
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  }, [plans, sessions, recovery, preferredUnit]);

  // Derived values
  const activePlan = useMemo(() => plans.find((p) => p.id === activePlanId) || null, [plans, activePlanId]);
  const activeSession = useMemo(() => sessions.find((s) => s.id === activeSessionId) || null, [sessions, activeSessionId]);

  const todaySession = useMemo(
    () => sessions.find((s) => s.date === todayISODate()),
    [sessions]
  );

  // Handle rest timer tick
  useEffect(() => {
    if (!isResting || restRemaining <= 0) return;
    const t = setInterval(() => {
      setRestRemaining((r) => {
        if (r <= 1) {
          clearInterval(t);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [isResting, restRemaining]);

  // Helpers for unit display/conversion
  const dispWeight = (w: number) => {
    if (preferredUnit === "kg") return `${w} kg`;
    return `${kgToLb(w)} lb`;
  };
  const inputToKg = (w: number) => (preferredUnit === "kg" ? w : lbToKg(w));

  // Actions: Plan Management
  const addPlan = () => {
    const newPlan: WorkoutPlan = {
      id: uid(),
      name: "New Plan",
      createdAt: new Date().toISOString(),
      exercises: [],
    };
    setPlans((prev) => [newPlan, ...prev]);
    setActivePlanId(newPlan.id);
  };

  const duplicatePlan = (planId: UUID) => {
    const plan = plans.find((p) => p.id === planId);
    if (!plan) return;
    const clone: WorkoutPlan = {
      ...plan,
      id: uid(),
      name: `${plan.name} (Copy)`,
      createdAt: new Date().toISOString(),
      exercises: plan.exercises.map((e) => ({
        ...e,
        id: uid(),
        sets: e.sets.map((s) => ({ ...s, id: uid() })),
      })),
    };
    setPlans((prev) => [clone, ...prev]);
    setActivePlanId(clone.id);
  };

  const deletePlan = (planId: UUID) => {
    setPlans((prev) => prev.filter((p) => p.id !== planId));
    if (activePlanId === planId) setActivePlanId(plans.find((p) => p.id !== planId)?.id ?? null);
  };

  const updatePlanName = (planId: UUID, name: string) => {
    setPlans((prev) => prev.map((p) => (p.id === planId ? { ...p, name } : p)));
  };

  const addExerciseToPlan = (planId: UUID) => {
    setPlans((prev) =>
      prev.map((p) =>
        p.id === planId
          ? {
              ...p,
              exercises: [
                ...p.exercises,
                {
                  id: uid(),
                  name: "New Exercise",
                  notes: "",
                  sets: [{ id: uid(), targetReps: 10, targetWeight: 20 }],
                },
              ],
            }
          : p
      )
    );
  };

  const updateExerciseInPlan = (planId: UUID, exerciseId: UUID, patch: Partial<ExercisePlan>) => {
    setPlans((prev) =>
      prev.map((p) =>
        p.id === planId
          ? {
              ...p,
              exercises: p.exercises.map((e) => (e.id === exerciseId ? { ...e, ...patch } : e)),
            }
          : p
      )
    );
  };

  const removeExerciseFromPlan = (planId: UUID, exerciseId: UUID) => {
    setPlans((prev) =>
      prev.map((p) =>
        p.id === planId ? { ...p, exercises: p.exercises.filter((e) => e.id !== exerciseId) } : p
      )
    );
  };

  const addSetToExercise = (planId: UUID, exerciseId: UUID) => {
    setPlans((prev) =>
      prev.map((p) =>
        p.id === planId
          ? {
              ...p,
              exercises: p.exercises.map((e) =>
                e.id === exerciseId
                  ? {
                      ...e,
                      sets: [...e.sets, { id: uid(), targetReps: 10, targetWeight: 20 }],
                    }
                  : e
              ),
            }
          : p
      )
    );
  };

  const updateSetInExercise = (planId: UUID, exerciseId: UUID, setId: UUID, targetReps: number, targetWeight: number) => {
    setPlans((prev) =>
      prev.map((p) =>
        p.id === planId
          ? {
              ...p,
              exercises: p.exercises.map((e) =>
                e.id === exerciseId
                  ? {
                      ...e,
                      sets: e.sets.map((s) => (s.id === setId ? { ...s, targetReps, targetWeight } : s)),
                    }
                  : e
              ),
            }
          : p
      )
    );
  };

  const removeSetFromExercise = (planId: UUID, exerciseId: UUID, setId: UUID) => {
    setPlans((prev) =>
      prev.map((p) =>
        p.id === planId
          ? {
              ...p,
              exercises: p.exercises.map((e) =>
                e.id === exerciseId ? { ...e, sets: e.sets.filter((s) => s.id !== setId) } : e
              ),
            }
          : p
      )
    );
  };

  // Actions: Session Management
  const startSessionFromPlan = (plan: WorkoutPlan) => {
    const session: WorkoutSession = {
      id: uid(),
      date: todayISODate(),
      planId: plan.id,
      name: plan.name,
      startedAt: new Date().toISOString(),
      unit: preferredUnit,
      exerciseLogs: plan.exercises.map((ex) => ({
        id: uid(),
        planId: ex.id,
        loggedSets: ex.sets.map((s) => ({
          id: uid(),
          performedReps: s.targetReps,
          performedWeight: s.targetWeight,
        })),
      })),
    };
    setSessions((prev) => [session, ...prev]);
    setActiveSessionId(session.id);
  };

  const endActiveSession = () => {
    if (!activeSession) return;
    setSessions((prev) =>
      prev.map((s) => (s.id === activeSession.id ? { ...s, finishedAt: new Date().toISOString() } : s))
    );
  };

  const updateLoggedSet = (sessionId: UUID, exerciseLogId: UUID, setId: UUID, patch: Partial<LoggedSet>) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              exerciseLogs: s.exerciseLogs.map((log) =>
                log.id === exerciseLogId
                  ? {
                      ...log,
                      loggedSets: log.loggedSets.map((ls) => (ls.id === setId ? { ...ls, ...patch } : ls)),
                    }
                  : log
              ),
            }
          : s
      )
    );
  };

  const removeLoggedSet = (sessionId: UUID, exerciseLogId: UUID, setId: UUID) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              exerciseLogs: s.exerciseLogs.map((log) =>
                log.id === exerciseLogId ? { ...log, loggedSets: log.loggedSets.filter((ls) => ls.id !== setId) } : log
              ),
            }
          : s
      )
    );
  };

  const addLoggedSet = (sessionId: UUID, exerciseLogId: UUID) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              exerciseLogs: s.exerciseLogs.map((log) =>
                log.id === exerciseLogId
                  ? {
                      ...log,
                      loggedSets: [
                        ...log.loggedSets,
                        {
                          id: uid(),
                          performedReps: 10,
                          performedWeight: 20,
                        },
                      ],
                    }
                  : log
              ),
            }
          : s
      )
    );
  };

  const deleteSession = (sessionId: UUID) => {
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    if (activeSessionId === sessionId) setActiveSessionId(null);
  };

  // Actions: Recovery Management
  const addRecovery = (entry: Omit<RecoveryEntry, "id">) => {
    setRecovery((prev) => [{ ...entry, id: uid() }, ...prev]);
  };
  const deleteRecovery = (id: UUID) => {
    setRecovery((prev) => prev.filter((r) => r.id !== id));
  };

  // Chart data for recovery (last 14 days)
  const recoveryChartData = useMemo(() => {
    const map = new Map<string, RecoveryEntry>();
    for (const r of recovery) map.set(r.date, r);
    const days: { date: string; readiness: number }[] = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const found = map.get(key);
      days.push({
        date: key.slice(5), // MM-DD
        readiness: found ? computeReadiness(found) : 0,
      });
    }
    return days;
  }, [recovery]);

  // Rest timer controls
  const startRest = () => {
    setRestRemaining(restTimer);
    setIsResting(true);
  };
  const pauseRest = () => setIsResting(false);
  const resetRest = () => {
    setIsResting(false);
    setRestRemaining(restTimer);
  };

  // Minimal form component helper
  const NumberInput = ({
    label,
    value,
    onChange,
    min = 0,
    max = 9999,
    step = 1,
    suffix,
  }: {
    label?: string;
    value: number;
    onChange: (n: number) => void;
    min?: number;
    max?: number;
    step?: number;
    suffix?: string;
  }) => (
    <div className="flex items-center gap-2">
      {label ? <label className="text-xs text-zinc-500">{label}</label> : null}
      <input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(clamp(Number(e.target.value), min, max))}
        min={min}
        max={max}
        step={step}
        className="w-20 rounded-md border border-zinc-200 bg-white px-2 py-1 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
      />
      {suffix ? <span className="text-xs text-zinc-500">{suffix}</span> : null}
    </div>
  );

  // Elegant grayscale UI
  return (
    <div className="min-h-[calc(100svh-0px)] w-full bg-white text-zinc-900">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-zinc-900 text-white">
              <Dumbbell size={18} />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Gym Planner + Recovery</h1>
              <p className="text-xs text-zinc-500">Plan, lift, log, and recover smarter</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-zinc-900 text-white">{preferredUnit.toUpperCase()}</Badge>
            <Button
              variant="outline"
              onClick={() => setPreferredUnit((u) => (u === "kg" ? "lb" : "kg"))}
              className="border-zinc-300 text-zinc-700 hover:bg-zinc-100"
              title="Toggle units"
            >
              Toggle kg/lb
            </Button>
            <Badge className={isConnected ? "bg-green-600 text-white" : "bg-zinc-300 text-zinc-700"}>
              {isConnected ? "Online" : "Offline"}
            </Badge>
          </div>
        </div>
      </header>

      {/* Main grid */}
      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-4 px-4 py-4 lg:grid-cols-3">
        {/* Column 1: Planner */}
        <div className="col-span-1 flex flex-col gap-4">
          <Card className="border-zinc-200">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Workout Planner</span>
                <div className="flex items-center gap-2">
                  <Button onClick={addPlan} className="bg-zinc-900 text-white hover:bg-zinc-800">
                    <Plus className="mr-2 h-4 w-4" /> New Plan
                  </Button>
                  {activePlan && (
                    <Button variant="outline" onClick={() => duplicatePlan(activePlan.id)} className="border-zinc-300 text-zinc-700 hover:bg-zinc-100">
                      Duplicate
                    </Button>
                  )}
                </div>
              </CardTitle>
              <CardDescription>Prepare exercises and targets before you lift</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Plan selector */}
              <div className="flex w-full items-center gap-2">
                <div className="relative w-full">
                  <select
                    value={activePlanId ?? ""}
                    onChange={(e) => setActivePlanId(e.target.value || null)}
                    className="w-full appearance-none rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  >
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDownIcon />
                </div>
                {activePlan && (
                  <Button variant="outline" onClick={() => deletePlan(activePlan.id)} className="border-zinc-300 text-zinc-700 hover:bg-zinc-100">
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </Button>
                )}
              </div>

              {/* Active plan editor */}
              {activePlan ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <input
                      value={activePlan.name}
                      onChange={(e) => updatePlanName(activePlan.id, e.target.value)}
                      className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    />
                    <Badge className="bg-zinc-900 text-white">Plan</Badge>
                  </div>

                  {/* Exercise list */}
                  <div className="space-y-3">
                    {activePlan.exercises.map((ex) => (
                      <div key={ex.id} className="rounded-lg border border-zinc-200 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <input
                            value={ex.name}
                            onChange={(e) => updateExerciseInPlan(activePlan.id, ex.id, { name: e.target.value })}
                            className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeExerciseFromPlan(activePlan.id, ex.id)}
                            className="border-zinc-300 text-zinc-700 hover:bg-zinc-100"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <textarea
                          value={ex.notes ?? ""}
                          onChange={(e) => updateExerciseInPlan(activePlan.id, ex.id, { notes: e.target.value })}
                          placeholder="Notes, tempo, cues..."
                          className="mt-2 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                        />
                        <div className="mt-2 space-y-2">
                          {ex.sets.map((s, idx) => (
                            <div key={s.id} className="flex items-center justify-between gap-2 rounded-md border border-zinc-100 p-2">
                              <div className="flex items-center gap-3">
                                <Badge className="bg-zinc-100 text-zinc-700">Set {idx + 1}</Badge>
                                <NumberInput
                                  label="Reps"
                                  value={s.targetReps}
                                  onChange={(n) => updateSetInExercise(activePlan.id, ex.id, s.id, n, s.targetWeight)}
                                  min={1}
                                  max={50}
                                />
                                <NumberInput
                                  label="Weight"
                                  value={preferredUnit === "kg" ? s.targetWeight : kgToLb(s.targetWeight)}
                                  onChange={(n) => updateSetInExercise(activePlan.id, ex.id, s.id, s.targetReps, inputToKg(n))}
                                  min={0}
                                  max={2000}
                                  step={preferredUnit === "kg" ? 2.5 : 5}
                                  suffix={preferredUnit}
                                />
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => removeSetFromExercise(activePlan.id, ex.id, s.id)}
                                className="border-zinc-300 text-zinc-700 hover:bg-zinc-100"
                              >
                                Remove
                              </Button>
                            </div>
                          ))}
                          <Button
                            variant="outline"
                            onClick={() => addSetToExercise(activePlan.id, ex.id)}
                            className="w-full border-zinc-300 text-zinc-700 hover:bg-zinc-100"
                          >
                            <Plus className="mr-2 h-4 w-4" /> Add Set
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button onClick={() => addExerciseToPlan(activePlan.id)} className="w-full bg-zinc-900 text-white hover:bg-zinc-800">
                    <Plus className="mr-2 h-4 w-4" /> Add Exercise
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-zinc-500">Create a plan to get started.</p>
              )}
            </CardContent>
            <CardFooter className="flex items-center justify-between">
              <div className="text-xs text-zinc-500">Tip: Build your plan before heading to the gym.</div>
              <div className="flex items-center gap-2">
                <Button
                  disabled={!activePlan}
                  onClick={() => activePlan && startSessionFromPlan(activePlan)}
                  className="bg-zinc-900 text-white hover:bg-zinc-800"
                >
                  <Play className="mr-2 h-4 w-4" /> Start Session
                </Button>
              </div>
            </CardFooter>
          </Card>

          {/* Recovery card */}
          <Card className="border-zinc-200">
            <CardHeader>
              <CardTitle>Recovery</CardTitle>
              <CardDescription>Log daily recovery to optimize training</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <RecoveryForm
                onSubmit={(entry) => addRecovery(entry)}
              />
              <div className="h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={recoveryChartData}>
                    <defs>
                      <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0a0a0a" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#0a0a0a" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                    <XAxis dataKey="date" tick={{ fill: "#71717a", fontSize: 12 }} />
                    <YAxis domain={[0, 100]} tick={{ fill: "#71717a", fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, borderColor: "#e5e5e5" }}
                      formatter={(value) => [`${value} / 100`, "Readiness"]}
                      labelFormatter={(label) => `Date: ${label}`}
                    />
                    <Area type="monotone" dataKey="readiness" stroke="#0a0a0a" fill="url(#grad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-2">
                {recovery.slice(0, 6).map((r) => (
                  <div key={r.id} className="flex items-center gap-2 rounded-md border border-zinc-200 px-2 py-1 text-xs">
                    <span className="font-medium">{fmtDate(r.date)}</span>
                    <span className="text-zinc-500">Rdy {computeReadiness(r)}</span>
                    <button onClick={() => deleteRecovery(r.id)} className="text-zinc-400 hover:text-zinc-700">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Column 2: Active Session / Logger */}
        <div className="col-span-1 flex flex-col gap-4">
          <Card className="border-zinc-200">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Workout Session</span>
                {activeSession ? (
                  <Badge className={activeSession.finishedAt ? "bg-zinc-300 text-zinc-700" : "bg-zinc-900 text-white"}>
                    {activeSession.finishedAt ? "Finished" : "Active"}
                  </Badge>
                ) : (
                  <Badge className="bg-zinc-300 text-zinc-700">No session</Badge>
                )}
              </CardTitle>
              <CardDescription>Log reps, weight, and RPE for each set</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {!activeSession && todaySession ? (
                <div className="flex items-center justify-between rounded-md border border-zinc-200 p-3">
                  <div>
                    <div className="text-sm font-medium">{todaySession.name}</div>
                    <div className="text-xs text-zinc-500">
                      Started at {fmtTime(todaySession.startedAt)} • {todaySession.unit.toUpperCase()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button onClick={() => setActiveSessionId(todaySession.id)} className="bg-zinc-900 text-white hover:bg-zinc-800">
                      Resume
                    </Button>
                    <Button variant="outline" onClick={() => deleteSession(todaySession.id)} className="border-zinc-300 text-zinc-700 hover:bg-zinc-100">
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </Button>
                  </div>
                </div>
              ) : null}

              {!activeSession ? (
                <p className="text-sm text-zinc-500">Start a session from a plan to begin logging your workout.</p>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-md border border-zinc-200 p-3">
                    <div>
                      <div className="text-sm font-medium">{activeSession.name}</div>
                      <div className="text-xs text-zinc-500">
                        {fmtDate(activeSession.date)} • Started {fmtTime(activeSession.startedAt)} • Unit {activeSession.unit.toUpperCase()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!activeSession.finishedAt ? (
                        <Button variant="outline" onClick={endActiveSession} className="border-zinc-300 text-zinc-700 hover:bg-zinc-100">
                          <Check className="mr-2 h-4 w-4" /> Finish
                        </Button>
                      ) : (
                        <Button onClick={() => setActiveSessionId(null)} className="bg-zinc-900 text-white hover:bg-zinc-800">
                          Done
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Exercise logs */}
                  <div className="space-y-3">
                    {activeSession.exerciseLogs.map((log, idx) => {
                      const planExercise = activePlan?.exercises.find((e) => e.id === log.planId);
                      return (
                        <div key={log.id} className="rounded-lg border border-zinc-200 p-3">
                          <div className="mb-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-zinc-100 text-zinc-700">#{idx + 1}</Badge>
                              <div className="font-medium">{planExercise?.name ?? "Exercise"}</div>
                            </div>
                            <div className="text-xs text-zinc-500">{planExercise?.notes}</div>
                          </div>
                          <div className="space-y-2">
                            {log.loggedSets.map((set, sIdx) => (
                              <div key={set.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-zinc-100 p-2">
                                <div className="flex items-center gap-3">
                                  <Badge className="bg-zinc-100 text-zinc-700">Set {sIdx + 1}</Badge>
                                  <NumberInput
                                    label="Reps"
                                    value={set.performedReps}
                                    onChange={(n) => updateLoggedSet(activeSession.id, log.id, set.id, { performedReps: n })}
                                    min={0}
                                    max={100}
                                  />
                                  <NumberInput
                                    label="Weight"
                                    value={preferredUnit === "kg" ? set.performedWeight : kgToLb(set.performedWeight)}
                                    onChange={(n) => updateLoggedSet(activeSession.id, log.id, set.id, { performedWeight: inputToKg(n) })}
                                    min={0}
                                    max={2000}
                                    step={preferredUnit === "kg" ? 2.5 : 5}
                                    suffix={preferredUnit}
                                  />
                                  <NumberInput
                                    label="RPE"
                                    value={set.rpe ?? 7}
                                    onChange={(n) => updateLoggedSet(activeSession.id, log.id, set.id, { rpe: clamp(n, 1, 10) })}
                                    min={1}
                                    max={10}
                                    step={0.5}
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      updateLoggedSet(activeSession.id, log.id, set.id, { completedAt: new Date().toISOString() })
                                    }
                                    className="border-zinc-300 text-zinc-700 hover:bg-zinc-100"
                                  >
                                    <Check className="mr-2 h-4 w-4" /> Mark
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => removeLoggedSet(activeSession.id, log.id, set.id)}
                                    className="border-zinc-300 text-zinc-700 hover:bg-zinc-100"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                            <Button
                              variant="outline"
                              onClick={() => addLoggedSet(activeSession.id, log.id)}
                              className="w-full border-zinc-300 text-zinc-700 hover:bg-zinc-100"
                            >
                              <Plus className="mr-2 h-4 w-4" /> Add Set
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Rest timer */}
                  <div className="rounded-lg border border-zinc-200 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-zinc-500" />
                        <div className="font-medium">Rest Timer</div>
                      </div>
                      <div className="text-xs text-zinc-500">Set your ideal rest between sets</div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <NumberInput
                          label="Duration"
                          value={restTimer}
                          onChange={(n) => {
                            setRestTimer(n);
                            setRestRemaining(n);
                          }}
                          min={10}
                          max={600}
                          step={5}
                          suffix="sec"
                        />
                        <div className="text-2xl tabular-nums">{String(Math.floor(restRemaining / 60)).padStart(2, "0")}:{String(restRemaining % 60).padStart(2, "0")}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!isResting ? (
                          <Button onClick={startRest} className="bg-zinc-900 text-white hover:bg-zinc-800">
                            <Play className="mr-2 h-4 w-4" /> Start
                          </Button>
                        ) : (
                          <Button variant="outline" onClick={pauseRest} className="border-zinc-300 text-zinc-700 hover:bg-zinc-100">
                            <Pause className="mr-2 h-4 w-4" /> Pause
                          </Button>
                        )}
                        <Button variant="outline" onClick={resetRest} className="border-zinc-300 text-zinc-700 hover:bg-zinc-100">
                          <RefreshCw className="mr-2 h-4 w-4" /> Reset
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Column 3: History and Insights */}
        <div className="col-span-1 flex flex-col gap-4">
          <Card className="border-zinc-200">
            <CardHeader>
              <CardTitle>History</CardTitle>
              <CardDescription>Previous sessions and performance trends</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {sessions.length === 0 ? (
                <p className="text-sm text-zinc-500">No sessions yet. Start one from your plan.</p>
              ) : (
                sessions.slice(0, 6).map((s) => (
                  <div key={s.id} className="flex items-center justify-between rounded-md border border-zinc-200 p-3">
                    <div>
                      <div className="text-sm font-medium">{s.name}</div>
                      <div className="text-xs text-zinc-500">
                        <Calendar className="mr-1 inline-block h-3.5 w-3.5" />
                        {fmtDate(s.date)} • {s.startedAt ? fmtTime(s.startedAt) : "--"} to {s.finishedAt ? fmtTime(s.finishedAt) : "--"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" onClick={() => setActiveSessionId(s.id)} className="border-zinc-300 text-zinc-700 hover:bg-zinc-100">
                        View
                      </Button>
                      <Button variant="outline" onClick={() => deleteSession(s.id)} className="border-zinc-300 text-zinc-700 hover:bg-zinc-100">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
            <CardFooter className="justify-between">
              <div className="text-xs text-zinc-500">Total sessions: {sessions.length}</div>
              <div className="text-xs text-zinc-500">
                Completed today: {sessions.filter((s) => s.date === todayISODate()).length}
              </div>
            </CardFooter>
          </Card>

          {/* Simple volume trend chart based on last 10 sessions */}
          <Card className="border-zinc-200">
            <CardHeader>
              <CardTitle>Training Volume</CardTitle>
              <CardDescription>Last 10 sessions (total weight x reps)</CardDescription>
            </CardHeader>
            <CardContent className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={[...sessions]
                    .slice(0, 10)
                    .reverse()
                    .map((s) => {
                      const vol = s.exerciseLogs.reduce((sum, log) => {
                        return (
                          sum +
                          log.loggedSets.reduce((acc, ls) => acc + ls.performedWeight * ls.performedReps, 0)
                        );
                      }, 0);
                      return { name: s.date.slice(5), volume: Math.round(vol) };
                    })}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis dataKey="name" tick={{ fill: "#71717a", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#71717a", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, borderColor: "#e5e5e5" }}
                    formatter={(value) => [`${value} ${preferredUnit}·reps`, "Volume"]}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Line type="monotone" dataKey="volume" stroke="#0a0a0a" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
            <CardFooter>
              <div className="text-xs text-zinc-500">
                Volume is calculated as the sum of weight × reps for all sets in a session.
              </div>
            </CardFooter>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="mx-auto max-w-6xl px-4 py-6 text-center text-xs text-zinc-500">
        Built for focused training. All data is stored locally in your browser.
      </footer>
    </div>
  );
}

// Simple ChevronDown icon for native select styling
function ChevronDownIcon() {
  return (
    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-500">
      <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path
          fillRule="evenodd"
          d="M5.23 7.21a.75.75 0 011.06.02L10 10.939l3.71-3.71a.75.75 0 111.06 1.062l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
          clipRule="evenodd"
        />
      </svg>
    </div>
  );
}

// Recovery quick-entry form
function RecoveryForm({ onSubmit }: { onSubmit: (entry: Omit<RecoveryEntry, "id">) => void }) {
  const [date, setDate] = useState<string>(todayISODate());
  const [sleep, setSleep] = useState<number>(7.5);
  const [soreness, setSoreness] = useState<number>(3);
  const [energy, setEnergy] = useState<number>(7);
  const [hydration, setHydration] = useState<number>(7);
  const [notes, setNotes] = useState<string>("");

  const handleAdd = () => {
    onSubmit({
      date,
      sleepHours: sleep,
      soreness,
      energy,
      hydration,
      notes: notes.trim() || undefined,
    });
    setNotes("");
  };

  return (
    <div className="rounded-lg border border-zinc-200 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge className="bg-zinc-100 text-zinc-700">Entry</Badge>
          <div className="text-sm font-medium">New Recovery</div>
        </div>
        <div className="text-xs text-zinc-500">Readiness updates your chart</div>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <div className="col-span-2 md:col-span-1">
          <label className="mb-1 block text-xs text-zinc-500">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={todayISODate()}
            className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
          />
        </div>
        <NumberField label="Sleep (h)" value={sleep} onChange={setSleep} min={0} max={24} step={0.5} />
        <NumberField label="Soreness (1-10)" value={soreness} onChange={(n) => setSoreness(clamp(n, 1, 10))} min={1} max={10} step={1} />
        <NumberField label="Energy (1-10)" value={energy} onChange={(n) => setEnergy(clamp(n, 1, 10))} min={1} max={10} step={1} />
        <NumberField label="Hydration (1-10)" value={hydration} onChange={(n) => setHydration(clamp(n, 1, 10))} min={1} max={10} step={1} />
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes (optional)"
        className="mt-3 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
      />
      <div className="mt-3 flex items-center justify-end">
        <Button onClick={handleAdd} className="bg-zinc-900 text-white hover:bg-zinc-800">
          <Save className="mr-2 h-4 w-4" /> Save Recovery
        </Button>
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min = 0,
  max = 9999,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-zinc-500">{label}</label>
      <input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(clamp(Number(e.target.value), min, max))}
        min={min}
        max={max}
        step={step}
        className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
      />
    </div>
  );
}