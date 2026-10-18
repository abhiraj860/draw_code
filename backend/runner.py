"""Runs the user's code in a real pseudo-terminal and streams it to the browser.

Each browser tab gets one Session with its own temporary workspace folder.
"""

import asyncio
import codecs
import fcntl
import os
import pty
import shutil
import signal
import struct
import subprocess
import sys
import tempfile
import termios
import uuid
from collections.abc import Callable
from pathlib import Path, PurePosixPath

from config import DOCKER_IMAGE, RUNNER

# A separate virtualenv for user code, so `pip install` in the terminal works
# and never touches the backend's own packages.
RUNNER_VENV = Path(__file__).resolve().parent / ".runner-venv"


def ensure_runner_venv() -> None:
    if RUNNER == "local" and not (RUNNER_VENV / "bin" / "python").exists():
        subprocess.run([sys.executable, "-m", "venv", str(RUNNER_VENV)], check=True)


def safe_relative(path: str) -> PurePosixPath:
    """Reject absolute paths and '..' so files stay inside the workspace."""
    p = PurePosixPath(path)
    if p.is_absolute() or ".." in p.parts or not p.parts:
        raise ValueError(f"Invalid file path: {path!r}")
    return p


def child_env() -> dict[str, str]:
    """A minimal environment: user code never sees the backend's API keys."""
    path = os.environ.get("PATH", "/usr/bin:/bin")
    if RUNNER == "local":
        path = f"{RUNNER_VENV / 'bin'}:{path}"
    return {
        "PATH": path,
        "HOME": os.environ.get("HOME", "/tmp"),
        "LANG": os.environ.get("LANG", "C.UTF-8"),
        "TERM": "xterm-256color",
        "COLORTERM": "truecolor",
        "PYTHONUNBUFFERED": "1",
        "VIRTUAL_ENV": str(RUNNER_VENV) if RUNNER == "local" else "",
        "PS1": r"\[\e[36m\]workspace\[\e[0m\] $ ",
    }


class Session:
    def __init__(self, on_output: Callable[[str], None], on_exit: Callable[[int], None]):
        self.workdir = Path(tempfile.mkdtemp(prefix="drawcode-"))
        self.on_output = on_output
        self.on_exit = on_exit
        self.proc: subprocess.Popen | None = None
        self.master_fd: int | None = None
        self.container: str | None = None
        self.synced: set[str] = set()
        self.rows, self.cols = 24, 80

    # -- files ------------------------------------------------------------

    def sync_files(self, files: list[dict]) -> None:
        """Write the editor's files to the workspace and delete removed ones."""
        incoming = set()
        for f in files:
            rel = safe_relative(f["path"])
            target = self.workdir / rel
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(f["content"])
            incoming.add(str(rel))
        for stale in self.synced - incoming:
            (self.workdir / stale).unlink(missing_ok=True)
        self.synced = incoming

    # -- process ----------------------------------------------------------

    def _argv(self, command: list[str]) -> list[str]:
        if RUNNER != "docker":
            return command
        self.container = f"drawcode-{uuid.uuid4().hex[:12]}"
        return [
            "docker", "run", "--rm", "-it",
            "--name", self.container,
            "--network", "none",
            "--memory", "512m", "--cpus", "1", "--pids-limit", "256",
            "--user", f"{os.getuid()}:{os.getgid()}",
            "-e", "HOME=/tmp", "-e", "PYTHONUNBUFFERED=1", "-e", "TERM=xterm-256color",
            "-v", f"{self.workdir}:/workspace", "-w", "/workspace",
            DOCKER_IMAGE, *command,
        ]

    async def start(self, command: list[str]) -> None:
        await self.stop()
        loop = asyncio.get_running_loop()
        if self.master_fd is not None:
            # Drop the previous run's terminal without reporting its exit.
            loop.remove_reader(self.master_fd)
            os.close(self.master_fd)
            self.master_fd = None
        master, slave = pty.openpty()
        self._set_winsize(master)
        self.proc = subprocess.Popen(
            self._argv(command),
            cwd=self.workdir,
            stdin=slave,
            stdout=slave,
            stderr=slave,
            env=child_env(),
            start_new_session=True,  # own process group, so Stop kills children too
            close_fds=True,
        )
        os.close(slave)
        self.master_fd = master
        decoder = codecs.getincrementaldecoder("utf-8")(errors="replace")

        def on_readable() -> None:
            try:
                data = os.read(master, 65536)
            except OSError:
                data = b""
            if data:
                self.on_output(decoder.decode(data))
                return
            # The pty closed: the process has exited.
            loop.remove_reader(master)
            os.close(master)
            if self.master_fd == master:
                self.master_fd = None
            proc = self.proc
            code = 0
            if proc:
                try:
                    code = proc.wait(timeout=2)
                except subprocess.TimeoutExpired:
                    os.killpg(proc.pid, signal.SIGKILL)
                    code = proc.wait()
            if self.proc is proc:
                self.proc = None
            self.on_exit(code)

        loop.add_reader(master, on_readable)

    def write(self, data: str) -> None:
        if self.master_fd is not None:
            os.write(self.master_fd, data.encode())

    def resize(self, cols: int, rows: int) -> None:
        self.cols, self.rows = max(cols, 2), max(rows, 2)
        if self.master_fd is not None:
            self._set_winsize(self.master_fd)
            if self.proc:
                try:
                    os.killpg(self.proc.pid, signal.SIGWINCH)
                except ProcessLookupError:
                    pass

    def _set_winsize(self, fd: int) -> None:
        fcntl.ioctl(fd, termios.TIOCSWINSZ, struct.pack("HHHH", self.rows, self.cols, 0, 0))

    async def stop(self) -> None:
        proc = self.proc
        if proc is None or proc.poll() is not None:
            return
        if self.container:
            subprocess.run(["docker", "kill", self.container], capture_output=True)
        for sig in (signal.SIGTERM, signal.SIGKILL):
            try:
                os.killpg(proc.pid, sig)
            except ProcessLookupError:
                return
            for _ in range(20):
                if proc.poll() is not None:
                    return
                await asyncio.sleep(0.05)

    async def close(self) -> None:
        await self.stop()
        shutil.rmtree(self.workdir, ignore_errors=True)
