import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import type { AnalysisError } from "@/store/useMessageStore";

interface AnalysisErrorDialogProps {
  error: AnalysisError | null;
  onStartNewAnalysis: () => void;
  onClose: () => void;
}

// Simple mobile error dialog
const MobileErrorDialog = ({ error, onStartNewAnalysis, onClose }: AnalysisErrorDialogProps) => {
  if (!error) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleNewAnalysis = () => {
    onStartNewAnalysis();
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={handleBackdropClick}
    >
      <div className="bg-background rounded-lg border shadow-lg w-full max-w-sm p-6 space-y-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <h2 className="text-lg font-semibold">{error.message}</h2>
          </div>
          {error.details && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {error.details}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Button
            onClick={handleNewAnalysis}
            className="w-full gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Start New Analysis
          </Button>
          <Button
            onClick={onClose}
            variant="outline"
            className="w-full"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export const AnalysisErrorDialog = ({
  error,
  onStartNewAnalysis,
  onClose,
}: AnalysisErrorDialogProps) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  if (isMobile) {
    return (
      <MobileErrorDialog 
        error={error}
        onStartNewAnalysis={onStartNewAnalysis}
        onClose={onClose}
      />
    );
  }

  return (
    <AlertDialog open={!!error} onOpenChange={() => onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            {error?.message || "Analysis Error"}
          </AlertDialogTitle>
          {error?.details && (
            <AlertDialogDescription>
              {error.details}
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            onClick={() => {
              onStartNewAnalysis();
              onClose();
            }}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Start New Analysis
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};