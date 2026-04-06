import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Literal

from services.llm import process_ai_task

logger = logging.getLogger(__name__)

router = APIRouter(tags=["AI Assistant"])

class AIRequest(BaseModel):
    text: str = Field(..., min_length=10, description="Content to process")
    action: Literal["explain", "summarize", "example"] = Field(..., description="Action to perform")
    force: bool = Field(False, description="Whether to bypass local cache")

class AIResponse(BaseModel):
    output: str

@router.post("/ai", response_model=AIResponse)
async def ai_assistant(body: AIRequest):
    """
    NLP AI Assistant for document-level tasks.
    """
    try:
        output = await process_ai_task(body.text, body.action, force=body.force)
        return AIResponse(output=output)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        logger.exception("AI Assistant error: %s", exc)
        raise HTTPException(status_code=500, detail="Unable to generate explanation")
