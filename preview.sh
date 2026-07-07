#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
PORT="${1:-8080}"
DIR="$ROOT/shopify"

if [[ ! -f "$DIR/ysa-homepage.html" ]]; then
  echo "Error: shopify/ysa-homepage.html not found."
  echo "Run this script from the project root."
  exit 1
fi

echo ""
echo "  YSA Store Preview"
echo "  ================="
echo ""
echo "  Open in your browser:"
echo "    http://localhost:${PORT}/"
echo "    http://localhost:${PORT}/ysa-homepage.html"
echo ""
echo "  Press Ctrl+C to stop."
echo ""

cd "$DIR"
python3 -m http.server "$PORT"
