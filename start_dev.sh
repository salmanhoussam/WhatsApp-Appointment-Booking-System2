#!/usr/bin/env bash
# Ubuntu equivalent of the old Windows start_dev.bat
# Starts FastAPI backend (venv + uvicorn) and the React/Vite frontend together.
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ ! -d "venv" ]; then
  echo "venv/ not found — run: python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt"
  exit 1
fi

source venv/bin/activate

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

cleanup() {
  echo "Stopping backend and frontend..."
  kill 0
}
trap cleanup EXIT INT TERM

uvicorn app.main:app --reload --port "${PORT:-8000}" &

(cd frontend && npm run dev) &

wait
