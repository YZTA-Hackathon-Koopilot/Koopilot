#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"

PIDS=()

cleanup() {
  echo
  echo "Koopilot kapatılıyor..."
  for pid in "${PIDS[@]:-}"; do
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
    fi
  done
}

trap cleanup EXIT INT TERM

load_nvm_if_needed() {
  if command -v npm >/dev/null 2>&1; then
    return
  fi

  if [ -s "$HOME/.nvm/nvm.sh" ]; then
    # shellcheck disable=SC1090
    . "$HOME/.nvm/nvm.sh"
  fi
}

find_backend_python() {
  if [ -x "$BACKEND_DIR/venv/bin/python" ]; then
    echo "$BACKEND_DIR/venv/bin/python"
  elif [ -x "$ROOT_DIR/.venv/bin/python" ]; then
    echo "$ROOT_DIR/.venv/bin/python"
  elif command -v python3 >/dev/null 2>&1; then
    command -v python3
  elif command -v python >/dev/null 2>&1; then
    command -v python
  else
    return 1
  fi
}

require_file() {
  if [ ! -f "$1" ]; then
    echo "Eksik dosya: $1"
    exit 1
  fi
}

open_browser() {
  local url="$1"

  if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$url" >/dev/null 2>&1 &
  elif command -v open >/dev/null 2>&1; then
    open "$url" >/dev/null 2>&1 &
  elif command -v cmd.exe >/dev/null 2>&1; then
    cmd.exe /c start "$url" >/dev/null 2>&1 &
  else
    echo "Tarayıcı otomatik açılamadı. Elle açın: $url"
  fi
}

wait_for_frontend_and_open() {
  local url="$1"

  for _ in {1..30}; do
    if curl -fsS "$url" >/dev/null 2>&1; then
      open_browser "$url"
      return
    fi
    sleep 1
  done

  echo "Frontend 30 saniye içinde hazır olmadı. Elle kontrol edin: $url"
}

require_file "$BACKEND_DIR/main.py"
require_file "$FRONTEND_DIR/package.json"

BACKEND_PYTHON="$(find_backend_python)" || {
  echo "Python bulunamadı. Backend için Python 3 ve sanal ortam kurulu olmalı."
  exit 1
}

load_nvm_if_needed
if ! command -v npm >/dev/null 2>&1; then
  echo "npm bulunamadı. Frontend için Node.js ve npm kurulu olmalı."
  exit 1
fi

if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
  echo "frontend/node_modules bulunamadı. Önce 'cd frontend && npm install' çalıştırın."
  exit 1
fi

if [ ! -f "$BACKEND_DIR/.env" ]; then
  echo "Uyarı: backend/.env bulunamadı. Gemini/Telegram gibi entegrasyonlar çalışmayabilir."
fi

echo "Koopilot başlatılıyor..."
echo "Backend:  http://127.0.0.1:$BACKEND_PORT"
echo "API Docs: http://127.0.0.1:$BACKEND_PORT/docs"
echo "Frontend: http://127.0.0.1:$FRONTEND_PORT"
echo

(
  cd "$BACKEND_DIR"
  "$BACKEND_PYTHON" -m uvicorn main:app --reload --port "$BACKEND_PORT"
) &
PIDS+=("$!")

(
  cd "$FRONTEND_DIR"
  npm run dev -- --host 127.0.0.1 --port "$FRONTEND_PORT"
) &
PIDS+=("$!")

wait_for_frontend_and_open "http://127.0.0.1:$FRONTEND_PORT/" &

wait -n "${PIDS[@]}"
