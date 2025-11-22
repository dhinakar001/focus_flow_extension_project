"""Model loader that exposes a singleton Hugging Face summarization pipeline."""
from __future__ import annotations

from functools import lru_cache
from typing import Any, Dict

import torch
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer, pipeline

MODEL_NAME = "facebook/bart-large-cnn"
MAX_INPUT_TOKENS = 1024


def _device_id() -> int:
    """Returns CUDA device index if available, else CPU (-1)."""
    return 0 if torch.cuda.is_available() else -1


@lru_cache(maxsize=1)
def get_summarization_pipeline() -> Any:
    """Initializes (or returns cached) summarization pipeline."""
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, model_max_length=MAX_INPUT_TOKENS)
    model = AutoModelForSeq2SeqLM.from_pretrained(MODEL_NAME)
    summarizer = pipeline(
        task="summarization",
        model=model,
        tokenizer=tokenizer,
        device=_device_id()
    )
    return summarizer


def summarize_text(
    text: str,
    *,
    min_length: int = 60,
    max_length: int = 180,
    no_repeat_ngram_size: int = 3
) -> Dict[str, str]:
    """
    Runs the cached summarization pipeline against provided text.

    Parameters
    ----------
    text: str
        Content to summarize.
    min_length: int
        Minimum summary length in tokens.
    max_length: int
        Maximum summary length in tokens.
    no_repeat_ngram_size: int
        Prevents repetition of n-grams in generated text.
    """
    summarizer = get_summarization_pipeline()
    return summarizer(
        text,
        min_length=min_length,
        max_length=max_length,
        no_repeat_ngram_size=no_repeat_ngram_size,
        truncation=True
    )[0]


