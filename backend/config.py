"""Settings and the list of LLMs the app can use."""

import os
from dataclasses import dataclass
from pathlib import Path

import httpx
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")

# "local" runs code as a subprocess on this machine; "docker" runs it in a
# throwaway container with no network access.
RUNNER = os.getenv("RUNNER", "local").lower()
DOCKER_IMAGE = os.getenv("DOCKER_IMAGE", "python:3.12-slim")
OLLAMA_BASE = os.getenv("OLLAMA_API_BASE", "http://localhost:11434")


@dataclass
class ModelOption:
    id: str  # LiteLLM model string, e.g. "anthropic/claude-sonnet-5-5"
    label: str  # Shown in the UI
    env: str | None  # API key env var that must be set, None if not needed
    vision: bool  # Whether to also send a PNG of the drawing
    max_tokens: int = 8192


# Edit this list to add or remove models. Any model LiteLLM supports works:
# https://docs.litellm.ai/docs/providers
MODELS: list[ModelOption] = [
    ModelOption("anthropic/claude-sonnet-5-5", "Claude Sonnet 5.5", "ANTHROPIC_API_KEY", True, 16000),
    ModelOption("anthropic/claude-opus-5-5", "Claude Opus 5.5", "ANTHROPIC_API_KEY", True, 16000),
    ModelOption("anthropic/claude-haiku-5-5", "Claude Haiku 5.5", "ANTHROPIC_API_KEY", True, 8192),
    ModelOption("openai/gpt-5", "GPT-5", "OPENAI_API_KEY", True, 16000),
    ModelOption("openai/gpt-5-mini", "GPT-5 mini", "OPENAI_API_KEY", True, 16000),
    ModelOption("gemini/gemini-2.5-pro", "Gemini 2.5 Pro", "GEMINI_API_KEY", True, 16000),
    ModelOption("gemini/gemini-2.5-flash", "Gemini 2.5 Flash", "GEMINI_API_KEY", True, 16000),
    ModelOption("groq/llama-3.3-70b-versatile", "Llama 3.3 70B (Groq)", "GROQ_API_KEY", False, 8192),
    ModelOption("deepseek/deepseek-chat", "DeepSeek V3", "DEEPSEEK_API_KEY", False, 8192),
    ModelOption("openrouter/qwen/qwen-2.5-coder-32b-instruct", "Qwen 2.5 Coder (OpenRouter)", "OPENROUTER_API_KEY", False, 8192),
]


def _extra_models() -> list[ModelOption]:
    """Models from EXTRA_MODELS="provider/model,provider/model" in .env."""
    raw = os.getenv("EXTRA_MODELS", "")
    return [ModelOption(m.strip(), m.strip(), None, False) for m in raw.split(",") if m.strip()]


def _ollama_models() -> list[ModelOption]:
    """Every model installed in a local Ollama, if Ollama is running."""
    try:
        resp = httpx.get(f"{OLLAMA_BASE}/api/tags", timeout=0.5)
        resp.raise_for_status()
    except Exception:
        return []
    return [
        ModelOption(f"ollama_chat/{m['name']}", f"{m['name']} (Ollama, local)", None, False)
        for m in resp.json().get("models", [])
        if "embed" not in m["name"]  # embedding models cannot write code
    ]


def available_models() -> list[ModelOption]:
    ready = [m for m in MODELS if m.env is None or os.getenv(m.env)]
    return ready + _extra_models() + _ollama_models()


def find_model(model_id: str) -> ModelOption:
    for m in available_models():
        if m.id == model_id:
            return m
    raise KeyError(model_id)


def models_as_json() -> list[dict]:
    return [{"id": m.id, "label": m.label, "vision": m.vision} for m in available_models()]
