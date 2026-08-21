#!/bin/sh
set -eu

runtime_env=/tmp/first30-runtime.env
: > "$runtime_env"

if [ -n "${SESSION_SECRET:-}" ]; then
  printf 'SESSION_SECRET=%s\n' "$SESSION_SECRET" >> "$runtime_env"
fi
if [ -n "${OPENAI_API_KEY:-}" ]; then
  printf 'OPENAI_API_KEY=%s\n' "$OPENAI_API_KEY" >> "$runtime_env"
fi
if [ -n "${OPENAI_MODEL:-}" ]; then
  printf 'OPENAI_MODEL=%s\n' "$OPENAI_MODEL" >> "$runtime_env"
fi

exec /app/node_modules/.bin/wrangler dev \
  --config /app/dist/server/wrangler.json \
  --ip 0.0.0.0 \
  --port 3000 \
  --local \
  --persist-to /app/.wrangler/state \
  --env-file "$runtime_env" \
  --log-level warn \
  --show-interactive-dev-session=false
