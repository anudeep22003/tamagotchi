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
import { Github, Zap, Loader2, ExternalLink, Star, Info, Clock, Code, Globe } from "lucide-react";
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

        {/* Project Information Section */}
        <div className="space-y-4 pt-4 border-t border-border">
          {/* How It Works */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Info className="h-4 w-4" />
              How It Works
            </div>
            <div className="text-xs text-muted-foreground space-y-1 pl-6">
              <p>• Fetches repository metadata using GitHub API</p>
              <p>• Clones repo into a secure container environment</p>
              <p>• Runs Claude Code SDK for comprehensive analysis</p>
              <p>• Streams real-time progress and generates detailed insights</p>
            </div>
          </div>

          {/* Current Limitations */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Clock className="h-4 w-4" />
              Current Limitations
            </div>
            <div className="text-xs text-muted-foreground space-y-1 pl-6">
              <p>• Analysis takes 5+ minutes (complex repos may take longer)</p>
              <p>• Socket disconnection requires restart (caching planned)</p>
              <p>• Repository size limited to ~100MB</p>
              <p>• New repos analyzed from scratch (previous analyses cached)</p>
            </div>
          </div>

          {/* Future Plans */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Code className="h-4 w-4" />
              Planned Improvements
            </div>
            <div className="text-xs text-muted-foreground space-y-1 pl-6">
              <p>• Cloud-based Claude Code for always-on analysis</p>
              <p>• Pause/resume functionality for mobile workflows</p>
              <p>• Enhanced output quality and faster processing</p>
              <p>• Session recovery and progress caching</p>
            </div>
          </div>

          {/* Links and Support */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Globe className="h-4 w-4" />
              Support This Project
            </div>
            
            <div className="space-y-2 pl-6">
              <div className="flex items-center gap-2">
                <a
                  href="https://github.com/Sidebrain/github-repo-understand"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <Github className="h-3 w-3" />
                  View on GitHub
                  <ExternalLink className="h-3 w-3" />
                </a>
                <span className="text-xs text-muted-foreground">•</span>
                <a
                  href="https://github.com/Sidebrain/github-repo-understand"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-yellow-400 hover:text-yellow-300 transition-colors"
                >
                  <Star className="h-3 w-3" />
                  Give it a star!
                </a>
              </div>
              
              <div className="flex items-center gap-2">
                <a
                  href="https://anudeepy.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <Globe className="h-3 w-3" />
                  anudeepy.com
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>

            <div className="text-xs text-muted-foreground pl-6 space-y-1">
              <p>Found an issue? Want to contribute? Feel free to reach out!</p>
              <p>Clone the repo and submit PRs - contributions welcome.</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
