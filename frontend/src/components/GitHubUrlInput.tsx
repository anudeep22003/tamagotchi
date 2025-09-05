import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  type ValidationState,
  validateUrl,
  checkRepoVisibility,
  getValidationStatus,
} from "@/lib/githubValidation";

interface GitHubUrlInputProps {
  onSubmit: (url: string) => void;
  disabled?: boolean;
}

export const GitHubUrlInput = ({ onSubmit, disabled = false }: GitHubUrlInputProps) => {
  const [url, setUrl] = useState("");
  const [validationState, setValidationState] = useState<ValidationState>({
    isValidUrl: null,
    isGithubUrl: null,
    isPublicRepo: null,
  });
  const [isCheckingRepo, setIsCheckingRepo] = useState(false);

  // Debounced validation effect
  useEffect(() => {
    if (!url.trim()) {
      setValidationState({
        isValidUrl: null,
        isGithubUrl: null,
        isPublicRepo: null,
      });
      setIsCheckingRepo(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      const { isValidUrl, isGithubUrl } = validateUrl(url);
      
      // Update URL validations immediately
      setValidationState(prev => ({
        ...prev,
        isValidUrl,
        isGithubUrl,
        isPublicRepo: isGithubUrl ? prev.isPublicRepo : null, // Reset if not GitHub URL
      }));

      // If it's a valid GitHub URL, check if it's public
      if (isValidUrl && isGithubUrl) {
        setIsCheckingRepo(true);
        try {
          const isPublic = await checkRepoVisibility(url);
          setValidationState(prev => ({
            ...prev,
            isPublicRepo: isPublic,
          }));
        } catch {
          setValidationState(prev => ({
            ...prev,
            isPublicRepo: false,
          }));
        } finally {
          setIsCheckingRepo(false);
        }
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [url]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setUrl(newUrl);
    
    // Reset validation state when URL changes
    if (newUrl !== url) {
      setValidationState({
        isValidUrl: null,
        isGithubUrl: null,
        isPublicRepo: null,
      });
      setIsCheckingRepo(false);
    }
  }, [url]);

  const validationStatus = getValidationStatus(validationState, isCheckingRepo);
  const isSubmitEnabled = validationState.isValidUrl === true && 
                         validationState.isGithubUrl === true && 
                         validationState.isPublicRepo === true;

  const handleSubmit = useCallback(() => {
    if (isSubmitEnabled && !disabled) {
      onSubmit(url);
    }
  }, [url, onSubmit, disabled, isSubmitEnabled]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && isSubmitEnabled && !disabled) {
      handleSubmit();
    }
  }, [handleSubmit, isSubmitEnabled, disabled]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="github-url" className="text-sm font-medium">
          GitHub Repository URL
        </label>
        <input
          id="github-url"
          type="url"
          value={url}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="https://github.com/username/repository"
          className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>
      
      <ValidationStatusBadges 
        validUrl={validationStatus.validUrl}
        githubUrl={validationStatus.githubUrl}
        publicRepo={validationStatus.publicRepo}
      />
      
      <Button
        onClick={handleSubmit}
        disabled={!isSubmitEnabled || disabled}
        className="w-full"
        size="lg"
      >
        Analyze Repository
      </Button>
    </div>
  );
};

interface ValidationStatusBadgesProps {
  validUrl: 'valid' | 'invalid' | 'neutral' | 'checking';
  githubUrl: 'valid' | 'invalid' | 'neutral' | 'checking';
  publicRepo: 'valid' | 'invalid' | 'neutral' | 'checking';
}

const ValidationStatusBadges = ({ validUrl, githubUrl, publicRepo }: ValidationStatusBadgesProps) => {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Validation Status:</p>
      <div className="flex flex-wrap gap-2">
        <ValidationBadge 
          label="Valid URL" 
          status={validUrl} 
        />
        <ValidationBadge 
          label="GitHub URL" 
          status={githubUrl} 
        />
        <ValidationBadge 
          label="Public Repo" 
          status={publicRepo}
          invalidMessage="Private repos not supported"
        />
      </div>
    </div>
  );
};

interface ValidationBadgeProps {
  label: string;
  status: 'valid' | 'invalid' | 'neutral' | 'checking';
  invalidMessage?: string;
}

const ValidationBadge = ({ label, status, invalidMessage }: ValidationBadgeProps) => {
  const getIcon = () => {
    switch (status) {
      case 'valid':
        return '✓';
      case 'invalid':
        return '✗';
      case 'checking':
        return '...';
      case 'neutral':
      default:
        return '○';
    }
  };

  const getDisplayText = () => {
    if (status === 'invalid' && invalidMessage) {
      return invalidMessage;
    }
    return label;
  };

  return (
    <span 
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border transition-colors ${
        status === 'valid' 
          ? 'bg-green-500/10 text-green-700 border-green-200 dark:bg-green-500/20 dark:text-green-300 dark:border-green-800' 
          : status === 'invalid'
          ? 'bg-red-500/10 text-red-700 border-red-200 dark:bg-red-500/20 dark:text-red-300 dark:border-red-800'
          : status === 'checking'
          ? 'bg-blue-500/10 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-800'
          : 'bg-gray-500/10 text-gray-600 border-gray-200 dark:bg-gray-500/20 dark:text-gray-400 dark:border-gray-700'
      }`}
    >
      <span className="text-xs">{getIcon()}</span>
      {getDisplayText()}
    </span>
  );
};