import re
import shutil
import tempfile
from pathlib import Path
from typing import Any, Optional

from git import GitCommandError, Repo
from github import GithubException
from loguru import logger

from core.clients.github_client import get_github_client
from core.clients.storage import StorageClient
from core.config import MAX_REPO_SIZE_MB
from core.teardown.types import (
    CommitInfo,
    GitHubRepoError,
    GitHubRepoMetadata,
    GitHubRepoResult,
    LicenseInfo,
    ParentRepoInfo,
)

logger = logger.bind(name=__name__)


class RepoProcessor:
    def __init__(
        self,
        data_dir: str = "data",
        temp_dir: Optional[str] = None,
    ):
        self.data_dir = Path(data_dir)
        self.temp_dir = temp_dir
        self.storage_client = StorageClient()
        self.data_dir.mkdir(exist_ok=True)

        self.github = get_github_client()

    def extract_repo_info(self, repo_url: str) -> tuple[str, str]:
        """Extract owner and repo name from GitHub URL."""
        patterns = [
            r"https://github\.com/([^/]+)/([^/]+?)(?:\.git)?/?$",
            r"git@github\.com:([^/]+)/([^/]+?)(?:\.git)?/?$",
        ]

        for pattern in patterns:
            match = re.match(pattern, repo_url.strip())
            if match:
                owner, repo_name = match.groups()
                return owner, repo_name

        raise ValueError(f"Invalid GitHub URL format: {repo_url}")

    def get_github_repo_metadata(self, owner: str, repo_name: str) -> GitHubRepoResult:
        """
        Get comprehensive repository metadata using GitHub API.
        Returns a Pydantic model with type safety.
        """
        try:
            repo = self.github.get_repo(f"{owner}/{repo_name}")

            # Get language breakdown
            languages = repo.get_languages()
            total_bytes = sum(languages.values())
            language_percentages = (
                {
                    lang: (bytes_count / total_bytes * 100)
                    for lang, bytes_count in languages.items()
                }
                if total_bytes > 0
                else {}
            )

            # Get latest commit info
            default_branch = repo.default_branch
            latest_commit = repo.get_branch(default_branch).commit

            # Get repository topics/tags
            topics = repo.get_topics()

            # Get recent activity (last 10 commits)
            recent_commits: list[CommitInfo] = []
            for commit in repo.get_commits()[:10]:
                recent_commits.append(
                    CommitInfo(
                        sha=commit.sha,
                        message=commit.commit.message.split("\n")[0],  # First line only
                        author=commit.commit.author.name,
                        date=commit.commit.author.date.isoformat(),
                        url=commit.html_url,
                    )
                )

            # Get license info
            license_info = None
            if repo.license:
                license_info = LicenseInfo(
                    name=repo.license.name,
                    spdx_id=repo.license.spdx_id,
                    url=repo.license.url,
                )

            # Create latest commit info
            latest_commit_info = CommitInfo(
                sha=latest_commit.sha,
                short_sha=latest_commit.sha[:8],
                message=latest_commit.commit.message.strip(),
                author=latest_commit.commit.author.name,
                date=latest_commit.commit.author.date.isoformat(),
                url=latest_commit.html_url,
            )

            # Create parent repo info if this is a fork
            parent_info = None
            if repo.fork and repo.parent:
                parent_info = ParentRepoInfo(
                    full_name=repo.parent.full_name,
                    url=repo.parent.html_url,
                    stargazers_count=repo.parent.stargazers_count,
                )

            metadata = GitHubRepoMetadata(
                # Basic info
                id=repo.id,
                name=repo.name,
                full_name=repo.full_name,
                owner=repo.owner.login,
                description=repo.description,
                homepage=repo.homepage,
                url=repo.html_url,
                clone_url=repo.clone_url,
                ssh_url=repo.ssh_url,
                # Repository stats
                size=repo.size,  # Size in KB
                stargazers_count=repo.stargazers_count,
                watchers_count=repo.watchers_count,
                forks_count=repo.forks_count,
                open_issues_count=repo.open_issues_count,
                subscribers_count=repo.subscribers_count,
                # Language breakdown
                languages=languages,
                language_percentages=language_percentages,
                primary_language=repo.language,
                # Branch and commit info
                default_branch=default_branch,
                latest_commit=latest_commit_info,
                recent_commits=recent_commits,
                # Repository settings
                private=repo.private,
                fork=repo.fork,
                archived=repo.archived,
                disabled=repo.disabled,
                has_issues=repo.has_issues,
                has_projects=repo.has_projects,
                has_wiki=repo.has_wiki,
                has_pages=repo.has_pages,
                has_downloads=repo.has_downloads,
                # Dates
                created_at=repo.created_at.isoformat(),
                updated_at=repo.updated_at.isoformat(),
                pushed_at=repo.pushed_at.isoformat() if repo.pushed_at else None,
                # Additional metadata
                topics=topics,
                license=license_info,
                parent=parent_info,
                # Rate limit info
                rate_limit_remaining=self.github.get_rate_limit().rate.remaining,
            )

            logger.info(f"Retrieved GitHub metadata for {owner}/{repo_name}")
            logger.info(
                f"Repository: {repo.stargazers_count} stars, {repo.forks_count} forks, {repo.size}KB"
            )

            return metadata

        except GithubException as e:
            logger.error(f"GitHub API error for {owner}/{repo_name}: {e}")

            error_info = GitHubRepoError(
                owner=owner,
                repo_name=repo_name,
                accessible=False,
                error=str(e),
                status_code=getattr(e, "status", None),
            )

            # Handle specific error cases
            if getattr(e, "status", None) == 404:
                error_info.error_type = "not_found"
            elif getattr(e, "status", None) == 403:
                error_info.error_type = "rate_limited_or_private"

            return error_info

        except Exception as e:
            logger.error(f"Unexpected error getting GitHub metadata: {e}")
            return GitHubRepoError(
                owner=owner,
                repo_name=repo_name,
                accessible=False,
                error=str(e),
                error_type="unknown",
            )

    def should_clone_repo(self, metadata: GitHubRepoMetadata) -> tuple[bool, str]:
        """
        Determine if a repository should be cloned based on metadata.
        Returns: (should_clone, reason)
        """

        # Check if repository is too large (e.g., > 500MB)
        size_kb = metadata.size
        if size_kb > MAX_REPO_SIZE_MB * 1024:
            return False, f"Repository too large: {size_kb / 1024:.1f}MB"

        # Check if repository is archived
        if metadata.archived:
            logger.warning(f"Repository {metadata.full_name} is archived")

        # Check if repository is disabled
        if metadata.disabled:
            return False, "Repository is disabled"

        return True, "Repository is suitable for cloning"

    def compute_repo_hash(
        self,
        metadata: GitHubRepoMetadata,
    ) -> str:
        """
        Use the latest commit SHA for caching.
        The SHA is globally unique across github, hence a valid hash candidate.
        """
        return metadata.latest_commit.sha

    def check_if_repo_folder_exists(self, metadata: GitHubRepoMetadata) -> bool:
        """Check if a repo entry exists for this repo."""

        for file_path in self.data_dir.glob(f"{metadata.full_name}*"):
            logger.info(f"Found cached teardown: {file_path}")
            return True

        return False

    def find_cached_teardown(
        self, metadata: GitHubRepoMetadata, repo_hash: str
    ) -> Optional[Path]:
        """Find a cached teardown for this repo."""
        analysis_folder_path = self.data_dir / metadata.full_name / repo_hash
        for file_path in analysis_folder_path.glob("analysis.md"):
            logger.info(f"Found cached teardown: {file_path}")
            return file_path

        return None

    def clone_repo(
        self, repo_url: str, branch: Optional[str] = None, shallow: bool = True
    ) -> str:
        """Clone the repository to a temporary directory using GitPython."""
        temp_dir = tempfile.mkdtemp(prefix="repo-teardown-", dir=self.temp_dir)
        logger.info(f"Cloning {repo_url} to {temp_dir}")

        clone_kwargs: dict[str, Any] = {}

        try:
            clone_kwargs = {
                "progress": None,
                "env": {"GIT_TERMINAL_PROMPT": "0"},
            }

            if shallow:
                clone_kwargs["depth"] = 1

            if branch:
                clone_kwargs["branch"] = branch

            repo = Repo.clone_from(repo_url, temp_dir, **clone_kwargs)

            logger.info(f"Successfully cloned repository to {temp_dir}")
            logger.info(f"Current branch: {repo.active_branch.name}")

            return temp_dir

        except GitCommandError as e:
            logger.error(f"Failed to clone repository: {e}")
            shutil.rmtree(temp_dir, ignore_errors=True)
            raise RuntimeError(f"Failed to clone repository: {e}")

    def save_teardown_to_storage(
        self, temp_dir: str, repo_name: str, repo_hash: str
    ) -> None:
        """Save the generated teardown to storage."""
        # self.storage_client.upload_directory(temp_dir, f"{repo_name}/{repo_hash}")
        raise NotImplementedError("Not implemented")
    
    def get_teardown_folder_path(self, metadata: GitHubRepoMetadata) -> Path:
        """Get the path to the teardown for this repo."""
        return self.data_dir / f"{metadata.full_name}/{metadata.latest_commit.sha}"

    def save_teardown(self, temp_dir: str, metadata: GitHubRepoMetadata) -> Path:
        """Copy the generated teardown from temp dir to data dir."""
        source_file = Path(temp_dir) / "repo_analysis.md"

        if not source_file.exists():
            raise FileNotFoundError(f"Teardown file not found at {source_file}")

        target_filename = "analysis.md"
        target_file = self.get_teardown_folder_path(metadata) / target_filename

        shutil.copy2(source_file, target_file)
        logger.info(f"Saved teardown to {target_file}")

        return target_file

    def cleanup_temp_dir(self, temp_dir: str) -> None:
        """Clean up the temporary directory."""
        try:
            shutil.rmtree(temp_dir)
            logger.info(f"Cleaned up temporary directory: {temp_dir}")
        except Exception as e:
            logger.warning(f"Failed to cleanup temp directory {temp_dir}: {e}")

    def process_repo_url(
        self, repo_url: str
    ) -> tuple[Optional[Path], Optional[str], GitHubRepoMetadata]:
        """
        Process a repo URL: get metadata, check cache, clone if needed.
        Returns: (cached_file_path, temp_dir, metadata)
        """
        try:
            owner, repo_name = self.extract_repo_info(repo_url)

            # Get comprehensive GitHub metadata
            metadata = self.get_github_repo_metadata(owner, repo_name)

            # Check if we should proceed with cloning
            if isinstance(metadata, GitHubRepoError):
                raise RuntimeError(f"Repository not accessible: {metadata.error}")

            should_clone, reason = self.should_clone_repo(metadata)

            if not should_clone:
                raise RuntimeError(reason)

            # Use latest commit SHA for accurate caching
            repo_hash = self.compute_repo_hash(metadata)

            # Check for cached version
            if self.check_if_repo_folder_exists(metadata):
                return self.find_cached_teardown(metadata, repo_hash), None, metadata

            # No cache found, clone and analyze
            default_branch = metadata.default_branch or "main"
            temp_dir = self.clone_repo(repo_url, branch=default_branch, shallow=True)

            # self.save_teardown_to_storage(temp_dir, repo_name, repo_hash)
            return None, temp_dir, metadata

        except Exception as e:
            logger.error(f"Error processing repo URL {repo_url}: {e}")
            raise
