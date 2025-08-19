import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAppContext } from "@/context/AppContext";

// Types describing nutrition information
type Macros = {
  calories: number; // kcal
  protein: number; // g
  carbs: number; // g
  fat: number; // g
};

type FoodItem = {
  id: string;
  name: string;
  // Optional user-editable description/notes like "no mayo", "grilled"
  notes?: string;
  // Portion weight in grams (for macro scaling)
  grams: number;
  // Macros for the portion above (not per 100g)
  macros: Macros;
  // Confidence score (0-1) if provided by vision service
  confidence?: number;
  // Ingredient breakdown if provided
  ingredients?: string[];
  // Source of the item: "vision" from AI or "manual" from user
  source: "vision" | "manual";
};

// A tiny in-memory nutrition lookup to help with manual entries and fallbacks.
// Values are per 100g typical approximations.
const PER_100G_DB: Record<
  string,
  { calories: number; protein: number; carbs: number; fat: number }
> = {
  "chicken breast": { calories: 165, protein: 31, carbs: 0, fat: 3.6 },
  "salmon": { calories: 208, protein: 20, carbs: 0, fat: 13 },
  "egg": { calories: 155, protein: 13, carbs: 1.1, fat: 11 },
  "rice (white, cooked)": { calories: 130, protein: 2.7, carbs: 28, fat: 0.3 },
  "rice (brown, cooked)": { calories: 111, protein: 2.6, carbs: 23, fat: 0.9 },
  "pasta (cooked)": { calories: 158, protein: 5.8, carbs: 30, fat: 0.9 },
  "avocado": { calories: 160, protein: 2, carbs: 9, fat: 15 },
  "banana": { calories: 89, protein: 1.1, carbs: 23, fat: 0.3 },
  "apple": { calories: 52, protein: 0.3, carbs: 14, fat: 0.2 },
  "broccoli": { calories: 55, protein: 3.7, carbs: 11, fat: 0.6 },
  "spinach": { calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4 },
  "oatmeal (cooked)": { calories: 71, protein: 2.5, carbs: 12, fat: 1.5 },
  "bread (white)": { calories: 265, protein: 9, carbs: 49, fat: 3.2 },
  "bread (whole wheat)": { calories: 247, protein: 13, carbs: 41, fat: 4.2 },
  "cheddar cheese": { calories: 403, protein: 25, carbs: 1.3, fat: 33 },
  "yogurt (plain)": { calories: 61, protein: 3.5, carbs: 4.7, fat: 3.3 },
  "peanut butter": { calories: 588, protein: 25, carbs: 20, fat: 50 },
  "olive oil": { calories: 884, protein: 0, carbs: 0, fat: 100 },
  "beef (ground, 85% lean, cooked)": { calories: 250, protein: 26, carbs: 0, fat: 15 },
  "potato (baked)": { calories: 93, protein: 2.5, carbs: 21, fat: 0.1 },
  "tomato": { calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2 },
  "lettuce": { calories: 15, protein: 1.4, carbs: 2.9, fat: 0.2 },
  "pizza (avg)": { calories: 266, protein: 11, carbs: 33, fat: 10 },
  "burger (avg)": { calories: 295, protein: 17, carbs: 30, fat: 12 },
  "fries": { calories: 312, protein: 3.4, carbs: 41, fat: 15 },
};

// Utility: compute macros for an item given a base per-100g entry and grams
function macrosForGrams(per100g: Macros, grams: number): Macros {
  const factor = grams / 100;
  return {
    calories: Math.round(per100g.calories * factor),
    protein: +(per100g.protein * factor).toFixed(1),
    carbs: +(per100g.carbs * factor).toFixed(1),
    fat: +(per100g.fat * factor).toFixed(1),
  };
}

