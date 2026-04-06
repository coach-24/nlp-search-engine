"""
routers/explain.py

POST /api/explain — returns an LLM-generated explanation of why a result
matches the user's query.
"""
import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from services.llm import explain_match

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Explain"])


class ExplainRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=500, description="User search query")
    text: str = Field(..., min_length=1, max_length=5000, description="Result passage to explain")


class ExplainResponse(BaseModel):
    explanation: str


@router.post("/explain", response_model=ExplainResponse)
async def explain_result(body: ExplainRequest):
    """
    Call the configured LLM to explain why a passage matches the query.
    Responses are cached in-process to avoid duplicate LLM calls.
    """
    try:
        explanation = await explain_match(body.query, body.text)
    except ValueError as exc:
        # User-friendly errors from the LLM layer (timeout, connection, etc.)
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        logger.exception("Unexpected error in /explain: %s", exc)
        raise HTTPException(status_code=500, detail="Explanation service encountered an error.")

    return ExplainResponse(explanation=explanation)
