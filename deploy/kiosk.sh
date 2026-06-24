#!/bin/bash
# Pi kiosk launcher — waits for the dashboard server, then opens Chromium.
# Override URL: KIOSK_URL=http://127.0.0.1:3080 ./kiosk.sh

KIOSK_URL="${KIOSK_URL:-http://127.0.0.1:3080}"
MAX_WAIT_SECONDS="${MAX_WAIT_SECONDS:-90}"

find_chromium() {
  for candidate in /usr/bin/chromium-browser /usr/bin/chromium; do
    if [[ -x "${candidate}" ]]; then
      echo "${candidate}"
      return 0
    fi
  done
  return 1
}

wait_for_dashboard() {
  local elapsed=0
  echo "Waiting for dashboard at ${KIOSK_URL} ..."
  while (( elapsed < MAX_WAIT_SECONDS )); do
    if curl -fsS "${KIOSK_URL}/health" >/dev/null 2>&1; then
      echo "Dashboard is ready."
      return 0
    fi
    sleep 1
    elapsed=$((elapsed + 1))
  done
  echo "Dashboard did not respond within ${MAX_WAIT_SECONDS}s." >&2
  return 1
}

CHROMIUM="$(find_chromium || true)"
if [[ -z "${CHROMIUM}" ]]; then
  echo "Chromium not found." >&2
  exit 1
fi

# Bookworm: network + systemd may need more than a fixed sleep.
wait_for_dashboard || true

echo "Hiding the mouse cursor..."
if command -v unclutter >/dev/null 2>&1; then
  unclutter -idle 0.1 -root &
fi

echo "Starting Chromium..."
exec "${CHROMIUM}" \
  --kiosk \
  --app="${KIOSK_URL}" \
  --noerrdialogs \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --disable-translate \
  --no-first-run \
  --no-default-browser-check \
  --disable-dev-shm-usage \
  --check-for-update-interval=31536000 \
  --disable-gpu \
  --disable-gpu-compositing
