#!/usr/bin/env bash
# LAN-exposed variant of start_dev.sh -- backend stays on 127.0.0.1 (Vite's own dev-server proxy
# forwards /api/* to it server-side, see vite.config.js), only the Vite dev server itself needs
# --host to be reachable from a phone on the same LAN.
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

(cd frontend && npm run dev -- --host) &

wait
