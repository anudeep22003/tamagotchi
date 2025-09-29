/**
 * Information about a Git commit.
 */
export interface CommitInfo {
  sha: string;
  shortSha?: string;
  message: string;
  author: string;
  date: string;
  url: string;
}

/**
 * Repository license information.
 */
export interface LicenseInfo {
  name: string;
  spdxId: string;
  url?: string;
}

/**
 * Parent repository information for forks.
 */
export interface ParentRepoInfo {
  fullName: string;
  url: string;
  stargazersCount: number;
}

/**
 * Error information when GitHub API calls fail.
 */
export interface GitHubRepoError {
  owner: string;
  repoName: string;
  accessible: boolean;
  error: string;
  statusCode?: number;
  errorType?: string;
}

/**
 * Comprehensive GitHub repository metadata.
 */
export interface GitHubRepoMetadata {
  // Basic repository information
  id: number;
  name: string;
  fullName: string;
  owner: string;
  description?: string;
  homepage?: string;
  url: string;
  cloneUrl: string;
  sshUrl: string;

  // Repository statistics
  size: number; // Size in KB
  stargazersCount: number;
  watchersCount: number;
  forksCount: number;
  openIssuesCount: number;
  subscribersCount: number;

  // Language information
  languages: Record<string, number>;
  languagePercentages: Record<string, number>;
  primaryLanguage?: string;

  // Branch and commit information
  defaultBranch: string;
  latestCommit: CommitInfo;
  recentCommits: CommitInfo[];

  // Repository settings
  private: boolean;
  fork: boolean;
  archived: boolean;
  disabled: boolean;
  hasIssues: boolean;
  hasProjects: boolean;
  hasWiki: boolean;
  hasPages: boolean;
  hasDownloads: boolean;

  // Timestamps
  createdAt: string;
  updatedAt: string;
  pushedAt?: string;

  // Additional metadata
  topics: string[];
  license?: LicenseInfo;
  parent?: ParentRepoInfo;

  // Rate limiting information
  rateLimitRemaining: number;
}
