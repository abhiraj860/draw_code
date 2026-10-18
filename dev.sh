#!/usr/bin/env bash
# Starts the API (port 8000) and the frontend dev server (port 5173).
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -d backend/.venv ]; then
  echo "Setting up backend virtualenv…"
  if command -v uv >/dev/null; then
    uv venv -q backend/.venv --python 3.12
    uv pip install -q --python backend/.venv/bin/python -r backend/requirements.txt
  else
    python3 -m venv backend/.venv
    backend/.venv/bin/pip install -q -r backend/requirements.txt
  fi
fi
[ -d frontend/node_modules ] || (cd frontend && npm install)

trap 'kill 0' EXIT INT TERM
(cd backend && .venv/bin/uvicorn main:app --port 8000 --reload) &
(cd frontend && npm run dev -- --open) &
wait
