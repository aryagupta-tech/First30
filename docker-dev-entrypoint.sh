#!/bin/sh
set -eu

stamp_path="node_modules/.first30-package-lock.sha256"
current_hash="$(sha256sum package-lock.json | cut -d ' ' -f 1)"
installed_hash=""

if [ -f "$stamp_path" ]; then
  installed_hash="$(sed -n '1p' "$stamp_path")"
fi

if [ "$installed_hash" != "$current_hash" ] || [ ! -f node_modules/tesseract.js/dist/worker.min.js ]; then
  echo "Synchronizing container dependencies with package-lock.json..."
  npm ci
  printf '%s\n' "$current_hash" > "$stamp_path"
fi

exec npm run dev -- --hostname 0.0.0.0 --port 3000
