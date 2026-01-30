#!/usr/bin/env bash

# Copyright (c) 2021-2026 community-scripts ORG
# License: MIT | https://github.com/community-scripts/ProxmoxVE/raw/main/LICENSE

source /dev/stdin <<<"$FUNCTIONS_FILE_PATH"
color
verb_ip6
catch_errors
setting_up_container
network_check
update_os

APP_DIR="${APP_DIR:-/opt/kanjipop}"
DATA_DIR="${DATA_DIR:-/opt/kanjipop/data/db}"
KANJISVG_DIR="${KANJISVG_DIR:-/opt/kanjipop/public/kanjisvg}"
VERSION_FILE="${VERSION_FILE:-/opt/kanjipop_version.txt}"
PRESERVE_DATA="${PRESERVE_DATA:-yes}"
PRESERVE_KANJISVG="${PRESERVE_KANJISVG:-yes}"

msg_info "Stopping Service"
systemctl stop kanjipop 2>/dev/null || true
systemctl disable kanjipop 2>/dev/null || true
rm -f /etc/systemd/system/kanjipop.service
systemctl daemon-reload
msg_ok "Service removed"

msg_info "Removing application files"
rm -rf "$APP_DIR/.output" "$APP_DIR/node_modules" "$APP_DIR/package.json" "$APP_DIR/package-lock.json"
rm -f "$VERSION_FILE"
msg_ok "Application files removed"

if [[ "$PRESERVE_DATA" != "yes" ]]; then
  msg_info "Removing database"
  rm -rf "$DATA_DIR"
  msg_ok "Database removed"
else
  msg_ok "Database preserved (${DATA_DIR})"
fi

if [[ "$PRESERVE_KANJISVG" != "yes" ]]; then
  msg_info "Removing KanjiVG assets"
  rm -rf "$KANJISVG_DIR"
  msg_ok "KanjiVG assets removed"
else
  msg_ok "KanjiVG assets preserved (${KANJISVG_DIR})"
fi

msg_ok "Uninstall complete"
