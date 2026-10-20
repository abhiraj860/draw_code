"""Tiny shared LLM helper. Lessons import `ask` from here."""
import os
import time
from dataclasses import dataclass

from openai import InternalServerError, OpenAI, RateLimitError

DEFAULT_MODEL = "gemini-3.1-flash-lite"
STRONG_MODEL = "gemini-3.8-flash"

_client = None


def client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(
            api_key=os.environ["GEMINI_API_KEY"],
            base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
        )
    return _client


@dataclass
class Result:
    text: str
    in_tokens: int
    out_tokens: int
    latency: float  # seconds
    finish_reason: str


def ask(prompt: str, model: str = DEFAULT_MODEL, max_tokens: int = 200,
        retries: int = 4, **kw) -> Result:
    """Send one user message. Retries 429/5xx with exponential backoff (2s, 4s, 8s...)."""
    for attempt in range(retries + 1):
        try:
            start = time.perf_counter()
            resp = client().chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=max_tokens,
                **kw,
            )
            latency = time.perf_counter() - start
            break
        except (RateLimitError, InternalServerError):  # 429, 5xx (e.g. 503 overloaded)
            if attempt == retries:
                raise
            time.sleep(2 ** (attempt + 1))

    choice = resp.choices[0]
    return Result(
        text=choice.message.content or "",
        in_tokens=resp.usage.prompt_tokens,
        out_tokens=resp.usage.completion_tokens,
        latency=latency,
        finish_reason=choice.finish_reason,
    )
