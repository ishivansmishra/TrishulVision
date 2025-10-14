import os
import httpx
import logging
import time
from ..config import settings
from ..mongo import get_db as _get_mongo_db
import asyncio


OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"


def _build_summary_prompt(report_result: dict) -> str:
    est = (report_result or {}).get('estimation') or {}
    area = (report_result or {}).get('area_ha')
    vol = est.get('volume_m3')
    depth = est.get('depth_m')
    pieces = [
        "Summarize the mining detection results in 2-4 sentences for an authority officer.",
        f"Estimated volume: {vol} m^3" if vol is not None else None,
        f"Estimated depth: {depth} m" if depth is not None else None,
        f"Analyzed area: {area} ha" if area is not None else None,
        "Keep it concise and neutral. Include if activity may be outside permitted boundaries if such signal is present.",
    ]
    return "\n".join([p for p in pieces if p])


def summarize_report(report_result: dict) -> str:
    api_key = settings.OPENAI_API_KEY or os.getenv('OPENAI_API_KEY')
    if not api_key:
        # Safe fallback if no key is configured
        est = (report_result or {}).get('estimation') or {}
        area = (report_result or {}).get('area_ha', 'unknown')
        vol = est.get('volume_m3')
        return f"Estimated excavated volume {vol if vol is not None else 'N/A'} m^3 over area {area} ha."

    prompt = _build_summary_prompt(report_result)
    headers = {
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json',
    }
    body = {
        'model': settings.OPENAI_MODEL or 'gpt-4o-mini',
        'messages': [
            { 'role': 'system', 'content': 'You are an expert mining compliance assistant.' },
            { 'role': 'user', 'content': prompt },
        ],
        'temperature': 0.2,
        'max_tokens': 200,
    }
    attempts = 3
    delays = [0.5, 1.0, 2.0]
    for attempt in range(1, attempts+1):
        try:
            with httpx.Client(timeout=20) as client:
                r = client.post(OPENAI_API_URL, headers=headers, json=body)
                if r.status_code >= 400:
                    logging.error("OpenAI summarize error %s attempt %s: %s", r.status_code, attempt, r.text[:400])
                r.raise_for_status()
                data = r.json()
                return (data.get('choices') or [{}])[0].get('message', {}).get('content') or 'Summary unavailable.'
        except Exception as e:
            logging.warning("summarize_report attempt %s failed: %s", attempt, e, exc_info=True)
            if attempt == attempts and settings.LLM_REQUIRE:
                raise
            if attempt < attempts:
                time.sleep(delays[attempt-1])
    # Fallback only if not strictly required
    if settings.LLM_REQUIRE:
        raise RuntimeError("LLM required but unavailable for summarize_report")
        # Non-fatal fallback
        est = (report_result or {}).get('estimation') or {}
        area = (report_result or {}).get('area_ha', 'unknown')
        vol = est.get('volume_m3')
        return f"Estimated excavated volume {vol if vol is not None else 'N/A'} m^3 over area {area} ha."


def chat(messages: list[dict], system_prompt: str | None = None) -> str:
    """
    messages: list of { role: 'user'|'assistant'|'system', content: str }
    Returns assistant text. If no API key, returns a concise fallback.
    """
    api_key = settings.OPENAI_API_KEY or os.getenv('OPENAI_API_KEY')
    if not api_key:
        # simple echo/fallback
        last_user = next((m.get('content') for m in reversed(messages) if m.get('role') == 'user'), '')
        return f"(dev) You asked: {last_user}. Summaries and answers will be richer when an OpenAI key is configured."
    headers = { 'Authorization': f'Bearer {api_key}', 'Content-Type': 'application/json' }
    chat_messages = []
    if system_prompt:
        chat_messages.append({ 'role': 'system', 'content': system_prompt })
    chat_messages.extend(messages)
    body = {
        'model': settings.OPENAI_MODEL or 'gpt-4o-mini',
        'messages': chat_messages,
        'temperature': 0.2,
        'max_tokens': 500,
    }
    attempts = 3
    delays = [0.5, 1.0, 2.0]
    for attempt in range(1, attempts+1):
        try:
            with httpx.Client(timeout=30) as client:
                r = client.post(OPENAI_API_URL, headers=headers, json=body)
                if r.status_code >= 400:
                    logging.error("OpenAI chat error %s attempt %s: %s", r.status_code, attempt, r.text[:400])
                r.raise_for_status()
                data = r.json()
                return (data.get('choices') or [{}])[0].get('message', {}).get('content') or 'Reply unavailable.'
        except Exception as e:
            logging.warning("chat attempt %s failed: %s", attempt, e, exc_info=True)
            if attempt == attempts and settings.LLM_REQUIRE:
                raise
            if attempt < attempts:
                time.sleep(delays[attempt-1])
    if settings.LLM_REQUIRE:
        raise RuntimeError("LLM required but unavailable for chat")
    # async log failure fire-and-forget
    try:
        async def _log():
            try:
                db = await _get_mongo_db()
                await db.get_collection('ai_llm_failures').insert_one({
                    'at': __import__('datetime').datetime.utcnow(),
                    'system_prompt': system_prompt,
                    'messages_tail': messages[-5:],
                    'model': settings.OPENAI_MODEL or 'gpt-4o-mini'
                })
            except Exception:
                pass
        asyncio.create_task(_log())
    except Exception:
        pass
    last_user = next((m.get('content') for m in reversed(messages) if m.get('role') == 'user'), '').strip()
    original = last_user
    # Extract QUESTION: line if a RAG context blob was echoed
    if 'CONTEXT' in last_user.upper():
        for line in last_user.splitlines():
            if line.strip().lower().startswith('question:'):
                last_user = line.split(':',1)[1].strip()
                break
    # Heuristic mining/topic detection
    tokens = last_user.lower().split()
    mining_terms = { 'mining','volume','depth','gis','satellite','dem','detection','report','illegal','compliance','polygon','heatmap','pit' }
    is_domain = any(t in mining_terms for t in tokens)
    if settings.LLM_UNRESTRICTED:
        return "(fallback) OpenAI request failed after retries. Enable LLM_REQUIRE=true for a 503 error and check logs."  # no heuristics in unrestricted mode
    if settings.LLM_HEURISTIC_FALLBACK and is_domain and last_user:
        heuristic = (
            f"(fallback-heuristic) Based on offline mode: For '{last_user}', TrishulVision would normally consult detection jobs and reports to summarize mining activity (volume, depth, area) and compliance context. Try again later when LLM connectivity is restored for a richer answer."
        )
    else:
        heuristic = (
            "(fallback) LLM offline. "
            + (f"Question: {last_user}. " if last_user else "")
            + "Set LLM_REQUIRE=true for hard failures or check logs for 'OpenAI chat error'."
        )
    return heuristic


def llm_diagnostics() -> dict:
    """Return non-secret diagnostics about LLM configuration for debugging."""
    key_present = bool(settings.OPENAI_API_KEY or os.getenv('OPENAI_API_KEY'))
    return {
        'openai_key_loaded': key_present,
        'model': settings.OPENAI_MODEL or 'gpt-4o-mini',
        'using_env_var': bool(os.getenv('OPENAI_API_KEY') and not settings.OPENAI_API_KEY),
    }
