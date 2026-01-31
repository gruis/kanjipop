#!/bin/sh
set -e

# If SVGs are stored on the data volume, link them into public/ for serving.
if [ -d "/app/data/kanjisvg" ]; then
  mkdir -p /app/public
  rm -rf /app/public/kanjisvg
  ln -s /app/data/kanjisvg /app/public/kanjisvg
fi

exec node .output/server/index.mjs
