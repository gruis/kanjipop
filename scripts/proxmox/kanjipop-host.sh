#!/usr/bin/env bash
set -euo pipefail

# Unified host-side helper for KanjiPop LXC management
# Usage:
#   export CT_ID=123
#   export CT_HOSTNAME=kanjipop
#   export APP_REPO="gruis/kanjipop"
#   ./scripts/proxmox/kanjipop-host.sh status
#   ./scripts/proxmox/kanjipop-host.sh start
#   ./scripts/proxmox/kanjipop-host.sh stop
#   ./scripts/proxmox/kanjipop-host.sh restart
#   ./scripts/proxmox/kanjipop-host.sh logs
#   ./scripts/proxmox/kanjipop-host.sh update
#   ./scripts/proxmox/kanjipop-host.sh uninstall

CT_ID="${CT_ID:-}"
CT_HOSTNAME="${CT_HOSTNAME:-kanjipop}"
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
  CT_ID=$(pct list | awk -v hn="$CT_HOSTNAME" 'NR>1 && $2==hn {print $1}')
fi

if [[ -z "$CT_ID" ]]; then
  while read -r id name; do
    if pct status "$id" | grep -q "status: running"; then
      if pct exec "$id" -- test -f /etc/systemd/system/kanjipop.service 2>/dev/null; then
        CT_ID="$id"
        break
      fi
    fi
  done < <(pct list | awk 'NR>1 {print $1, $2}')
fi

if [[ -z "$CT_ID" ]]; then
  while read -r id; do
    if pct config "$id" 2>/dev/null | grep -qiE '^tags:.*\bkanjipop\b'; then
      CT_ID="$id"
      break
    fi
  done < <(pct list | awk 'NR>1 {print $1}')
fi

if [[ -z "$CT_ID" ]]; then
  echo "CT_ID not set and could not auto-detect a running KanjiPop container."
  echo "Set CT_ID explicitly or set CT_HOSTNAME to match the container name."
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
    pct exec "$CT_ID" -- bash -lc "export APP_REPO='$APP_REPO'; export APP_ASSET='$APP_ASSET'; bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/${APP_REPO}/main/scripts/proxmox/kanjipop-update.sh?cb=$(date +%s))\""
    ;;
  uninstall)
    if [[ -z "$APP_REPO" ]]; then
      echo "APP_REPO is required for uninstall."
      exit 1
    fi
    pct exec "$CT_ID" -- bash -lc "export PRESERVE_DATA='$PRESERVE_DATA'; export PRESERVE_KANJISVG='$PRESERVE_KANJISVG'; bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/${APP_REPO}/main/scripts/proxmox/kanjipop-uninstall.sh?cb=$(date +%s))\""
    ;;
  *)
    echo "Usage: $0 {status|start|stop|restart|logs|update|uninstall}"
    exit 1
    ;;
esac
