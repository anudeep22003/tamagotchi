import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  Download,
  Check,
  Copy,
  Loader2,
  Plus,
  Maximize2,
  Minimize2,
} from "lucide-react";

/**
 * A single, stand-alone page that showcases the installed shadcn/ui components
 * available in this project (button and badge).
 *
 * Notes:
 * - Keep visuals in grayscale (neutrals), using black and white for strong contrast.
 * - No additional components are required. This page should run as-is.
 * - You can add it to routes.ts and navigate to it directly.
 * - Includes helpful comments and a live playground for Buttons.
 */

type ButtonVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "ghost"
  | "link";
type ButtonSize = "default" | "sm" | "lg" | "icon";

export default function ShadcnUiShowcase() {
  // State for the playground button
  const [variant, setVariant] = useState<ButtonVariant>("default");
  const [size, setSize] = useState<ButtonSize>("default");
  const [disabled, setDisabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [leadingIcon, setLeadingIcon] = useState(true);
  const [trailingIcon, setTrailingIcon] = useState(false);

  // Responsive density toggle for the whole page (compact spacing)
  const [compact, setCompact] = useState(false);

  // Helpers for copy-to-clipboard UX
  const [copied, setCopied] = useState(false);

  // Generate an example code snippet users can copy
  const codeSnippet = useMemo(() => {
    const attrs: string[] = [];
    if (variant !== "default") attrs.push(`variant="${variant}"`);
    if (size !== "default") attrs.push(`size="${size}"`);
    if (disabled) attrs.push("disabled");
    const leading = leadingIcon
      ? '<Download className="mr-2 h-4 w-4" /> '
      : "";
    const trailing = trailingIcon
      ? ' <ArrowRight className="ml-2 h-4 w-4" />'
      : "";
    const label = loading
      ? '<Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading'
      : "Primary action";
    return `import { Button } from "@/components/ui/button";
import { Download, ArrowRight, Loader2 } from "lucide-react";

export function Example() {
  return (
    <Button ${attrs.join(" ")}>
      ${leading}${label}${trailing}
    </Button>
  );
}`;
  }, [variant, size, disabled, loading, leadingIcon, trailingIcon]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeSnippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // no-op
    }
  };

  // Inline section header for consistency
  const SectionHeader = ({
    title,
    subtitle,
  }: {
    title: string;
    subtitle?: string;
  }) => (
    <div className="mb-6">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-semibold tracking-tight text-neutral-900">
          {title}
        </h2>
        {/* small grayscale status badge */}
        {subtitle ? (
          <Badge variant="secondary" className="text-neutral-700">
            {subtitle}
          </Badge>
        ) : null}
      </div>
    </div>
  );

  return (
    <main
      className={[
        "min-h-dvh w-full bg-neutral-50 text-neutral-900",
        "transition-[padding] duration-200",
        compact ? "py-8" : "py-14",
      ].join(" ")}
    >
      {/* Page container */}
      <div
        className={[
          "mx-auto",
          compact ? "max-w-5xl px-4" : "max-w-6xl px-6",
        ].join(" ")}
      >
        {/* Header / Hero */}
        <header
          className={[
            "mb-10 rounded-2xl border border-neutral-200",
            "bg-white p-6 shadow-sm",
          ].join(" ")}
        >
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-black">
                  shadcn/ui Showcase
                </h1>
                <Badge variant="outline" className="text-neutral-600">
                  Grayscale
                </Badge>
              </div>
              <p className="max-w-2xl text-sm leading-relaxed text-neutral-600">
                A minimal, elegant demonstration of the installed
                shadcn/ui components in this project. Explore Buttons
                and Badges, try the live playground, and copy snippets.
                Pure black-and-white aesthetic with neutral grays for
                balance.
              </p>
            </div>

            {/* Header actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="border-neutral-300 text-neutral-800 hover:bg-neutral-100"
                onClick={() => setCompact((c) => !c)}
                aria-pressed={compact}
              >
                {compact ? (
                  <>
                    <Minimize2 className="mr-2 h-4 w-4" />
                    Normal spacing
                  </>
                ) : (
                  <>
                    <Maximize2 className="mr-2 h-4 w-4" />
                    Compact spacing
                  </>
                )}
              </Button>
              <Button
                size="sm"
                className="bg-black text-white hover:bg-neutral-800"
                onClick={() =>
                  window.scrollTo({
                    top: document.body.scrollHeight,
                    behavior: "smooth",
                  })
                }
              >
                Explore
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* Live Playground */}
        <section
          className={[
            "mb-10 rounded-2xl border border-neutral-200 bg-white shadow-sm",
            compact ? "p-4" : "p-6",
          ].join(" ")}
        >
          <SectionHeader
            title="Button Playground"
            subtitle="Craft a button and copy the code"
          />

          <div className="grid gap-6 md:grid-cols-[1.1fr,1fr]">
            {/* Controls */}
            <div
              className={[
                "rounded-xl border border-neutral-200 bg-neutral-50/40",
                compact ? "p-4" : "p-5",
              ].join(" ")}
            >
              <div className="grid gap-4">
                {/* Variant */}
                <div>
                  <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-neutral-600">
                    Variant
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        "default",
                        "secondary",
                        "destructive",
                        "outline",
                        "ghost",
                        "link",
                      ] as ButtonVariant[]
                    ).map((v) => (
                      <Button
                        key={v}
                        variant={variant === v ? "default" : "outline"}
                        className={
                          variant === v
                            ? "bg-black text-white hover:bg-neutral-900"
                            : "border-neutral-300 text-neutral-800 hover:bg-neutral-100"
                        }
                        onClick={() => setVariant(v)}
                        size="sm"
                        aria-pressed={variant === v}
                      >
                        {v}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Size */}
                <div>
                  <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-neutral-600">
                    Size
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    {(
                      ["default", "sm", "lg", "icon"] as ButtonSize[]
                    ).map((s) => (
                      <Button
                        key={s}
                        variant={size === s ? "default" : "outline"}
                        className={
                          size === s
                            ? "bg-black text-white hover:bg-neutral-900"
                            : "border-neutral-300 text-neutral-800 hover:bg-neutral-100"
                        }
                        onClick={() => setSize(s)}
                        size="sm"
                        aria-pressed={size === s}
                      >
                        {s}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Toggles */}
                <div className="flex flex-wrap gap-2">
                  <ToggleChip
                    pressed={disabled}
                    onPressedChange={setDisabled}
                    label="Disabled"
                  />
                  <ToggleChip
                    pressed={loading}
                    onPressedChange={setLoading}
                    label="Loading"
                  />
                  <ToggleChip
                    pressed={leadingIcon}
                    onPressedChange={setLeadingIcon}
                    label="Leading icon"
                  />
                  <ToggleChip
                    pressed={trailingIcon}
                    onPressedChange={setTrailingIcon}
                    label="Trailing icon"
                  />
                </div>

                {/* Preview */}
                <div
                  className={[
                    "rounded-lg border border-dashed border-neutral-300 bg-white",
                    compact ? "p-4" : "p-6",
                  ].join(" ")}
                >
                  <p className="mb-3 text-xs font-medium uppercase tracking-wider text-neutral-600">
                    Live preview
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      variant={variant}
                      size={size}
                      disabled={disabled || loading}
                      className={
                        variant === "default"
                          ? "bg-black text-white hover:bg-neutral-900"
                          : undefined
                      }
                      onClick={() => {
                        if (loading) return;
                        setLoading(true);
                        setTimeout(() => setLoading(false), 1200);
                      }}
                    >
                      {leadingIcon && !loading && size !== "icon" && (
                        <Download className="mr-2 h-4 w-4" />
                      )}
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Loading
                        </>
                      ) : size === "icon" ? (
                        <Plus className="h-4 w-4" />
                      ) : (
                        "Primary action"
                      )}
                      {trailingIcon && size !== "icon" && !loading && (
                        <ArrowRight className="ml-2 h-4 w-4" />
                      )}
                    </Button>

                    {/* A quiet secondary action to show button pairs */}
                    <Button
                      variant="outline"
                      className="border-neutral-300 text-neutral-800 hover:bg-neutral-100"
                    >
                      Secondary
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Code */}
            <div
              className={[
                "flex h-full flex-col rounded-xl border border-neutral-200 bg-neutral-900",
                compact ? "p-4" : "p-5",
              ].join(" ")}
            >
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wider text-neutral-300">
                  Code
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopy}
                  className="border-neutral-700 bg-neutral-900 text-neutral-200 hover:bg-neutral-800"
                >
                  {copied ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <pre
                className={[
                  "relative h-full w-full overflow-auto rounded-lg border border-neutral-800 bg-neutral-950 p-4",
                  "text-xs leading-relaxed text-neutral-200",
                ].join(" ")}
                aria-label="Code snippet"
              >
                {codeSnippet}
              </pre>
            </div>
          </div>
        </section>

        {/* Buttons Catalog */}
        <section
          className={[
            "mb-10 rounded-2xl border border-neutral-200 bg-white shadow-sm",
            compact ? "p-4" : "p-6",
          ].join(" ")}
        >
          <SectionHeader
            title="Buttons"
            subtitle="Variants and sizes"
          />

          {/* Variants */}
          <div className="mb-6">
            <div className="mb-3 text-xs font-medium uppercase tracking-wider text-neutral-600">
              Variants
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button className="bg-black text-white hover:bg-neutral-900">
                Default
              </Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="destructive">Destructive</Button>
              <Button
                variant="outline"
                className="border-neutral-300 text-neutral-800 hover:bg-neutral-100"
              >
                Outline
              </Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="link">Link</Button>
            </div>
          </div>

          {/* Sizes */}
          <div className="mb-6">
            <div className="mb-3 text-xs font-medium uppercase tracking-wider text-neutral-600">
              Sizes
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                size="sm"
                variant="outline"
                className="border-neutral-300 text-neutral-800 hover:bg-neutral-100"
              >
                Small
              </Button>
              <Button>Default</Button>
              <Button
                size="lg"
                className="bg-black text-white hover:bg-neutral-900"
              >
                Large
              </Button>
              <Button
                size="icon"
                variant="secondary"
                aria-label="Icon button"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* With icons */}
          <div>
            <div className="mb-3 text-xs font-medium uppercase tracking-wider text-neutral-600">
              With icons
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button className="bg-black text-white hover:bg-neutral-900">
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
              <Button
                variant="outline"
                className="border-neutral-300 text-neutral-800 hover:bg-neutral-100"
              >
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button variant="ghost">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading
              </Button>
            </div>
          </div>
        </section>

        {/* Badges Catalog */}
        <section
          className={[
            "mb-10 rounded-2xl border border-neutral-200 bg-white shadow-sm",
            compact ? "p-4" : "p-6",
          ].join(" ")}
        >
          <SectionHeader
            title="Badges"
            subtitle="Subtle status indicators"
          />
          <div className="flex flex-wrap items-center gap-3">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="destructive">Destructive</Badge>
            <Badge variant="outline">Outline</Badge>
          </div>

          {/* Example usage block */}
          <div
            className={[
              "mt-6 rounded-xl border border-neutral-200 bg-neutral-50/40",
              compact ? "p-4" : "p-5",
            ].join(" ")}
          >
            <div className="mb-3 text-xs font-medium uppercase tracking-wider text-neutral-600">
              Example
            </div>
            <div className="flex flex-col justify-between gap-3 rounded-lg border border-neutral-200 bg-white p-4 md:flex-row md:items-center">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-neutral-900">
                    Minimalist Dashboard
                  </h3>
                  <Badge variant="secondary">Beta</Badge>
                </div>
                <p className="text-sm text-neutral-600">
                  Clean, quiet tags make status scannable at a glance.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  className="border-neutral-300 text-neutral-800 hover:bg-neutral-100"
                >
                  Learn more
                </Button>
                <Button className="bg-black text-white hover:bg-neutral-900">
                  Get started
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="pb-6 pt-2 text-center text-xs text-neutral-500">
          Built with shadcn/ui components (Button, Badge). Grayscale by
          design.
        </footer>
      </div>
    </main>
  );
}

/**
 * A tiny helper to render a toggle "chip" using a Button with outline styling.
 * This avoids needing any extra component beyond Button/Badge and HTML.
 */
function ToggleChip({
  pressed,
  onPressedChange,
  label,
}: {
  pressed: boolean;
  onPressedChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <Button
      type="button"
      variant={pressed ? "default" : "outline"}
      size="sm"
      aria-pressed={pressed}
      onClick={() => onPressedChange(!pressed)}
      className={
        pressed
          ? "bg-black text-white hover:bg-neutral-900"
          : "border-neutral-300 text-neutral-800 hover:bg-neutral-100"
      }
    >
      {pressed ? <Check className="mr-2 h-4 w-4" /> : null}
      {label}
    </Button>
  );
}
