import shutil
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator, Optional, TextIO

from loguru import logger

from core.teardown.types import GitHubRepoMetadata

from .abstract_storage_adaptor import StorageAdaptorInterface

logger = logger.bind(name=__name__)


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
    ) -> Optional[Path]:
        """Copy the generated teardown from temp dir to data dir."""
        source_file = Path(temp_dir) / "analysis.md"

        if not source_file.exists():
            raise FileNotFoundError(f"Teardown file not found at {source_file}")
        try:
            target_filename = "analysis.md"
            target_folder = self.get_teardown_folder_path(metadata)
            target_file = target_folder / target_filename

            shutil.copy2(source_file, target_file)
            logger.info(f"Saved teardown to {target_file}")
            return target_file.absolute()
        except Exception as e:
            logger.error(f"Failed to save teardown analysis: {e}")
            return None

    @contextmanager
    def open_teardown_analysis(
        self, analysis_file_path_absolute: Path
    ) -> Iterator[TextIO]:
        analysis_path = analysis_file_path_absolute.absolute()
        with open(analysis_path, "r") as f:
            yield f
