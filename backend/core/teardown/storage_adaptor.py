from abc import ABC, abstractmethod
from pathlib import Path
from typing import Optional

from loguru import logger

from core.storage.google import StorageBucketClient
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


class GoogleStorageAdaptor(StorageAdaptorInterface):
    def __init__(self):
        self.data_dir = "teardown"
        self.storage_client = StorageBucketClient()

    def create_repo_folder(self, metadata: GitHubRepoMetadata, repo_hash: str) -> None:
        logger.info(f"Creating repo folder: {metadata.full_name}/{repo_hash}")
        self.storage_client.create_folder(
            f"{self.data_dir}/{metadata.full_name}/{repo_hash}"
        )
        logger.info(f"Created repo folder: {metadata.full_name}/{repo_hash}")

    def find_cached_teardown(
        self, metadata: GitHubRepoMetadata, repo_hash: str
    ) -> Optional[Path]:
        logger.info(f"Finding cached teardown: {metadata.full_name}/{repo_hash}")
        expected_path = f"{self.data_dir}/{metadata.full_name}/{repo_hash}/analysis.md"
        if self.storage_client.exists(expected_path):
            logger.info(f"Found cached teardown: {metadata.full_name}/{repo_hash}")
            return Path(expected_path)
        logger.info(f"No cached teardown found: {metadata.full_name}/{repo_hash}")
        return None

    def get_teardown_folder_path(self, metadata: GitHubRepoMetadata) -> Path:
        logger.info(
            f"Getting teardown folder path: {metadata.full_name}/{metadata.latest_commit.sha}"
        )
        return Path(
            f"{self.data_dir}/{metadata.full_name}/{metadata.latest_commit.sha}"
        )

    def save_teardown_analysis(
        self, temp_dir: Path, metadata: GitHubRepoMetadata
    ) -> Path:
        source_file = Path(temp_dir) / "analysis.md"
        if not source_file.exists():
            raise FileNotFoundError(f"Teardown file not found at {source_file}")

        save_location = f"{self.data_dir}/{metadata.full_name}/{metadata.latest_commit.sha}/analysis.md"
        logger.info(f"Saving teardown analysis to: {save_location}")
        self.storage_client.upload_file(
            source_file,
            save_location,
        )
        logger.info(f"Saved teardown analysis to: {save_location}")
        return Path(save_location)