// Utility: derive macro totals
function sumMacros(items: FoodItem[]): Macros {
  return items.reduce(
    (acc, it) => {
      acc.calories += it.macros.calories;
      acc.protein += it.macros.protein;
      acc.carbs += it.macros.carbs;
      acc.fat += it.macros.fat;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 } as Macros
  );
}

// Convert a File/Blob to base64 string (data URL)
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = (e) => reject(e);
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
}

// Heuristic offline keyword matcher (best-effort when server vision is unavailable).
// It doesn't read the image; it uses filename hints to produce a placeholder estimate.
function offlineGuessByFilename(name: string): FoodItem[] {
  const lc = name.toLowerCase();
  const found: FoodItem[] = [];
  const tryAdd = (key: string, grams: number) => {
    if (PER_100G_DB[key]) {
      const macro = macrosForGrams(PER_100G_DB[key], grams);
      found.push({
        id: crypto.randomUUID(),
        name: key,
        grams,
        macros: macro,
        source: "manual",
        notes: "(offline estimate via filename)",
        confidence: 0.2,
      });
    }
  };
  if (lc.includes("pizza")) tryAdd("pizza (avg)", 180);
  if (lc.includes("burger")) tryAdd("burger (avg)", 220);
  if (lc.includes("fries")) tryAdd("fries", 120);
  if (lc.includes("chicken")) tryAdd("chicken breast", 150);
  if (lc.includes("salmon")) tryAdd("salmon", 150);
  if (lc.includes("rice")) tryAdd("rice (white, cooked)", 200);
  if (lc.includes("oat")) tryAdd("oatmeal (cooked)", 200);
  if (lc.includes("banana")) tryAdd("banana", 120);
  if (lc.includes("apple")) tryAdd("apple", 180);
  if (lc.includes("broccoli")) tryAdd("broccoli", 100);
  if (lc.includes("yogurt")) tryAdd("yogurt (plain)", 170);
  return found;
}

