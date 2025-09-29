import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GitHubRepoMetadata } from "@/lib/githubMetadataType";
import { ExternalLink, Star, GitFork, Eye, AlertCircle, Calendar, Code2, Users } from "lucide-react";

interface RepositoryMetadataProps {
  metadata: GitHubRepoMetadata;
  onClear?: () => void;
}

const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

const formatBytes = (bytes: number): string => {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const RepositoryMetadata = ({ metadata, onClear }: RepositoryMetadataProps) => {
  const topLanguages = Object.entries(metadata.languagePercentages)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-2xl font-bold">{metadata.name}</h1>
              <a
                href={metadata.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
            <p className="text-sm text-muted-foreground mb-2">{metadata.fullName}</p>
            {metadata.description && (
              <p className="text-sm leading-relaxed">{metadata.description}</p>
            )}
            {metadata.homepage && (
              <a
                href={metadata.homepage}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-400 hover:underline inline-flex items-center gap-1 mt-2"
              >
                {metadata.homepage}
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
          {onClear && (
            <button
              onClick={onClear}
              className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded border border-border hover:bg-muted transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-card/50">
            <CardContent className="pt-3 pb-3">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium">{formatNumber(metadata.stargazersCount)}</span>
                <span className="text-xs text-muted-foreground">stars</span>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card/50">
            <CardContent className="pt-3 pb-3">
              <div className="flex items-center gap-2">
                <GitFork className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">{formatNumber(metadata.forksCount)}</span>
                <span className="text-xs text-muted-foreground">forks</span>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card/50">
            <CardContent className="pt-3 pb-3">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">{formatNumber(metadata.watchersCount)}</span>
                <span className="text-xs text-muted-foreground">watchers</span>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card/50">
            <CardContent className="pt-3 pb-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-medium">{formatNumber(metadata.openIssuesCount)}</span>
                <span className="text-xs text-muted-foreground">issues</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Topics */}
        {metadata.topics.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Topics</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-1">
                {metadata.topics.map((topic) => (
                  <Badge key={topic} variant="secondary" className="text-xs">
                    {topic}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Languages */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Code2 className="h-4 w-4" />
              Languages
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {topLanguages.map(([language, percentage]) => (
              <div key={language} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium">{language}</span>
                  <span className="text-muted-foreground">{percentage.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5">
                  <div
                    className="bg-foreground h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Repository Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Repository Details</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Size</span>
              <span className="font-medium">{formatBytes(metadata.size * 1024)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Default Branch</span>
              <span className="font-medium">{metadata.defaultBranch}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">License</span>
              <span className="font-medium">{metadata.license?.name || 'No license'}</span>
            </div>
            {metadata.fork && metadata.parent && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Forked from</span>
                <a
                  href={metadata.parent.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-blue-400 hover:underline"
                >
                  {metadata.parent.fullName}
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dates */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Created</span>
              <span className="font-medium">{formatDate(metadata.createdAt)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Updated</span>
              <span className="font-medium">{formatDate(metadata.updatedAt)}</span>
            </div>
            {metadata.pushedAt && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Last Push</span>
                <span className="font-medium">{formatDate(metadata.pushedAt)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Latest Commit */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Latest Commit</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            <div className="text-xs">
              <p className="font-medium line-clamp-2 leading-relaxed">
                {metadata.latestCommit.message.split('\n')[0]}
              </p>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {metadata.latestCommit.author}
              </span>
              <span>{formatDate(metadata.latestCommit.date)}</span>
            </div>
            <div className="text-xs">
              <a
                href={metadata.latestCommit.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline font-mono"
              >
                {metadata.latestCommit.shortSha || metadata.latestCommit.sha.slice(0, 7)}
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};