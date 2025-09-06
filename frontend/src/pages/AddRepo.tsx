import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { repos } from "@/data/hardcodedRepos";
export interface Repository {
  name: string;
  stars: number;
  commits: number;
  contributors: number;
  languages: string[];
}

const AddRepo = () => {
  return (
    <div className="h-screen w-screen flex">
      <div className="flex w-1/2 h-full bg-gray-50 flex-col">
        <header className="w-full bg-gray-200">
          <h1 className="text-2xl font-bold">Github Analyzer</h1>
        </header>
        <AddRepoSection />
      </div>
      <div className="flex flex-col w-1/2 h-full bg-gray-100">
        <header className="w-full bg-gray-200">
          <h1 className="text-2xl font-bold">Analyzed Repositories</h1>
        </header>
        <AnalyzedRepos repos={repos} />
      </div>
    </div>
  );
};

const AddRepoSection = () => {
  return (
    <div className="flex flex-col bg-gray-50 p-4 m-4 items-start gap-2 h-full justify-center">
      <Checks checks={["Valid URL", "GitHub URL", "Public Repo"]} />
      <Input
        className="flex bg-red-100 border-gray-200 border-2 p-2"
        placeholder="Enter the URL of the repository you want to analyze"
      />
      <Button disabled={true}>Add Repository</Button>
    </div>
  );
};

const Checks = ({ checks }: { checks: string[] }) => {
  return (
    <div className="flex p-2 gap-2 ">
      {checks.map((check) => (
        <Badge variant="outline" className="flex p-2 bg-green-500">
          {check}
        </Badge>
      ))}
    </div>
  );
};

const AnalyzedRepos = ({ repos }: { repos: Repository[] }) => {
  return (
    <div className="flex flex-wrap bg-gray-50 gap-4 overflow-y-auto">
      {repos.map((repo) => (
        <RepoCard repo={repo} />
      ))}
    </div>
  );
};

const RepoCard = ({ repo }: { repo: Repository }) => {
  return (
    <div
      className="flex flex-col bg-gray-200 p-4 m-2 gap-2 hover:bg-gray-300 cursor-pointer"
      onClick={() => {}}
    >
      <p>{repo.name}</p>
      <div className="flex gap-2 border-gray-100 border-1 bg-white text-sm justify-between">
        <p>{repo.stars}</p>
        <p>{repo.commits}</p>
        <p>{repo.contributors}</p>
      </div>
      <div className="flex gap-2 border-gray-100 border-1 bg-white text-sm justify-between">
        {repo.languages.map((language) => (
          <p className="bg-gray-200 m-1 p-1 ">{language}</p>
        ))}
      </div>
    </div>
  );
};

export default AddRepo;
