"""
services/llm.py

Pluggable LLM backend for the Explain Match feature.
Switch providers by changing LLM_PROVIDER in .env.

Supported providers
  - ollama   (default, local, no API key needed)
  - openai   (requires OPENAI_API_KEY)
  - gemini   (requires GEMINI_API_KEY)
"""

import hashlib
import logging

import httpx

from utils.config import settings

logger = logging.getLogger(__name__)

# ── In-process explanation cache ─────────────────────────────────────────────
# Keyed by SHA-256(query + text).  No TTL needed: explanations are deterministic.
_cache: dict[str, str] = {}

# ── PROMPTS ──────────────────────────────────────────────────────────────────

EXPLAIN_MATCH_SYSTEM_PROMPT = """You are a helpful NLP assistant embedded in a textbook search engine.
Your task is to briefly explain WHY a specific passage from a textbook matches a user's search query.

Rules:
- Be concise: 2–3 sentences maximum.
- Highlight the semantic connection between the query and the passage.
- Mention key overlapping concepts or themes.
- Do NOT repeat the full passage verbatim.
- Use plain, beginner-friendly English.
- Never include greetings or filler phrases."""

AI_ASSISTANT_SYSTEM_PROMPT = "You are an expert NLP tutor assisting a student with textbook content."

AI_PROMPTS = {
    "explain": """Explain the following NLP concept clearly.
Rules:
- Be concise (2–4 lines).
- Use simple language.
- Focus on the core concept and its significance.""",
    "summarize": """Summarize the following content.
Rules:
- Provide exactly 3 short and precise bullet points.
- Capture the primary takeaways.""",
    "example": """Provide a real-world example or analogy for the following content.
Rules:
- Make it easy to understand for a beginner.
- Be concise (2–3 lines)."""
}


def _cache_key(query: str, text: str) -> str:
    raw = f"{query.strip().lower()}|||{text.strip()[:500]}"
    return hashlib.sha256(raw.encode()).hexdigest()


async def explain_match(query: str, text: str) -> str:
    """
    Explains why a passage matches a search query.
    """
    key = _cache_key(f"match:{query}", text)
    if key in _cache:
        return _cache[key]

    user_prompt = f"Search Query: {query.strip()}\n\nPassage:\n{_truncate(text)}"
    explanation = await _dispatch_llm(EXPLAIN_MATCH_SYSTEM_PROMPT, user_prompt)

    _cache[key] = explanation
    return explanation


async def process_ai_task(text: str, action: str, force: bool = False) -> str:
    """
    Processes a generic AI task (explain, summarize, example) for a document.
    """
    if action not in AI_PROMPTS:
        raise ValueError(f"Unknown AI action '{action}'")

    key = _cache_key(f"task:{action}", text)
    if not force and key in _cache:
        return _cache[key]

    system_prompt = f"{AI_ASSISTANT_SYSTEM_PROMPT}\n\n{AI_PROMPTS[action]}"
    user_prompt = f"Content to process:\n{_truncate(text)}"

    result = await _dispatch_llm(system_prompt, user_prompt)

    _cache[key] = result
    return result


async def _dispatch_llm(system_prompt: str, user_prompt: str) -> str:
    """
    Central dispatcher for LLM calls based on provider settings.
    """
    provider = settings.llm_provider.lower()

    try:
        if provider == "ollama":
            result = await _call_ollama(system_prompt, user_prompt)
        elif provider == "openai":
            result = await _call_openai(system_prompt, user_prompt)
        elif provider == "gemini":
            result = await _call_gemini(system_prompt, user_prompt)
        else:
            raise ValueError(f"Unknown LLM_PROVIDER '{provider}'")
    except httpx.TimeoutException:
        raise ValueError("The LLM took too long to respond.")
    except httpx.ConnectError:
        raise ValueError(f"Cannot connect to LLM provider ({provider}).")

    if not result or not result.strip():
        raise ValueError("The AI returned an empty response.")

    return result.strip()


# ── Provider Calls ───────────────────────────────────────────────────────────

async def _call_ollama(system_prompt: str, user_prompt: str) -> str:
    payload = {
        "model": settings.llm_model,
        "prompt": f"{system_prompt}\n\n{user_prompt}",
        "stream": False,
        "options": {"temperature": 0.7, "num_predict": 300},
    }

    async with httpx.AsyncClient(timeout=settings.llm_timeout_seconds) as client:
        resp = await client.post(settings.ollama_base_url + "/api/generate", json=payload)
        resp.raise_for_status()
        data = resp.json()
        return str(data.get("response", ""))


async def _call_openai(system_prompt: str, user_prompt: str) -> str:
    if not settings.openai_api_key:
        raise ValueError("OPENAI_API_KEY is not set.")

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]

    async with httpx.AsyncClient(timeout=settings.llm_timeout_seconds) as client:
        resp = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {settings.openai_api_key}"},
            json={"model": settings.llm_model, "messages": messages, "max_tokens": 300, "temperature": 0.7},
        )
        resp.raise_for_status()
        data = resp.json()
        return str(data["choices"][0]["message"]["content"])


async def _call_gemini(system_prompt: str, user_prompt: str) -> str:
    if not settings.gemini_api_key:
        raise ValueError("GEMINI_API_KEY is not set.")

    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{settings.llm_model}:generateContent?key={settings.gemini_api_key}"
    )
    body = {
        "contents": [{"parts": [{"text": f"{system_prompt}\n\n{user_prompt}"}]}],
        "generationConfig": {"maxOutputTokens": 300, "temperature": 0.7},
    }

    async with httpx.AsyncClient(timeout=settings.llm_timeout_seconds) as client:
        resp = await client.post(url, json=body)
        resp.raise_for_status()
        data = resp.json()
        return str(data["candidates"][0]["content"]["parts"][0]["text"])


def _truncate(text: str, limit: int = 2000) -> str:
    clean = text.strip()
    return clean[:limit] + (" [...]" if len(clean) > limit else "")
