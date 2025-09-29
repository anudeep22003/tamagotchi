import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useMessageStore } from "@/store/useMessageStore";
import { NewAnalysisDialog } from "@/components/NewAnalysisDialog";
import { useAppContext } from "@/context/AppContext";
import { useState } from "react";

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string;
  onNewAnalysis?: () => void;
}

export const AppHeader = ({ title, subtitle, badge, onNewAnalysis }: AppHeaderProps) => {
  const [showDialog, setShowDialog] = useState(false);
  const { setInputText } = useAppContext();
  const streamingActors = useMessageStore((state) => state.streamingActors);
  const githubMetadata = useMessageStore((state) => state.githubMetadata);
  const clearAllState = useMessageStore((state) => state.clearAllState);
  
  const hasActiveStreams = streamingActors.size > 0;
  const showButton = githubMetadata || hasActiveStreams;

  const handleNewAnalysisClick = () => {
    if (hasActiveStreams) {
      setShowDialog(true);
    } else {
      handleNewAnalysis();
    }
  };

  const handleAbortAnalysis = () => {
    handleNewAnalysis();
    setShowDialog(false);
  };

  const handleContinueAnalysis = () => {
    setShowDialog(false);
  };

  const handleNewAnalysis = () => {
    clearAllState();
    setInputText("");
    onNewAnalysis?.();
  };

  return (
    <>
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-6">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
              {badge && (
                <Badge variant="secondary" className="text-xs">
                  {badge}
                </Badge>
              )}
            </div>
            {subtitle && (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
          
          {showButton && (
            <Button
              onClick={handleNewAnalysisClick}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Start New Analysis
            </Button>
          )}
        </div>
      </header>

      <NewAnalysisDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        onAbort={handleAbortAnalysis}
        onContinue={handleContinueAnalysis}
      />
    </>
  );
};