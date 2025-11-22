"""FastAPI application entrypoint for FocusFlow summarization service."""
from __future__ import annotations

import asyncio
import logging
import os
from typing import List

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from services.summary_service import SummaryService
from utils.cleaner import clean_text

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("focusflow.summarizer")

ALLOWED_ORIGINS: List[str] = [
    "http://localhost:3000",
    "http://localhost:4000"
]

SUMMARY_TIMEOUT_SECONDS = float(os.getenv("SUMMARY_TIMEOUT_SECONDS", "15"))

app = FastAPI(
    title="FocusFlow Summarization Service",
    description="Generates concise summaries for the FocusFlow platform.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

summary_service = SummaryService()


class SummaryRequest(BaseModel):
    """Payload model for summarization requests."""

    text: str = Field(..., description="Full text to summarize.")


class SummaryResponse(BaseModel):
    """Response schema for summaries."""

    summary: str
    length: int
    compression_ratio: float


@app.post("/summarize", response_model=SummaryResponse)
async def summarize(payload: SummaryRequest) -> SummaryResponse:
    """
    Summarizes long-form text using Hugging Face transformers.
    """
    cleaned_input = clean_text(payload.text)
    if not cleaned_input:
        raise HTTPException(status_code=400, detail="Text cannot be empty.")
    if len(cleaned_input) < 30:
        raise HTTPException(status_code=400, detail="Text must be at least 30 characters.")

    try:
        summary = await asyncio.wait_for(
            asyncio.to_thread(summary_service.summarize, cleaned_input),
            timeout=SUMMARY_TIMEOUT_SECONDS
        )
        return SummaryResponse(**summary)
    except asyncio.TimeoutError as exc:
        logger.error("Summarization timed out", exc_info=True)
        raise HTTPException(status_code=504, detail="Summarization request timed out.") from exc
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Summarization failed.")
        raise HTTPException(status_code=500, detail="Failed to generate summary.") from exc


@app.get("/health")
async def health() -> dict:
    """Simple health probe."""
    return {"status": "ok", "service": "python-summarizer"}


