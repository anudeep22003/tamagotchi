from abc import ABC, abstractmethod
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator, Optional, TextIO

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
    ) -> Optional[Path]:
        raise NotImplementedError

    @abstractmethod
    @contextmanager
    def open_teardown_analysis(self, analysis_file_path: Path) -> Iterator[TextIO]:
        raise NotImplementedError
