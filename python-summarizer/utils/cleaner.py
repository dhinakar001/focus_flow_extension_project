"""Utility helpers for preparing text before summarization."""
import re
from typing import Final

WHITESPACE_RE: Final[re.Pattern[str]] = re.compile(r"\s+")


def clean_text(value: str) -> str:
    """Normalizes whitespace and strips leading/trailing characters."""
    if not isinstance(value, str):
        raise TypeError("value must be a string")
    normalized = WHITESPACE_RE.sub(" ", value).strip()
    return normalized


