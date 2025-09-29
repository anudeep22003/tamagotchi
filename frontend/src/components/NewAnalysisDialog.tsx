import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

interface NewAnalysisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAbort: () => void;
  onContinue: () => void;
}

// Simple mobile alert dialog
const MobileAlertDialog = ({ open, onAbort, onContinue, onOpenChange }: NewAnalysisDialogProps) => {
  if (!open) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onOpenChange(false);
    }
  };

  const handleContinue = () => {
    onContinue();
    onOpenChange(false);
  };

  const handleAbort = () => {
    onAbort();
    onOpenChange(false);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={handleBackdropClick}
    >
      <div className="bg-background rounded-lg border shadow-lg w-full max-w-sm p-6 space-y-4">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Analysis in Progress</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Current analysis is still running. On average the analysis takes 5 minutes for claude code sdk agent to look through everything and complete its analysis. If you still want to end this and start a new one, choose below.
          </p>
        </div>
        <div className="space-y-2">
          <Button
            onClick={handleContinue}
            className="w-full"
          >
            Continue Current Analysis
          </Button>
          <Button
            onClick={handleAbort}
            variant="destructive"
            className="w-full"
          >
            Abort Current Analysis
          </Button>
        </div>
      </div>
    </div>
  );
};

export const NewAnalysisDialog = ({
  open,
  onOpenChange,
  onAbort,
  onContinue,
}: NewAnalysisDialogProps) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768); // 768px is the 'md' breakpoint
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  if (isMobile) {
    return (
      <MobileAlertDialog 
        open={open}
        onOpenChange={onOpenChange}
        onAbort={onAbort}
        onContinue={onContinue}
      />
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Analysis in Progress</AlertDialogTitle>
          <AlertDialogDescription>
            Current analysis is still running. On average the analysis
            takes 5 minutes for claude code sdk agent to look through
            everything and complete its analysis. If you still want to
            end this and start a new one, choose below.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={onAbort}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Abort Current Analysis
          </AlertDialogCancel>
          <AlertDialogAction onClick={onContinue}>
            Continue Current Analysis
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
