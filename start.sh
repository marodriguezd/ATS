#!/bin/bash
# ATS Resume Suite: reproducible local setup.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT/backend"
VENV="$BACKEND_DIR/venv"

need() { command -v "$1" >/dev/null 2>&1 || { echo "Missing prerequisite: $1" >&2; exit 1; }; }
need python3
need pnpm

echo "==> Backend: creating virtualenv + installing deps"
if [ ! -d "$VENV" ]; then
  python3 -m venv "$VENV"
fi
"$VENV/bin/pip" install --upgrade pip
"$VENV/bin/pip" install -r "$BACKEND_DIR/requirements.txt"

echo "==> Frontend: installing deps"
pnpm --prefix "$ROOT/frontend" install

start_backend() {
  cd "$ROOT"
  ./backend/venv/bin/uvicorn app.main:app --app-dir ./backend --host 127.0.0.1 --port 8000
}
start_frontend() {
  pnpm --prefix "$ROOT/frontend" dev
}

if [ "${1:-}" = "--backend-only" ]; then start_backend; exit 0; fi
if [ "${1:-}" = "--frontend-only" ]; then start_frontend; exit 0; fi

echo "==> Starting backend (127.0.0.1:8000) and frontend (:3000)"
"$VENV/bin/uvicorn" app.main:app --app-dir ./backend --host 127.0.0.1 --port 8000 &
BACKEND_PID=$!
pnpm --prefix "$ROOT/frontend" dev &
FRONTEND_PID=$!

cleanup() {
  echo ""
  echo "Stopping ATS Resume Suite..."
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
  wait 2>/dev/null || true
}
trap cleanup INT TERM EXIT

echo ""
echo "Frontend: http://localhost:3000"
echo "Backend:  http://127.0.0.1:8000  (docs: /docs)"
echo "Press Ctrl+C to stop."
wait
