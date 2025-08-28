import sys
from pathlib import Path
from typing import Optional

from loguru import logger


def setup_logging(
    level: str = "INFO", json_format: bool = True, log_file: Optional[str] = None
) -> None:
    """Configure loguru with dual output: colored stdout and JSON file logging.

    Args:
        level: Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        json_format: Whether to use JSON formatting for file logs
        log_file: Path to log file. If None, defaults to 'logs/app.log'
    """
    # Remove default handler
    logger.remove()

    # Determine log file path
    if log_file is None:
        log_file = "logs/app.log"

    # Ensure logs directory exists
    log_path = Path(log_file)
    log_path.parent.mkdir(parents=True, exist_ok=True)

    # Add colored output to stdout (always)
    logger.add(
        sys.stdout,
        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
        level=level.upper(),
        colorize=True,
    )

    # Add JSON output to file
    if json_format:
        logger.add(
            log_file,
            format="{time} | {level} | {name}:{function}:{line} - {message}",
            level=level.upper(),
            serialize=True,
            colorize=False,  # No colors in file
            rotation="10 MB",  # Rotate logs when they get large
            retention="7 days",  # Keep logs for 7 days
            compression="gz",  # Compress rotated logs
            backtrace=True,
            diagnose=True,
        )
    else:
        # Plain text file logging
        logger.add(
            log_file,
            format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}",
            level=level.upper(),
            colorize=False,
            rotation="10 MB",
            retention="7 days",
            compression="gz",
        )


def get_logger(name: Optional[str] = None):
    """Get a logger instance for the given name."""
    if name:
        return logger.bind(name=name)
    return logger
