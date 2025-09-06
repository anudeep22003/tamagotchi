import { AppHeader } from "@/components/AppHeader";
import { RepositoryInput } from "@/components/RepositoryInput";
import { RepositoryGrid } from "@/components/RepositoryGrid";
import { repos } from "@/data/hardcodedRepos";

export interface Repository {
  name: string;
  stars: number;
  commits: number;
  contributors: number;
  languages: string[];
}

const AddRepo = () => {
  const handleRepositoryClick = (repository: Repository) => {
    console.log("Repository clicked:", repository.name);
  };

  return (
    <div className="h-screen flex flex-col">
      <AppHeader
        title="GitHub Repository Analyzer"
        subtitle="Analyze and understand any public GitHub repository"
        badge="Beta"
      />

      <div className="flex-1 flex overflow-hidden">
        <div className="w-1/2 border-r">
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
                  about the codebase structure, architecture patterns,
                  and generate comprehensive documentation.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="w-1/2 flex flex-col">
          <div className="border-b px-6 py-4 flex-shrink-0">
            <h2 className="text-lg font-semibold">
              Sample Repositories
            </h2>
            <p className="text-sm text-muted-foreground">
              Popular repositories that have been analyzed
            </p>
          </div>

          <div className="flex-1 overflow-y-auto">
            <RepositoryGrid
              repositories={repos}
              onRepositoryClick={handleRepositoryClick}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddRepo;
