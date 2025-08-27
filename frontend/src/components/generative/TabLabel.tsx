import { Loader2 } from "lucide-react";
import type { Actor } from "@/types/envelopeType";

interface TabLabelProps {
  actor: Actor;
  isStreaming: boolean;
}

export const TabLabel = ({ actor, isStreaming }: TabLabelProps) => {
  const labels: Record<Actor, string> = {
    assistant: "Assistant",
    coder: "Code",
    writer: "Writer",
    claude: "Claude",
  };

  return (
    <div className="flex items-center gap-2">
      {labels[actor]}
      {isStreaming && (
        <Loader2 className="h-3 w-3 animate-spin" />
      )}
    </div>
  );
};