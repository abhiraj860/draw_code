# draw_code

Draw a system design in Excalidraw, press **Ctrl+Enter**, and get Python code you can run in the built-in terminal. Works with Claude, OpenAI, Gemini, Groq, DeepSeek, OpenRouter, any other [LiteLLM](https://docs.litellm.ai/docs/providers) model, and local Ollama models.

```
┌─────────────────────┬─────────────────────┐
│                     │  main.py  utils.py  │
│     Excalidraw      │  Monaco editor      │
│   (your design)     ├─────────────────────┤
│                     │  ▶ Run   Terminal   │
└─────────────────────┴─────────────────────┘
```

## Quick start

Needs Python 3.12+ and Node 20+.

```bash
cp .env.example .env     # then add at least one API key
./dev.sh                 # installs everything on first run, opens http://localhost:5173
```

If you have [Ollama](https://ollama.com) running, its models appear automatically and no key is needed. Small local models (3B to 8B) write weaker code than Claude or GPT.

## Using it

1. Draw boxes for components and arrows between them. Double-click a shape or an arrow to type a label. Click **Example** to load a sample design.
2. Choose a **Model** and an **Output** mode, and add optional **Notes** (e.g. "use a token bucket rate limiter").
3. Press **Ctrl+Enter** (⌘+Enter on Mac) to generate. The code streams into the editor.
4. Press **▶ Run** (Ctrl+Shift+Enter) to run `main.py`. The terminal is interactive, so `input()` works. **Shell** opens bash in the same workspace, e.g. for `pip install -r requirements.txt`.
5. Change the drawing and press Ctrl+Enter again. With **Update existing code** checked, the model updates your current files (keeping your edits) instead of starting over.

Your drawing, files and settings are saved in the browser.

### Output modes

| Mode | What you get |
|---|---|
| Simulation | One `main.py` (standard library only) that simulates your architecture with asyncio and prints a trace of every request hop and a summary. Runs immediately. |
| Clean modules | A package with one module per component, `Protocol` interfaces, in-memory infrastructure, a demo in `main.py` and `unittest` tests. |
| FastAPI services | One FastAPI app per service, calling each other over HTTP, plus `requirements.txt` and `docker-compose.yml`. Run `pip install -r requirements.txt` in Shell first. |

The prompts live in [backend/prompts/](backend/prompts/). Edit them to change the style of the generated code, or add a new mode (add a `.md` file, register it in `MODES` in [backend/llm.py](backend/llm.py) and in [frontend/src/lib/types.ts](frontend/src/lib/types.ts)).

## How it works

1. [sceneToGraph.ts](frontend/src/lib/sceneToGraph.ts) turns the drawing into a graph: shapes become nodes, arrows become edges, and text becomes labels or notes. It also handles text placed over a shape without being attached, arrows whose ends aren't attached to a shape, arrow direction, and boxes drawn inside other boxes (e.g. a "VPC").
2. The graph, plus a PNG of the drawing for models that can read images, goes to `POST /api/generate`. The backend calls the model through LiteLLM and streams the reply back.
3. The model answers in `=== FILE: path ===` blocks, which [parseFiles.ts](frontend/src/lib/parseFiles.ts) turns into editor tabs as the text arrives.
4. **Run** sends the files over the `/api/terminal` WebSocket. [runner.py](backend/runner.py) writes them to a temporary workspace, starts Python in a pseudo-terminal, and streams the output to xterm.js.

## Configuration (`.env`)

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, `GROQ_API_KEY`, `DEEPSEEK_API_KEY`, `OPENROUTER_API_KEY` | Enables that provider's models in the picker. |
| `EXTRA_MODELS` | Comma-separated LiteLLM model ids to add, e.g. `mistral/mistral-large-latest`. |
| `OLLAMA_API_BASE` | Ollama URL (default `http://localhost:11434`). |
| `RUNNER` | `local` (default) runs code as a subprocess in a separate virtualenv. `docker` runs it in a throwaway `python:3.12-slim` container with no network, 512 MB RAM and 1 CPU. |

The built-in model list is in [backend/config.py](backend/config.py).

## Safety

The code you run is written by an LLM. With `RUNNER=local` it runs on your machine as your user. It can't see your API keys, but it can access your files, so use local mode only for your own testing. Use `RUNNER=docker` for real isolation. In Docker mode the container has no network, so `pip install` doesn't work there; add packages to a custom `DOCKER_IMAGE` instead.

## Single-server mode

```bash
cd frontend && npm run build
cd ../backend && .venv/bin/uvicorn main:app --port 8000
```

The backend then serves the built frontend at http://localhost:8000.

## Project layout

```
backend/
  main.py        FastAPI: /api/models, /api/generate, /api/terminal (WebSocket)
  llm.py         prompt building + LiteLLM streaming
  runner.py      pseudo-terminal sessions, local or Docker
  config.py      model list and settings
  prompts/       system prompts per output mode
frontend/src/
  App.tsx        layout, toolbar, generate/run flow, shortcuts
  components/    DiagramPanel (Excalidraw), EditorPanel (Monaco), TerminalPanel (xterm.js)
  lib/           sceneToGraph, parseFiles, API client, example diagram
```
