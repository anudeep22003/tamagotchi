import { AppHeader } from "@/components/AppHeader";
import { RepositoryInput } from "@/components/RepositoryInput";
import { RepositoryGrid } from "@/components/RepositoryGrid";
import { RepositoryMetadata } from "@/components/RepositoryMetadata";
import { MobileViewSwitcher } from "@/components/MobileViewSwitcher";
import { MobileAnalysisView } from "@/components/MobileAnalysisView";
import { repos } from "@/data/hardcodedRepos";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { GenerativeArea } from "@/components/GenerativeArea";
import { useMessageStore } from "@/store/useMessageStore";
import { useAppContext } from "@/context/AppContext";

export interface Repository {
  name: string;
  url: string;
  stars: number;
  commits: number;
  contributors: number;
  languages: string[];
}

export type RepoStatus = "idle" | "started" | "completed" | "failed";

interface RepoContextType {
  status: RepoStatus;
  setStatus: (status: RepoStatus) => void;
}

const RepoContext = createContext<RepoContextType | null>(null);

export const RepoProvider = ({ children }: { children: ReactNode }) => {
  const [status, setStatus] = useState<RepoStatus>("idle");
  return (
    <RepoContext.Provider value={{ status, setStatus }}>
      {children}
    </RepoContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useRepoContext = () => {
  const context = useContext(RepoContext);
  if (!context) {
    throw new Error(
      "useRepoContext must be used within a RepoProvider"
    );
  }
  return context;
};

const SampleRepos = ({
  handleRepositoryClick,
}: {
  handleRepositoryClick: (repository: Repository) => void;
}) => {
  return (
    <div className="w-1/2 flex flex-col">
      <div className="border-b px-6 py-4 flex-shrink-0">
        <h2 className="text-lg font-semibold">Sample Repositories</h2>
        <p className="text-sm text-muted-foreground">
          Click on any repository to analyze it
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        <RepositoryGrid
          repositories={repos}
          onRepositoryClick={handleRepositoryClick}
        />
      </div>
    </div>
  );
};

const AddRepoContent = () => {
  const { status, setStatus } = useRepoContext();
  const { setInputText } = useAppContext();
  const [mobileView, setMobileView] = useState<"input" | "analysis">(
    "input"
  );
  const githubMetadata = useMessageStore(
    (state) => state.githubMetadata
  );
  const setGithubMetadata = useMessageStore(
    (state) => state.setGithubMetadata
  );

  const handleRepositoryClick = (repository: Repository) => {
    setInputText(repository.url);
    setStatus("started");
    setMobileView("analysis"); // Switch to analysis view on mobile
  };

  const handleClearMetadata = () => {
    setGithubMetadata(null);
    setStatus("idle");
    setMobileView("input"); // Return to input view
  };

  const handleNewAnalysis = () => {
    setStatus("idle");
    setMobileView("input"); // Return to input view
  };

  const handleMobileViewChange = (view: "input" | "analysis") => {
    setMobileView(view);
  };

  // Auto-switch to analysis view when analysis starts
  const showAnalysis = status !== "idle";
  // Always show switcher when there's something to switch between
  const shouldShowSwitcher = showAnalysis || !!githubMetadata;

  // Auto-switch to analysis view on mobile when analysis starts (but not just URL input)
  useEffect(() => {
    if (
      status === "started" &&
      mobileView === "input" &&
      !githubMetadata
    ) {
      // Only auto-switch if we don't have metadata yet (meaning analysis just started)
      setMobileView("analysis");
    }
  }, [status, mobileView, githubMetadata]);

  // When metadata arrives, switch back to input/repository view to show it
  useEffect(() => {
    if (githubMetadata && mobileView === "analysis") {
      setMobileView("input");
    }
  }, [githubMetadata]);

  return (
    <div className="h-screen flex flex-col">
      <div className="sticky top-0 z-10 bg-background">
        <AppHeader
          title="GitHub Repository Analyzer"
          subtitle="Analyze and understand any public GitHub repository"
          badge="Beta"
          onNewAnalysis={handleNewAnalysis}
        />

        <MobileViewSwitcher
          currentView={mobileView}
          onViewChange={handleMobileViewChange}
          showAnalysis={shouldShowSwitcher}
        />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile View */}
        <div className="md:hidden flex flex-col h-full overflow-hidden relative">
          {/* Input/Repository View */}
          <div
            className={`absolute inset-0 transition-transform duration-300 ${
              mobileView === "analysis"
                ? "-translate-x-full"
                : "translate-x-0"
            }`}
          >
            {githubMetadata ? (
              <RepositoryMetadata
                metadata={githubMetadata}
                onClear={handleClearMetadata}
              />
            ) : (
              <div className="h-full flex flex-col">
                <div className="p-4">
                  <RepositoryInput />
                </div>

                {status === "idle" && (
                  <div className="flex-1 overflow-y-auto">
                    <div className="p-4">
                      <h2 className="text-lg font-semibold mb-2">
                        Sample Repositories
                      </h2>
                      <p className="text-sm text-muted-foreground mb-4">
                        Click on any repository to analyze it
                      </p>
                    </div>
                    <div className="px-2">
                      <RepositoryGrid
                        repositories={repos}
                        onRepositoryClick={handleRepositoryClick}
                      />
                    </div>
                  </div>
                )}

                {status !== "idle" && !githubMetadata && (
                  <div className="flex-1 flex items-center justify-center p-8">
                    <div className="text-center text-muted-foreground">
                      <h3 className="text-lg font-medium mb-2">
                        Ready to Analyze
                      </h3>
                      <p className="text-sm">
                        Analysis is starting. Switch to the Analysis tab
                        to view progress.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Analysis View */}
          <div
            className={`absolute inset-0 transition-transform duration-300 ${
              mobileView === "analysis"
                ? "translate-x-0"
                : "translate-x-full"
            }`}
          >
            {showAnalysis && (
              <MobileAnalysisView
                onNewAnalysis={handleNewAnalysis}
                onBackToRepository={() => setMobileView("input")}
              />
            )}
          </div>
        </div>

        {/* Desktop View */}
        <div className="hidden md:flex h-full">
          <div className="w-1/2 border-r">
            {githubMetadata ? (
              <RepositoryMetadata
                metadata={githubMetadata}
                onClear={handleClearMetadata}
              />
            ) : (
              <div className="p-6 h-full flex flex-col">
                <RepositoryInput />

                <div className="mt-8 flex-1">
                  <div className="text-center text-muted-foreground py-12">
                    <h3 className="text-lg font-medium mb-2">
                      Ready to Analyze
                    </h3>
                    <p className="text-sm">
                      Enter a GitHub repository URL above to start the
                      analysis process. We'll provide detailed insights
                      about the codebase structure, architecture
                      patterns, and generate comprehensive
                      documentation.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
          {status === "idle" ? (
            <SampleRepos
              handleRepositoryClick={handleRepositoryClick}
            />
          ) : (
            <div className="w-1/2 flex flex-col">
              <GenerativeArea />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const AddRepo = () => {
  return (
    <RepoProvider>
      <AddRepoContent />
    </RepoProvider>
  );
};

export default AddRepo;
