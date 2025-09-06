import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Circle, Loader2 } from "lucide-react";

export type ValidationStatus = "valid" | "invalid" | "neutral" | "checking";

interface ValidationBadgeProps {
  label: string;
  status: ValidationStatus;
  invalidMessage?: string;
}

const ValidationBadge = ({ label, status, invalidMessage }: ValidationBadgeProps) => {
  const getIcon = () => {
    switch (status) {
      case "valid":
        return <CheckCircle className="h-3 w-3" />;
      case "invalid":
        return <XCircle className="h-3 w-3" />;
      case "checking":
        return <Loader2 className="h-3 w-3 animate-spin" />;
      case "neutral":
      default:
        return <Circle className="h-3 w-3" />;
    }
  };

  const getVariant = () => {
    switch (status) {
      case "valid":
        return "default" as const;
      case "invalid":
        return "destructive" as const;
      case "checking":
        return "secondary" as const;
      case "neutral":
      default:
        return "outline" as const;
    }
  };

  const getDisplayText = () => {
    if (status === "invalid" && invalidMessage) {
      return invalidMessage;
    }
    return label;
  };

  return (
    <Badge variant={getVariant()} className="gap-1">
      {getIcon()}
      {getDisplayText()}
    </Badge>
  );
};

interface ValidationBadgesProps {
  validUrl: ValidationStatus;
  githubUrl: ValidationStatus;
  publicRepo: ValidationStatus;
}

export const ValidationBadges = ({ validUrl, githubUrl, publicRepo }: ValidationBadgesProps) => {
  const hasActivity = validUrl !== "neutral" || githubUrl !== "neutral" || publicRepo !== "neutral";

  if (!hasActivity) {
    return null;
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">Validation Status</p>
      <div className="flex flex-wrap gap-2">
        <ValidationBadge label="Valid URL" status={validUrl} />
        <ValidationBadge label="GitHub URL" status={githubUrl} />
        <ValidationBadge 
          label="Public Repo" 
          status={publicRepo} 
          invalidMessage="Private repos not supported" 
        />
      </div>
    </div>
  );
};