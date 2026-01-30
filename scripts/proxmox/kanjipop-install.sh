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

APP_REPO="${APP_REPO:-gruis/kanjipop}"
APP_TAG="${APP_TAG:-}"
APP_ASSET="${APP_ASSET:-}"
APP_PORT="${APP_PORT:-3000}"
APP_DIR="${APP_DIR:-/opt/kanjipop}"
DATA_DIR="${DATA_DIR:-/opt/kanjipop/data/db}"
KANJISVG_DIR="${KANJISVG_DIR:-/opt/kanjipop/public/kanjisvg}"
VERSION_FILE="${VERSION_FILE:-/opt/kanjipop_version.txt}"

if [[ -z "$APP_TAG" ]]; then
  msg_error "APP_TAG is required."
  exit 1
fi

if [[ -z "$APP_ASSET" ]]; then
  APP_ASSET="kanjipop-${APP_TAG}.tar.gz"
fi

msg_info "Installing dependencies"
$STD apt install -y unzip
msg_ok "Installed dependencies"

NODE_VERSION="20" NODE_MODULE="npm" setup_nodejs

msg_info "Preparing directories"
mkdir -p "$APP_DIR" "$DATA_DIR" "$KANJISVG_DIR"
msg_ok "Directories ready"

msg_info "Downloading release"
fetch_and_deploy_gh_release "kanjipop" "$APP_REPO" "tarball"
msg_ok "Release installed"

msg_info "Installing production dependencies"
cd "$APP_DIR"
$STD npm ci --omit=dev
msg_ok "Dependencies installed"

msg_info "Downloading KanjiVG assets"
curl -fsSL https://github.com/KanjiVG/kanjivg/releases/download/r20250816/kanjivg-20250816-all.zip -o /tmp/kanjivg.zip
unzip -q /tmp/kanjivg.zip -d /tmp/kanjivg
rm -rf "${KANJISVG_DIR:?}/"*
cp -R /tmp/kanjivg/kanjivg/kanji "$KANJISVG_DIR/kanji"
msg_ok "KanjiVG installed"

msg_info "Creating Service"
cat <<EOF >/etc/systemd/system/kanjipop.service
[Unit]
Description=KanjiPop (Nuxt)
After=network-online.target

[Service]
Type=simple
WorkingDirectory=${APP_DIR}
Environment=NODE_ENV=production
Environment=NITRO_HOST=0.0.0.0
Environment=NITRO_PORT=${APP_PORT}
ExecStart=/usr/bin/node ${APP_DIR}/.output/server/index.mjs
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
systemctl enable -q --now kanjipop
msg_ok "Created Service"

echo "$APP_TAG" >"$VERSION_FILE"

motd_ssh
customize
cleanup_lxc
