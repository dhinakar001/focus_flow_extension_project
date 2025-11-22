"""Business logic used by FastAPI endpoints."""
from __future__ import annotations

from typing import Dict

from utils.cleaner import clean_text
from models.summarizer import summarize_text


class SummaryService:
    """Encapsulates text summarization behavior."""

    def __init__(self, *, min_length: int = 60, max_length: int = 180) -> None:
        self.min_length = min_length
        self.max_length = max_length

    def summarize(self, payload: str) -> Dict[str, float]:
        """
        Cleans text and returns formatted summary metadata.

        Returns
        -------
        dict : { summary: str, length: int, compression_ratio: float }
        """
        normalized = clean_text(payload)
        result = summarize_text(
            normalized,
            min_length=self.min_length,
            max_length=self.max_length
        )
        summary_text = result.get("summary_text") or result.get("summary") or ""
        summary_text = summary_text.strip()
        original_length = max(len(normalized), 1)
        summary_length = len(summary_text)
        compression_ratio = round(summary_length / original_length, 4)
        return {
            "summary": summary_text,
            "length": summary_length,
            "compression_ratio": compression_ratio
        }


