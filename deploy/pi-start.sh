#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${APP_DIR}"

if [[ ! -f ".env" ]]; then
  echo "Missing .env file. Copy .env.example to .env and set STATUS_PAGE_SLUG." >&2
  exit 1
fi

if [[ ! -d "node_modules" ]]; then
  echo "Installing dependencies..."
  npm install
fi

echo "Starting dashboard server..."
npm start
