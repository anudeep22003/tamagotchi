import { Button } from "@/components/ui/button";
import { useMessageStore } from "@/store/useMessageStore";
import { FileText, BarChart3 } from "lucide-react";

interface MobileViewSwitcherProps {
  currentView: "input" | "analysis";
  onViewChange: (view: "input" | "analysis") => void;
  showAnalysis: boolean;
}

export const MobileViewSwitcher = ({ 
  currentView, 
  onViewChange, 
  showAnalysis 
}: MobileViewSwitcherProps) => {
  const githubMetadata = useMessageStore((state) => state.githubMetadata);
  const streamingActors = useMessageStore((state) => state.streamingActors);
  
  // Show switcher only when we have analysis content or are analyzing
  if (!showAnalysis) {
    return null;
  }
  

  const hasActiveStreaming = streamingActors.size > 0;

  return (
    <div className="md:hidden bg-background border-b">
      <div className="flex items-center">
        <Button
          variant={currentView === "input" ? "default" : "ghost"}
          size="sm"
          onClick={() => onViewChange("input")}
          className="flex-1 h-12 rounded-none gap-2"
        >
          <FileText className="h-4 w-4" />
          <span className="text-sm">
            {githubMetadata ? "Repository" : "Input"}
          </span>
        </Button>
        
        <Button
          variant={currentView === "analysis" ? "default" : "ghost"}
          size="sm"
          onClick={() => onViewChange("analysis")}
          className="flex-1 h-12 rounded-none gap-2 relative"
        >
          <BarChart3 className="h-4 w-4" />
          <span className="text-sm">Analysis</span>
          {hasActiveStreaming && (
            <div className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          )}
        </Button>
      </div>
    </div>
  );
};