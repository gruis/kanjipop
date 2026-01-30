#!/usr/bin/env bash
set -euo pipefail

# Unified host-side helper for KanjiPop LXC management
# Usage:
#   export CT_ID=123
#   export APP_REPO="gruis/kanjipop"
#   ./scripts/proxmox/kanjipop-host.sh status
#   ./scripts/proxmox/kanjipop-host.sh start
#   ./scripts/proxmox/kanjipop-host.sh stop
#   ./scripts/proxmox/kanjipop-host.sh restart
#   ./scripts/proxmox/kanjipop-host.sh logs
#   ./scripts/proxmox/kanjipop-host.sh update
#   ./scripts/proxmox/kanjipop-host.sh uninstall

CT_ID="${CT_ID:-}"
APP_REPO="${APP_REPO:-gruis/kanjipop}"
APP_ASSET="${APP_ASSET:-}"
PRESERVE_DATA="${PRESERVE_DATA:-yes}"
PRESERVE_KANJISVG="${PRESERVE_KANJISVG:-yes}"

cmd="${1:-}"
arg_ct="${2:-}"

if [[ -n "$arg_ct" && -z "$CT_ID" ]]; then
  CT_ID="$arg_ct"
fi

if [[ -z "$CT_ID" ]]; then
  echo "CT_ID is required (env CT_ID or second argument)."
  exit 1
fi

case "$cmd" in
  status)
    pct exec "$CT_ID" -- systemctl status kanjipop --no-pager
    ;;
  start)
    pct exec "$CT_ID" -- systemctl start kanjipop
    echo "Started kanjipop in CT ${CT_ID}"
    ;;
  stop)
    pct exec "$CT_ID" -- systemctl stop kanjipop
    echo "Stopped kanjipop in CT ${CT_ID}"
    ;;
  restart)
    pct exec "$CT_ID" -- systemctl restart kanjipop
    echo "Restarted kanjipop in CT ${CT_ID}"
    ;;
  logs)
    pct exec "$CT_ID" -- journalctl -u kanjipop -f --no-pager
    ;;
  update)
    if [[ -z "$APP_REPO" ]]; then
      echo "APP_REPO is required for update."
      exit 1
    fi
    pct exec "$CT_ID" -- bash -lc "export APP_REPO='$APP_REPO'; export APP_ASSET='$APP_ASSET'; bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/${APP_REPO}/main/scripts/proxmox/kanjipop-update.sh)\""
    ;;
  uninstall)
    if [[ -z "$APP_REPO" ]]; then
      echo "APP_REPO is required for uninstall."
      exit 1
    fi
    pct exec "$CT_ID" -- bash -lc "export PRESERVE_DATA='$PRESERVE_DATA'; export PRESERVE_KANJISVG='$PRESERVE_KANJISVG'; bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/${APP_REPO}/main/scripts/proxmox/kanjipop-uninstall.sh)\""
    ;;
  *)
    echo "Usage: $0 {status|start|stop|restart|logs|update|uninstall}"
    exit 1
    ;;
esac
