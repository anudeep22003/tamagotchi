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

interface NewAnalysisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAbort: () => void;
  onContinue: () => void;
}

export const NewAnalysisDialog = ({
  open,
  onOpenChange,
  onAbort,
  onContinue,
}: NewAnalysisDialogProps) => {
  return (
    <div className="w-full">
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
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full sm:w-auto"
            >
              Abort Current Analysis
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={onContinue}
              className="w-full sm:w-auto"
            >
              Continue Current Analysis
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
