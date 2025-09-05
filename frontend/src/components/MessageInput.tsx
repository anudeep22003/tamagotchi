import { useAppContext } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { useRef, useEffect, useState, useCallback } from "react";
import {
  type ValidationState,
  validateUrl,
  checkRepoVisibility,
  getValidationStatus,
} from "@/lib/githubValidation";

export const MessageInput = () => {
  const { inputText, setInputText, handleGitHubTeardownSendClick } = useAppContext();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [validationState, setValidationState] = useState<ValidationState>({
    isValidUrl: null,
    isGithubUrl: null,
    isPublicRepo: null,
  });
  const [isCheckingRepo, setIsCheckingRepo] = useState(false);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newUrl = e.target.value;
    setInputText(newUrl);
    
    // Reset validation state when URL changes
    if (newUrl !== inputText) {
      setValidationState({
        isValidUrl: null,
        isGithubUrl: null,
        isPublicRepo: null,
      });
      setIsCheckingRepo(false);
    }
  }, [inputText, setInputText]);

  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [inputText]);

  // Debounced validation effect
  useEffect(() => {
    if (!inputText.trim()) {
      setValidationState({
        isValidUrl: null,
        isGithubUrl: null,
        isPublicRepo: null,
      });
      setIsCheckingRepo(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      const { isValidUrl, isGithubUrl } = validateUrl(inputText);
      
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
          const isPublic = await checkRepoVisibility(inputText);
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
  }, [inputText]);

  const validationStatus = getValidationStatus(validationState, isCheckingRepo);
  const isSubmitEnabled = validationState.isValidUrl === true && 
                         validationState.isGithubUrl === true && 
                         validationState.isPublicRepo === true;

  const handleSubmit = useCallback(() => {
    if (isSubmitEnabled) {
      handleGitHubTeardownSendClick();
    }
  }, [isSubmitEnabled, handleGitHubTeardownSendClick]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && isSubmitEnabled) {
      handleSubmit();
    }
  }, [handleSubmit, isSubmitEnabled]);

  return (
    <div className="space-y-4">
      <ValidationStatusBadges 
        validUrl={validationStatus.validUrl}
        githubUrl={validationStatus.githubUrl}
        publicRepo={validationStatus.publicRepo}
      />
      
      <div className="flex gap-2 mb-2">
        <textarea
          ref={textareaRef}
          value={inputText}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="https://github.com/username/repository"
          className="flex-1 px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring resize-none overflow-hidden min-h-[40px]"
          rows={1}
        />
        <Button onClick={handleSubmit} disabled={!isSubmitEnabled} size="sm">
          Analyze Repository
        </Button>
      </div>
    </div>
  );
};

interface ValidationStatusBadgesProps {
  validUrl: 'valid' | 'invalid' | 'neutral' | 'checking';
  githubUrl: 'valid' | 'invalid' | 'neutral' | 'checking';
  publicRepo: 'valid' | 'invalid' | 'neutral' | 'checking';
}

const ValidationStatusBadges = ({ validUrl, githubUrl, publicRepo }: ValidationStatusBadgesProps) => {
  // Only show badges if there's some validation activity
  const hasActivity = validUrl !== 'neutral' || githubUrl !== 'neutral' || publicRepo !== 'neutral';
  
  if (!hasActivity) {
    return null;
  }

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