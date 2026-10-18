"""Builds the prompt from a diagram and streams code back from any LiteLLM model."""

import json
from collections.abc import AsyncIterator
from pathlib import Path

import litellm

from config import ModelOption

litellm.telemetry = False
litellm.suppress_debug_info = True
litellm.drop_params = True  # ignore params a provider does not support

PROMPTS = Path(__file__).resolve().parent / "prompts"
MODES = {
    "simulation": "simulation.md",
    "modules": "modules.md",
    "fastapi": "fastapi.md",
}


def system_prompt(mode: str) -> str:
    common = (PROMPTS / "common.md").read_text()
    return common + "\n\n" + (PROMPTS / MODES[mode]).read_text()


def user_content(
    graph: dict,
    image: str | None,
    notes: str,
    previous_files: list[dict],
    send_image: bool,
) -> list[dict]:
    text = "Here is the diagram as a graph:\n\n```json\n" + json.dumps(graph, indent=2) + "\n```\n"
    if notes.strip():
        text += "\nExtra instructions from the user:\n" + notes.strip() + "\n"
    if previous_files:
        text += (
            "\nThe project already contains the files below, generated from an earlier "
            "version of the diagram and possibly edited by the user. Update them to match "
            "the diagram as it is now. Keep the user's edits and the existing structure "
            "where they still fit, and change only what the diagram requires.\n"
        )
        for f in previous_files:
            text += f"\n=== FILE: {f['path']} ===\n{f['content']}\n=== END FILE ===\n"
    else:
        text += "\nGenerate the project now.\n"

    content: list[dict] = [{"type": "text", "text": text}]
    if send_image and image:
        content.insert(0, {"type": "text", "text": "Here is the drawing itself:"})
        content.insert(1, {"type": "image_url", "image_url": {"url": image}})
    return content


async def stream_code(
    model: ModelOption,
    mode: str,
    graph: dict,
    image: str | None,
    notes: str,
    previous_files: list[dict],
) -> AsyncIterator[str]:
    messages = [
        {"role": "system", "content": system_prompt(mode)},
        {"role": "user", "content": user_content(graph, image, notes, previous_files, model.vision)},
    ]
    response = await litellm.acompletion(
        model=model.id,
        messages=messages,
        stream=True,
        max_tokens=model.max_tokens,
    )
    async for chunk in response:
        delta = chunk.choices[0].delta.content if chunk.choices else None
        if delta:
            yield delta
