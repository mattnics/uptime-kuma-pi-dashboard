#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-3080}"
BASE="http://127.0.0.1:${PORT}"

echo "=== Pi dashboard diagnostics ==="
echo

echo "1. Node version"
node --version || echo "Node is not installed"
echo

echo "2. Health check (${BASE}/health)"
curl -fsS "${BASE}/health" && echo || echo "FAILED - server is not running"
echo

echo "3. Config (${BASE}/api/config)"
curl -fsS "${BASE}/api/config" && echo || echo "FAILED"
echo

echo "4. Status (${BASE}/api/status)"
curl -fsS "${BASE}/api/status" | head -c 400 && echo || echo "FAILED"
echo

echo "5. Static files"
for file in / /styles.css /app.js; do
  code="$(curl -s -o /dev/null -w "%{http_code}" "${BASE}${file}")"
  echo "${file} -> HTTP ${code}"
done
echo

echo "6. Chromium binary"
for candidate in chromium chromium-browser; do
  if command -v "${candidate}" >/dev/null 2>&1; then
    echo "Found: ${candidate}"
  fi
done
