import hashlib
import re
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Optional

from loguru import logger

logger = logger.bind(name=__name__)


class RepoProcessor:
    def __init__(self, data_dir: str = "data", temp_dir: Optional[str] = None):
        self.data_dir = Path(data_dir)
        self.temp_dir = temp_dir
        self.data_dir.mkdir(exist_ok=True)
    
    def extract_repo_info(self, repo_url: str) -> tuple[str, str]:
        """Extract owner and repo name from GitHub URL."""
        # Handle various GitHub URL formats
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
    
    def compute_repo_hash(self, owner: str, repo_name: str) -> str:
        """Compute hash for repo caching based on owner/repo_name."""
        repo_identifier = f"{owner}/{repo_name}"
        return hashlib.md5(repo_identifier.encode()).hexdigest()[:8]
    
    def find_cached_teardown(self, repo_name: str, repo_hash: str) -> Optional[Path]:
        """Check if a cached teardown exists for this repo."""
        expected_filename = f"{repo_name}-{repo_hash}.md"
        cached_file = self.data_dir / expected_filename
        
        if cached_file.exists():
            logger.info(f"Found cached teardown: {cached_file}")
            return cached_file
        
        # Also check for any files with the same hash in case repo was renamed
        for file_path in self.data_dir.glob(f"*-{repo_hash}.md"):
            logger.info(f"Found cached teardown with same hash: {file_path}")
            return file_path
        
        return None
    
    def clone_repo(self, repo_url: str) -> str:
        """Clone the repository to a temporary directory."""
        temp_dir = tempfile.mkdtemp(prefix="repo-teardown-", dir=self.temp_dir)
        logger.info(f"Cloning {repo_url} to {temp_dir}")
        
        try:
            # Clone with depth 1 for efficiency
            subprocess.run([
                "git", "clone", "--depth", "1", repo_url, temp_dir
            ], check=True, capture_output=True, text=True)
            
            logger.info(f"Successfully cloned repository to {temp_dir}")
            return temp_dir
        
        except subprocess.CalledProcessError as e:
            logger.error(f"Failed to clone repository: {e.stderr}")
            # Cleanup on failure
            shutil.rmtree(temp_dir, ignore_errors=True)
            raise RuntimeError(f"Failed to clone repository: {e.stderr}")
    
    def save_teardown(self, temp_dir: str, repo_name: str, repo_hash: str) -> Path:
        """Copy the generated teardown from temp dir to data dir."""
        source_file = Path(temp_dir) / "repo_analysis.md"
        
        if not source_file.exists():
            raise FileNotFoundError(f"Teardown file not found at {source_file}")
        
        target_filename = f"{repo_name}-{repo_hash}.md"
        target_file = self.data_dir / target_filename
        
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
    
    def process_repo_url(self, repo_url: str) -> tuple[Optional[Path], Optional[str]]:
        """
        Process a repo URL: check cache, clone if needed.
        Returns: (cached_file_path, temp_dir) - one will be None
        """
        try:
            owner, repo_name = self.extract_repo_info(repo_url)
            repo_hash = self.compute_repo_hash(owner, repo_name)
            
            # Check for cached version first
            cached_file = self.find_cached_teardown(repo_name, repo_hash)
            if cached_file:
                return cached_file, None
            
            # No cache found, need to clone and analyze
            temp_dir = self.clone_repo(repo_url)
            return None, temp_dir
            
        except Exception as e:
            logger.error(f"Error processing repo URL {repo_url}: {e}")
            raise