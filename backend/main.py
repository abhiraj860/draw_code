"""draw_code backend: code generation (LiteLLM) and a terminal for running it."""

import asyncio
import json
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

import config
import llm
from runner import Session, ensure_runner_venv

FRONTEND_DIST = config.ROOT / "frontend" / "dist"


@asynccontextmanager
async def lifespan(_: FastAPI):
    await asyncio.to_thread(ensure_runner_venv)
    yield


app = FastAPI(title="draw_code", lifespan=lifespan)


# -- models -----------------------------------------------------------------


@app.get("/api/models")
async def list_models():
    return {"models": await asyncio.to_thread(config.models_as_json), "runner": config.RUNNER}


# -- code generation --------------------------------------------------------


class FileIn(BaseModel):
    path: str
    content: str


class GenerateRequest(BaseModel):
    model: str
    mode: str = "simulation"
    graph: dict
    image: str | None = None  # PNG data URL of the drawing
    notes: str = ""
    previous_files: list[FileIn] = Field(default_factory=list)


@app.post("/api/generate")
async def generate(req: GenerateRequest):
    if req.mode not in llm.MODES:
        raise HTTPException(400, f"Unknown mode {req.mode!r}")
    try:
        model = await asyncio.to_thread(config.find_model, req.model)
    except KeyError:
        raise HTTPException(400, f"Model {req.model!r} is not available. Check your .env keys.")

    async def events():
        # Newline-delimited JSON: {"t": "delta" | "error" | "done", "d": ...}
        try:
            async for delta in llm.stream_code(
                model,
                req.mode,
                req.graph,
                req.image,
                req.notes,
                [f.model_dump() for f in req.previous_files],
            ):
                yield json.dumps({"t": "delta", "d": delta}) + "\n"
            yield json.dumps({"t": "done"}) + "\n"
        except Exception as e:  # surface provider errors in the UI
            yield json.dumps({"t": "error", "d": f"{type(e).__name__}: {e}"}) + "\n"

    return StreamingResponse(events(), media_type="application/x-ndjson")


# -- terminal ---------------------------------------------------------------
#
# Client -> server: {"type": "run", "files": [...], "entry": "main.py"}
#                   {"type": "shell", "files": [...]}
#                   {"type": "input", "data": "..."}
#                   {"type": "resize", "cols": 80, "rows": 24}
#                   {"type": "stop"}
# Server -> client: {"type": "output", "data": "..."}
#                   {"type": "started", "command": "..."}
#                   {"type": "exit", "code": 0}
#                   {"type": "error", "message": "..."}


@app.websocket("/api/terminal")
async def terminal(ws: WebSocket):
    await ws.accept()
    outbox: asyncio.Queue[dict] = asyncio.Queue()
    session = Session(
        on_output=lambda data: outbox.put_nowait({"type": "output", "data": data}),
        on_exit=lambda code: outbox.put_nowait({"type": "exit", "code": code}),
    )

    async def sender():
        while True:
            await ws.send_json(await outbox.get())

    send_task = asyncio.create_task(sender())
    try:
        while True:
            msg = await ws.receive_json()
            kind = msg.get("type")
            try:
                if kind in ("run", "shell"):
                    session.sync_files(msg.get("files", []))
                    if kind == "run":
                        entry = msg.get("entry") or "main.py"
                        command = ["python", str(Path(entry))]
                    else:
                        command = ["bash", "--noprofile", "--norc", "-i"]
                    await session.start(command)
                    outbox.put_nowait({"type": "started", "command": " ".join(command)})
                elif kind == "input":
                    session.write(msg.get("data", ""))
                elif kind == "resize":
                    session.resize(int(msg.get("cols", 80)), int(msg.get("rows", 24)))
                elif kind == "stop":
                    await session.stop()
            except Exception as e:
                outbox.put_nowait({"type": "error", "message": str(e)})
    except WebSocketDisconnect:
        pass
    finally:
        send_task.cancel()
        await session.close()


# -- frontend (production build) ---------------------------------------------

if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

    @app.get("/{path:path}")
    async def spa(path: str):
        file = (FRONTEND_DIST / path).resolve()
        if path and file.is_relative_to(FRONTEND_DIST) and file.is_file():
            return FileResponse(file)
        return FileResponse(FRONTEND_DIST / "index.html")
