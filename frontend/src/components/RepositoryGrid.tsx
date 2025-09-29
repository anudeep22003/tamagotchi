import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { type Repository } from "@/pages/AddRepo";
import { Star, GitCommit, Users, ExternalLink } from "lucide-react";

interface RepositoryCardProps {
  repository: Repository;
  onClick?: (repository: Repository) => void;
}

const RepositoryCard = ({
  repository,
  onClick,
}: RepositoryCardProps) => {
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const handleClick = () => {
    onClick?.(repository);
  };

  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] group"
      onClick={handleClick}
    >
      <CardHeader className="pb-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-sm truncate group-hover:text-primary">
              {repository.name}
            </h3>
            <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-primary" />
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {repository.url}
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Star className="h-3 w-3" />
              {formatNumber(repository.stars)}
            </div>
            <div className="flex items-center gap-1">
              <GitCommit className="h-3 w-3" />
              {formatNumber(repository.commits)}
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {formatNumber(repository.contributors)}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-wrap gap-1">
          {repository.languages.slice(0, 3).map((language) => (
            <Badge
              key={language}
              variant="outline"
              className="text-xs px-1 py-0"
            >
              {language}
            </Badge>
          ))}
          {repository.languages.length > 3 && (
            <Badge variant="outline" className="text-xs px-1 py-0">
              +{repository.languages.length - 3}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

interface RepositoryGridProps {
  repositories: Repository[];
  onRepositoryClick?: (repository: Repository) => void;
}

export const RepositoryGrid = ({
  repositories,
  onRepositoryClick,
}: RepositoryGridProps) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
      {repositories.map((repo, index) => (
        <RepositoryCard
          key={`${repo.name}-${index}`}
          repository={repo}
          onClick={onRepositoryClick}
        />
      ))}
    </div>
  );
};
