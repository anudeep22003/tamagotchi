import shutil
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Optional

from loguru import logger

from core.teardown.types import GitHubRepoMetadata

logger = logger.bind(name=__name__)


class StorageAdaptorInterface(ABC):
    @abstractmethod
    def create_repo_folder(self, metadata: GitHubRepoMetadata, repo_hash: str) -> None:
        raise NotImplementedError

    @abstractmethod
    def find_cached_teardown(
        self, metadata: GitHubRepoMetadata, repo_hash: str
    ) -> Optional[Path]:
        raise NotImplementedError

    @abstractmethod
    def get_teardown_folder_path(self, metadata: GitHubRepoMetadata) -> Path:
        raise NotImplementedError

    @abstractmethod
    def save_teardown_analysis(
        self, temp_dir: Path, metadata: GitHubRepoMetadata
    ) -> Path:
        raise NotImplementedError


class LocalStorageClient(StorageAdaptorInterface):
    def __init__(self, data_dir: Path):
        self.data_dir = data_dir

    def create_repo_folder(self, metadata: GitHubRepoMetadata, repo_hash: str) -> None:
        """Create a folder for this repo."""
        path = self.data_dir / metadata.full_name / repo_hash
        path.mkdir(exist_ok=True, parents=True)
        logger.info(f"Created repo folder: {path}")

    def find_cached_teardown(
        self, metadata: GitHubRepoMetadata, repo_hash: str
    ) -> Optional[Path]:
        """Find a cached teardown for this repo."""
        analysis_folder_path = self.data_dir / metadata.full_name / repo_hash
        for file_path in analysis_folder_path.glob("analysis.md"):
            logger.info(f"Found cached teardown: {file_path}")
            return file_path
        return None

    def get_teardown_folder_path(self, metadata: GitHubRepoMetadata) -> Path:
        """Get the path to the teardown for this repo."""
        return self.data_dir / f"{metadata.full_name}/{metadata.latest_commit.sha}"

    def save_teardown_analysis(
        self, temp_dir: Path, metadata: GitHubRepoMetadata
    ) -> Path:
        """Copy the generated teardown from temp dir to data dir."""
        source_file = Path(temp_dir) / "analysis.md"

        if not source_file.exists():
            raise FileNotFoundError(f"Teardown file not found at {source_file}")

        target_filename = "analysis.md"
        target_folder = self.get_teardown_folder_path(metadata)
        target_file = target_folder / target_filename

        shutil.copy2(source_file, target_file)
        logger.info(f"Saved teardown to {target_file}")

        return target_file
