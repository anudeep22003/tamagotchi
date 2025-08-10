import json
import logging
import sys
from typing import Any, Dict


class JsonFormatter(logging.Formatter):
    """Custom formatter that outputs JSON structured logs."""

    def format(self, record: logging.LogRecord) -> str:
        log_entry: Dict[str, Any] = {
            "timestamp": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }

        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)

        if hasattr(record, "extra") and record.extra:  # type: ignore[attr-defined]
            log_entry.update(record.extra)  # type: ignore[attr-defined]

        return json.dumps(log_entry, default=str)


def setup_logging(level: str = "INFO", json_format: bool = True) -> None:
    """Configure the root logger with JSON formatting."""
    root_logger = logging.getLogger()

    if root_logger.handlers:
        root_logger.handlers.clear()

    handler = logging.StreamHandler(sys.stdout)

    if json_format:
        formatter: logging.Formatter = JsonFormatter()
    else:
        formatter = logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        )

    handler.setFormatter(formatter)
    root_logger.addHandler(handler)
    root_logger.setLevel(getattr(logging, level.upper()))


def get_logger(name: str) -> logging.Logger:
    """Get a logger instance for the given name."""
    return logging.getLogger(name)
