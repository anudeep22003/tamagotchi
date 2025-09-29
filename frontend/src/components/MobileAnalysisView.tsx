import { Button } from "@/components/ui/button";
import { RefreshCw, ArrowLeft } from "lucide-react";
import { GenerativeArea } from "@/components/GenerativeArea";
import { useMessageStore } from "@/store/useMessageStore";

interface MobileAnalysisViewProps {
  onNewAnalysis: () => void;
  onBackToRepository?: () => void;
}

export const MobileAnalysisView = ({ onNewAnalysis, onBackToRepository }: MobileAnalysisViewProps) => {
  const githubMetadata = useMessageStore((state) => state.githubMetadata);
  
  return (
    <div className="h-full flex flex-col relative">
      {/* GenerativeArea content */}
      <div className="flex-1 overflow-hidden">
        <GenerativeArea />
      </div>
      
      {/* Floating action buttons - always visible as fallback */}
      <div className="md:hidden absolute bottom-4 right-4 flex flex-col gap-2">
        {githubMetadata && onBackToRepository && (
          <Button
            onClick={onBackToRepository}
            size="sm"
            variant="outline"
            className="shadow-lg gap-1"
          >
            <ArrowLeft className="h-3 w-3" />
            Repository
          </Button>
        )}
        <Button
          onClick={onNewAnalysis}
          size="sm"
          className="shadow-lg gap-1"
        >
          <RefreshCw className="h-3 w-3" />
          New Analysis
        </Button>
      </div>
    </div>
  );
};