// Main page component (default export). It is designed to be added to routes.tsx.
// It uses an elegant grayscale theme with Shadcn UI components and works within the existing AppProvider.
export default function CalorieVisionTrackerPersonalizedPage() {
  // Access app context and socket
  const { isConnected, emit, socket } = useAppContext();

  // Upload and capture state
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  // Nutrition analysis state
  const [items, setItems] = useState<FoodItem[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<string>(""); // user optional notes (e.g., no sauce)

  // Manual add state
  const [manualName, setManualName] = useState("");
  const [manualGrams, setManualGrams] = useState<number>(100);
  const [manualCalories, setManualCalories] = useState<string>("");
  const [manualProtein, setManualProtein] = useState<string>("");
  const [manualCarbs, setManualCarbs] = useState<string>("");
  const [manualFat, setManualFat] = useState<string>("");

  // Refs for socket listeners to avoid duplicate bindings
  const boundRef = useRef(false);

  // Build a grayscale progress bar for macros
  const MacroBar = ({ label, value, max }: { label: string; value: number; max: number }) => {
    const pct = Math.min(100, Math.round((value / max) * 100 || 0));
    return (
      <div className="w-full">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>{label}</span>
          <span className="tabular-nums">{value.toFixed(label === "Calories" ? 0 : 1)}{label === "Calories" ? " kcal" : " g"}</span>
        </div>
        <div className="h-2 w-full bg-gray-200 rounded">
          <div
            className="h-2 bg-black rounded"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  };

  // Sum macros for current items
  const totals = useMemo(() => sumMacros(items), [items]);

  // Handle file selection and create preview
  const onFilesSelected = useCallback(async (f: File | null) => {
    setError(null);
    setItems([]); // reset previous analysis
    setNotes("");
    setPreview(null);
    setFile(null);
    if (!f) return;
    // Basic client-side guardrails
    if (!f.type.startsWith("image/")) {
      setError("Please choose a valid image file.");
      return;
    }
    const dataUrl = await fileToDataUrl(f);
    setPreview(dataUrl);
    setFile(f);
  }, []);

  // Drag and drop handlers
  const onDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      const f = e.dataTransfer?.files?.[0];
      if (f) {
        onFilesSelected(f);
      }
    },
    [onFilesSelected]
  );

  const onAnalyze = useCallback(async () => {
    setError(null);
    if (!file) {
      setError("Please upload or capture a food photo first.");
      return;
    }

    setAnalyzing(true);
    try {
      const base64 = await fileToDataUrl(file);

      // Bind socket listeners once
      if (socket && !boundRef.current) {
        boundRef.current = true;

        // Server can stream intermediate tokens if desired
        socket.on("food_vision_progress", (payload: { message?: string }) => {
          // Could update a streaming UI; we keep it minimal to avoid noise
          // console.debug("Food vision progress:", payload?.message);
        });

        // Final result handler shape:
        // {
        //   items: FoodItem[] (with name, grams, macros, confidence, ingredients?)
        // }
        socket.on("food_vision_result", (payload: { items?: Partial<FoodItem>[]; error?: string }) => {
          if (payload?.error) {
            setError(payload.error);
            setAnalyzing(false);
            return;
          }
          const parsed: FoodItem[] =
            (payload?.items || []).map((it) => {
              const name = (it?.name || "Unknown item").toString();
              const grams = Number(it?.grams ?? 100);
              const macrosFromServer = it?.macros as Macros | undefined;

              let macros: Macros;
              if (macrosFromServer) {
                macros = {
                  calories: Math.max(0, Math.round(macrosFromServer.calories || 0)),
                  protein: Math.max(0, +Number(macrosFromServer.protein || 0).toFixed(1)),
                  carbs: Math.max(0, +Number(macrosFromServer.carbs || 0).toFixed(1)),
                  fat: Math.max(0, +Number(macrosFromServer.fat || 0).toFixed(1)),
                };
              } else {
                // If server didn't provide macros but did provide a recognizable name, try DB fallback per 100g
                const key = Object.keys(PER_100G_DB).find((k) => k.toLowerCase() === name.toLowerCase());
                if (key) {
                  macros = macrosForGrams(PER_100G_DB[key], grams);
                } else {
                  // As a last resort, 100g neutral placeholder
                  macros = { calories: 200, protein: 8, carbs: 20, fat: 8 };
                }
              }

              return {
                id: crypto.randomUUID(),
                name,
                grams,
                macros,
                confidence: typeof it?.confidence === "number" ? it?.confidence : undefined,
                ingredients: Array.isArray(it?.ingredients) ? (it?.ingredients as string[]) : undefined,
                notes,
                source: "vision",
              };
            }) ?? [];

          setItems(parsed);
          setAnalyzing(false);
        });
      }

      // Emit request for analysis to server over socket.io
      // Server should implement "request_food_vision_stream" and respond with "food_vision_result".
      emit("request_food_vision_stream", {
        image: base64,
        notes,
      });

      // Safety timeout: if no server response in 5s and filename hints exist, provide offline placeholder
      setTimeout(() => {
        if (analyzing && items.length === 0 && file?.name) {
          const guess = offlineGuessByFilename(file.name);
          if (guess.length > 0) {
            setItems(guess);
            setAnalyzing(false);
            setError(
              "No server response yet. Provided an offline estimate based on filename only. For accurate results, ensure the server implements 'request_food_vision_stream' -> 'food_vision_result'."
            );
          }
        }
      }, 5000);
    } catch (e) {
      setError("Failed to analyze the image. Please try again.");
      setAnalyzing(false);
    }
  }, [emit, file, items.length, notes, socket, analyzing]);

  // Manual addition handler
  const onAddManual = useCallback(() => {
    const name = manualName.trim();
    if (!name) {
      setError("Please provide a food name to add.");
      return;
    }
    const grams = Math.max(1, Math.round(Number(manualGrams) || 100));

    // If user provided macros explicitly, use them; otherwise try DB per 100g.
    let macros: Macros | null = null;
    const cals = manualCalories.trim();
    const prot = manualProtein.trim();
    const carb = manualCarbs.trim();
    const fat = manualFat.trim();

    if (cals || prot || carb || fat) {
      macros = {
        calories: Math.max(0, Math.round(Number(cals || 0))),
        protein: Math.max(0, +Number(prot || 0)),
        carbs: Math.max(0, +Number(carb || 0)),
        fat: Math.max(0, +Number(fat || 0)),
      };
    } else {
      // Try DB per 100g
      const keyExact = Object.keys(PER_100G_DB).find((k) => k.toLowerCase() === name.toLowerCase());
      const keyPartial =
        keyExact ||
        Object.keys(PER_100G_DB).find((k) => k.toLowerCase().includes(name.toLowerCase()));
      if (keyExact || keyPartial) {
        const ref = PER_100G_DB[keyExact || (keyPartial as string)];
        macros = macrosForGrams(ref, grams);
      } else {
        // Last resort neutral placeholder scaled to grams (approx: 2 kcal/g)
        const per100: Macros = { calories: 200, protein: 8, carbs: 20, fat: 8 };
        macros = macrosForGrams(per100, grams);
      }
    }

    setItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name,
        grams,
        macros,
        notes,
        source: "manual",
      },
    ]);
    setManualName("");
    setManualGrams(100);
    setManualCalories("");
    setManualProtein("");
    setManualCarbs("");
    setManualFat("");
    setError(null);
  }, [
    manualName,
    manualGrams,
    manualCalories,
    manualProtein,
    manualCarbs,
    manualFat,
    notes,
  ]);

  // Remove an item
  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  // Update grams on an item (recalculate macros using DB fallback if possible)
  const updateItemGrams = useCallback((id: string, grams: number) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const baseKey = Object.keys(PER_100G_DB).find(
          (k) => k.toLowerCase() === it.name.toLowerCase()
        );
        if (baseKey) {
          return { ...it, grams, macros: macrosForGrams(PER_100G_DB[baseKey], grams) };
        }
        // scale current macros proportionally
        const factor = grams / Math.max(1, it.grams);
        return {
          ...it,
          grams,
          macros: {
            calories: Math.round(it.macros.calories * factor),
            protein: +(it.macros.protein * factor).toFixed(1),
            carbs: +(it.macros.carbs * factor).toFixed(1),
            fat: +(it.macros.fat * factor).toFixed(1),
          },
        };
      })
    );
  }, []);

  // UI helpers
  const UploadCard = (
    <Card className="bg-white border border-gray-200 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Upload or Capture Your Meal</h2>
          <Badge variant="secondary" className="bg-gray-100 text-gray-700">
            {isConnected ? "Online" : "Offline"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div
          onDrop={onDrop}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center gap-3 text-center cursor-pointer hover:bg-gray-50 transition"
          onClick={() => document.getElementById("food-file-input")?.click()}
        >
          {preview ? (
            <img
              src={preview}
              alt="Food preview"
              className="w-full max-h-72 object-contain rounded-md"
            />
          ) : (
            <>
              <div className="text-sm text-gray-600">
                Drag and drop a photo here, or click to select
              </div>
              <div className="text-xs text-gray-400">
                Tip: On mobile, use camera capture for best results
              </div>
            </>
          )}
        </div>
        <input
          id="food-file-input"
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => onFilesSelected(e.target.files?.[0] || null)}
        />
        <div className="mt-4 flex gap-3">
          <Button
            variant="default"
            className="bg-black text-white hover:bg-gray-900"
            onClick={() => document.getElementById("food-file-input")?.click()}
          >
            {preview ? "Change Photo" : "Select Photo"}
          </Button>
          <Button
            variant="outline"
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
            onClick={onAnalyze}
            disabled={!file || analyzing}
          >
            {analyzing ? "Analyzing..." : "Analyze Photo"}
          </Button>
        </div>
        <div className="mt-4">
          <label className="text-sm text-gray-600">Optional notes (e.g., no sauce, extra cheese):</label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add context to improve detection"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
          />
        </div>
        {!isConnected && (
          <div className="mt-3 text-xs text-gray-500">
            You appear offline or not connected to the analysis service. You can still add items manually below or rely on a basic filename-based estimate after a short delay.
          </div>
        )}
        {error && (
          <div className="mt-3 text-sm text-red-600">
            {error}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2">
        <Badge className="bg-gray-900 text-white">Grayscale UI</Badge>
        <Badge variant="secondary" className="bg-gray-100 text-gray-700">
          Vision + Manual
        </Badge>
        <Badge variant="secondary" className="bg-gray-100 text-gray-700">
          Macros & Calories
        </Badge>
      </CardFooter>
    </Card>
  );

  const ItemsCard = (
    <Card className="bg-white border border-gray-200 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Detected Items</h2>
          <Badge variant="secondary" className="bg-gray-100 text-gray-700">{items.length} items</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-sm text-gray-500">
            No items yet. Analyze a photo or add items manually below.
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((it) => (
              <div
                key={it.id}
                className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 rounded-lg border border-gray-200 p-3"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="font-medium text-gray-900">{it.name}</div>
                    {it.source === "vision" && (
                      <Badge variant="secondary" className="bg-gray-100 text-gray-700">AI</Badge>
                    )}
                    {typeof it.confidence === "number" && (
                      <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                        {(it.confidence * 100).toFixed(0)}% confidence
                      </Badge>
                    )}
                  </div>
                  {it.ingredients && it.ingredients.length > 0 && (
                    <div className="mt-1 text-xs text-gray-500">
                      Ingredients: {it.ingredients.join(", ")}
                    </div>
                  )}
                  {it.notes && (
                    <div className="mt-1 text-xs text-gray-500">Notes: {it.notes}</div>
                  )}
                  <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="rounded bg-gray-50 px-2 py-1 text-gray-700">
                      <span className="text-gray-500">Portion:</span> {it.grams} g
                    </div>
                    <div className="rounded bg-gray-50 px-2 py-1 text-gray-700">
                      <span className="text-gray-500">Calories:</span> {it.macros.calories} kcal
                    </div>
                    <div className="rounded bg-gray-50 px-2 py-1 text-gray-700">
                      <span className="text-gray-500">Protein:</span> {it.macros.protein} g
                    </div>
                    <div className="rounded bg-gray-50 px-2 py-1 text-gray-700">
                      <span className="text-gray-500">Carbs:</span> {it.macros.carbs} g
                    </div>
                    <div className="rounded bg-gray-50 px-2 py-1 text-gray-700">
                      <span className="text-gray-500">Fat:</span> {it.macros.fat} g
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    className="w-24 rounded-md border border-gray-300 px-2 py-1 text-sm text-gray-900"
                    value={it.grams}
                    onChange={(e) => updateItemGrams(it.id, Math.max(1, Math.round(Number(e.target.value) || 1)))}
                    placeholder="grams"
                    aria-label="grams"
                  />
                  <Button
                    variant="outline"
                    className="border-gray-300 text-gray-700 hover:bg-gray-50"
                    onClick={() => removeItem(it.id)}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const SummaryCard = (
    <Card className="bg-white border border-gray-200 shadow-sm">
      <CardHeader>
        <h2 className="text-lg font-semibold text-gray-900">Summary</h2>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-sm text-gray-500">Nothing to summarize yet.</div>
        ) : (
          <div className="space-y-4">
            <div className="text-3xl font-semibold text-gray-900">
              {totals.calories} kcal
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <MacroBar label="Protein" value={totals.protein} max={Math.max(50, totals.protein * 1.5)} />
              <MacroBar label="Carbs" value={totals.carbs} max={Math.max(100, totals.carbs * 1.5)} />
              <MacroBar label="Fat" value={totals.fat} max={Math.max(40, totals.fat * 1.5)} />
            </div>
            <div className="text-xs text-gray-500">
              Targets are autoscaled based on current totals for visualization only.
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2">
        {items.length > 0 && (
          <>
            <Badge className="bg-black text-white">Total: {totals.calories} kcal</Badge>
            <Badge variant="secondary" className="bg-gray-100 text-gray-700">
              P {totals.protein.toFixed(1)} g
            </Badge>
            <Badge variant="secondary" className="bg-gray-100 text-gray-700">
              C {totals.carbs.toFixed(1)} g
            </Badge>
            <Badge variant="secondary" className="bg-gray-100 text-gray-700">
              F {totals.fat.toFixed(1)} g
            </Badge>
          </>
        )}
      </CardFooter>
    </Card>
  );

  const ManualAddCard = (
    <Card className="bg-white border border-gray-200 shadow-sm">
      <CardHeader>
        <h2 className="text-lg font-semibold text-gray-900">Add Item Manually</h2>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-4">
            <label className="text-xs text-gray-500">Food name</label>
            <input
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              placeholder="e.g., chicken breast"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-gray-500">Grams</label>
            <input
              type="number"
              min={1}
              value={manualGrams}
              onChange={(e) => setManualGrams(Math.max(1, Math.round(Number(e.target.value) || 1)))}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="md:col-span-6">
            <label className="text-xs text-gray-500">Optional: exact macros for portion</label>
            <div className="mt-1 grid grid-cols-4 gap-2">
              <input
                type="number"
                value={manualCalories}
                onChange={(e) => setManualCalories(e.target.value)}
                placeholder="kcal"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              <input
                type="number"
                value={manualProtein}
                onChange={(e) => setManualProtein(e.target.value)}
                placeholder="Protein g"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              <input
                type="number"
                value={manualCarbs}
                onChange={(e) => setManualCarbs(e.target.value)}
                placeholder="Carbs g"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              <input
                type="number"
                value={manualFat}
                onChange={(e) => setManualFat(e.target.value)}
                placeholder="Fat g"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="mt-1 text-xs text-gray-500">
              Leave macros blank to auto-estimate using our nutrition DB.
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button
          variant="default"
          className="bg-black text-white hover:bg-gray-900"
          onClick={onAddManual}
        >
          Add Item
        </Button>
      </CardFooter>
    </Card>
  );

  // Page layout
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-black" />
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Calorie Vision</h1>
              <div className="text-xs text-gray-500">Personalized photo-based calorie & macro tracker</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-gray-100 text-gray-700">
              {isConnected ? "Connected" : "Not connected"}
            </Badge>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-6xl px-4 py-6 space-y-6">
        {UploadCard}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {ItemsCard}
            {ManualAddCard}
          </div>
          <div className="lg:col-span-1">
            {SummaryCard}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-gray-500">
        Built with grayscale elegance. Tip: Lighting and angle improve detection accuracy.
      </footer>
    </div>
  );
}

/*
Notes for integrators and backend:
- This page uses the existing AppProvider context via useAppContext.
- On analyze, it emits "request_food_vision_stream" with { image: base64DataUrl, notes }.
- Please implement a socket.io server that listens to "request_food_vision_stream" and emits:
    1) Optional progress events: socket.emit("food_vision_progress", { message })
    2) Final result: socket.emit("food_vision_result", { items: FoodItem[] })
  Where each FoodItem has: { name, grams, macros: {calories, protein, carbs, fat}, confidence?, ingredients? }
- If the server is unavailable, the app remains fully functional with manual item entry and a basic filename-based fallback estimate.

UI components used:
- Shadcn Card, Button, Badge
- TailwindCSS for layout and a grayscale visual design

This file is ready to be placed under pages/ and added to routes.tsx as a route component.
*/