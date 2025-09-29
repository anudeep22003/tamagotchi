import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { ValidationBadges } from "@/components/ValidationBadges";
import { useAppContext } from "@/context/AppContext";
import { useRef, useEffect, useState, useCallback } from "react";
import {
  type ValidationState,
  validateUrl,
  checkRepoVisibility,
  getValidationStatus,
} from "@/lib/githubValidation";
import { Github, Zap, Loader2 } from "lucide-react";
import { useRepoContext } from "@/pages/AddRepo";
import { useMessageStore } from "@/store/useMessageStore";

export const RepositoryInput = () => {
  const { inputText, setInputText, handleGitHubTeardownSendClick } =
    useAppContext();
  const { setStatus } = useRepoContext();
  const githubMetadata = useMessageStore(
    (state) => state.githubMetadata
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const [validationState, setValidationState] =
    useState<ValidationState>({
      isValidUrl: null,
      isGithubUrl: null,
      isPublicRepo: null,
    });
  const [isCheckingRepo, setIsCheckingRepo] = useState(false);
  const [isWaitingForMetadata, setIsWaitingForMetadata] =
    useState(false);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newUrl = e.target.value;
      setInputText(newUrl);

      if (newUrl !== inputText) {
        setValidationState({
          isValidUrl: null,
          isGithubUrl: null,
          isPublicRepo: null,
        });
        setIsCheckingRepo(false);
      }
    },
    [inputText, setInputText]
  );

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

      setValidationState((prev) => ({
        ...prev,
        isValidUrl,
        isGithubUrl,
        isPublicRepo: isGithubUrl ? prev.isPublicRepo : null,
      }));

      if (isValidUrl && isGithubUrl) {
        setIsCheckingRepo(true);
        try {
          const isPublic = await checkRepoVisibility(inputText);
          setValidationState((prev) => ({
            ...prev,
            isPublicRepo: isPublic,
          }));
        } catch {
          setValidationState((prev) => ({
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

  // Reset waiting state when metadata arrives
  useEffect(() => {
    if (githubMetadata && isWaitingForMetadata) {
      setIsWaitingForMetadata(false);
    }
  }, [githubMetadata, isWaitingForMetadata]);

  const validationStatus = getValidationStatus(
    validationState,
    isCheckingRepo
  );
  const isSubmitEnabled =
    validationState.isValidUrl === true &&
    validationState.isGithubUrl === true &&
    validationState.isPublicRepo === true &&
    !isWaitingForMetadata;

  const handleSubmit = useCallback(() => {
    if (isSubmitEnabled) {
      setIsWaitingForMetadata(true);
      handleGitHubTeardownSendClick();
      setStatus("started");
    }
  }, [isSubmitEnabled, handleGitHubTeardownSendClick, setStatus]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && isSubmitEnabled) {
        handleSubmit();
      }
    },
    [handleSubmit, isSubmitEnabled]
  );

  return (
    <Card className="h-fit">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Github className="h-5 w-5" />
          Add Repository
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <ValidationBadges
            validUrl={validationStatus.validUrl}
            githubUrl={validationStatus.githubUrl}
            publicRepo={validationStatus.publicRepo}
          />

          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="https://github.com/username/repository"
              className="flex-1"
            />
            <Button
              onClick={handleSubmit}
              disabled={!isSubmitEnabled}
              className="gap-2"
            >
              {isWaitingForMetadata ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              {isWaitingForMetadata ? "Analyzing..." : "Analyze"}
            </Button>
          </div>
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Enter a GitHub repository URL to start analysis</p>
          <p>• Only public repositories are supported</p>
          <p>
            • Analysis includes code structure, diagrams, and
            documentation
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
