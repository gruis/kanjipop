#!/usr/bin/env bash
set -euo pipefail

# Host-side KanjiPop backup helper (SQLite-safe)
# Usage:
#   export CT_ID=123
#   export BACKUP_DIR="/var/lib/kanjipop/backups"
#   export RETAIN=10
#   ./scripts/proxmox/kanjipop-backup.sh

CT_ID="${CT_ID:-}"
BACKUP_DIR="${BACKUP_DIR:-/var/lib/kanjipop/backups}"
RETAIN="${RETAIN:-10}"
DB_PATH="${DB_PATH:-/opt/kanjipop/data/db/kanji-cache.sqlite}"

if [[ -z "$CT_ID" ]]; then
  echo "CT_ID is required."
  exit 1
fi

timestamp="$(date +%F-%H%M%S)"
tmp_path="/opt/kanjipop/data/db/kanji-cache.sqlite.bak"
dest_path="${BACKUP_DIR}/kanji-cache-${timestamp}.sqlite"

mkdir -p "$BACKUP_DIR"

echo "Creating SQLite-safe backup inside container..."
pct exec "$CT_ID" -- sqlite3 "$DB_PATH" ".backup '${tmp_path}'"

echo "Copying backup to host..."
cp -a "/var/lib/kanjipop/data/db/kanji-cache.sqlite.bak" "$dest_path"

echo "Cleaning up temporary backup in container..."
pct exec "$CT_ID" -- rm -f "$tmp_path"

if [[ "$RETAIN" -gt 0 ]]; then
  ls -1t "$BACKUP_DIR"/kanji-cache-*.sqlite 2>/dev/null | tail -n +"$((RETAIN + 1))" | xargs -r rm -f
fi

echo "Backup complete: $dest_path"
