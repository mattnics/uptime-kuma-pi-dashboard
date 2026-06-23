#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
PORT="${PORT:-3080}"
URL="http://127.0.0.1:${PORT}"
MAX_WAIT_SECONDS="${MAX_WAIT_SECONDS:-60}"

if [[ -f "${APP_DIR}/.env" ]]; then
  # shellcheck disable=SC1091
  source "${APP_DIR}/.env"
  PORT="${PORT:-3080}"
  URL="http://127.0.0.1:${PORT}"
fi

find_chromium() {
  for candidate in chromium chromium-browser google-chrome google-chrome-stable; do
    if command -v "${candidate}" >/dev/null 2>&1; then
      echo "${candidate}"
      return 0
    fi
  done
  return 1
}

wait_for_server() {
  local elapsed=0
  echo "Waiting for dashboard at ${URL} ..."
  while (( elapsed < MAX_WAIT_SECONDS )); do
    if curl -fsS "${URL}/health" >/dev/null 2>&1; then
      echo "Dashboard is ready."
      return 0
    fi
    sleep 1
    elapsed=$((elapsed + 1))
  done
  echo "Dashboard did not start within ${MAX_WAIT_SECONDS}s." >&2
  echo "Start it with: cd ${APP_DIR} && npm start" >&2
  return 1
}

CHROMIUM="$(find_chromium || true)"
if [[ -z "${CHROMIUM}" ]]; then
  echo "Chromium not found. Install it with: sudo apt install chromium-browser" >&2
  exit 1
fi

wait_for_server

if command -v unclutter >/dev/null 2>&1; then
  unclutter -idle 3 -root >/dev/null 2>&1 &
fi

exec "${CHROMIUM}" \
  --kiosk \
  --noerrdialogs \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --disable-translate \
  --check-for-update-interval=31536000 \
  --disable-features=TranslateUI \
  --app="${URL}"
