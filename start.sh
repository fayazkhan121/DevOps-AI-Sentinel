#!/bin/bash
set -euo pipefail

echo "DevOps AI Sentinel"
echo "=================="

if ! command -v node >/dev/null; then
  echo "ERROR: Node.js 22+ is required."
  exit 1
fi

if [ ! -d node_modules ]; then
  npm install
fi

if [ ! -f .env ]; then
  cp env.example .env
  echo "Created .env from env.example — set JWT_SECRET and ENCRYPTION_KEY before production use."
fi

echo "API: http://localhost:3000"
echo "UI:  http://localhost:5173"
exec npm run dev
