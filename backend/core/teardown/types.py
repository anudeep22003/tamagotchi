from pathlib import Path
from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class CommitInfo(BaseModel):
    """Information about a Git commit."""

    sha: str
    short_sha: Optional[str] = None
    message: str
    author: str
    date: str
    url: str


class LicenseInfo(BaseModel):
    """Repository license information."""

    name: str
    spdx_id: str
    url: Optional[str] = None


class ParentRepoInfo(BaseModel):
    """Parent repository information for forks."""

    full_name: str
    url: str
    stargazers_count: int


class GitHubRepoError(BaseModel):
    """Error information when GitHub API calls fail."""

    owner: str
    repo_name: str
    accessible: bool = False
    error: str
    status_code: Optional[int] = None
    error_type: Optional[str] = None


class GitHubRepoMetadata(BaseModel):
    """Comprehensive GitHub repository metadata."""

    # Basic repository information
    id: int
    name: str
    full_name: str
    owner: str
    description: Optional[str] = None
    homepage: Optional[str] = None
    url: str
    clone_url: str
    ssh_url: str

    # Repository statistics
    size: int  # Size in KB
    stargazers_count: int
    watchers_count: int
    forks_count: int
    open_issues_count: int
    subscribers_count: int

    # Language information
    languages: Dict[str, int] = Field(default_factory=dict)
    language_percentages: Dict[str, float] = Field(default_factory=dict)
    primary_language: Optional[str] = None

    # Branch and commit information
    default_branch: str
    latest_commit: CommitInfo
    recent_commits: List[CommitInfo] = Field(default_factory=list)

    # Repository settings
    private: bool
    fork: bool
    archived: bool
    disabled: bool
    has_issues: bool
    has_projects: bool
    has_wiki: bool
    has_pages: bool
    has_downloads: bool

    # Timestamps
    created_at: str
    updated_at: str
    pushed_at: Optional[str] = None

    # Additional metadata
    topics: List[str] = Field(default_factory=list)
    license: Optional[LicenseInfo] = None
    parent: Optional[ParentRepoInfo] = None

    # Rate limiting information
    rate_limit_remaining: int


# Union type for successful metadata or error
GitHubRepoResult = GitHubRepoMetadata | GitHubRepoError


class ProcessRepoResultCache(BaseModel):
    cached_file_path: Path
    metadata: GitHubRepoMetadata


class ProcessRepoResultNoCache(BaseModel):
    temp_dir: Path
    metadata: GitHubRepoMetadata


ProcessRepoResult = ProcessRepoResultCache | ProcessRepoResultNoCache
