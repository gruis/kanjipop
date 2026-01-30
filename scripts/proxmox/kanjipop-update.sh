#!/usr/bin/env bash

# Copyright (c) 2021-2026 community-scripts ORG
# License: MIT | https://github.com/community-scripts/ProxmoxVE/raw/main/LICENSE

if [[ -z "${FUNCTIONS_FILE_PATH:-}" ]]; then
  if command -v curl >/dev/null 2>&1; then
    FUNCTIONS_FILE_PATH="$(curl -fsSL https://raw.githubusercontent.com/community-scripts/ProxmoxVE/main/misc/install.func)"
  else
    FUNCTIONS_FILE_PATH="$(wget -qO- https://raw.githubusercontent.com/community-scripts/ProxmoxVE/main/misc/install.func)"
  fi
fi
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
APP_DIR="${APP_DIR:-/opt/kanjipop}"
VERSION_FILE="${VERSION_FILE:-/opt/kanjipop_version.txt}"

if [[ -z "$APP_REPO" ]]; then
  msg_error "APP_REPO is required."
  exit 1
fi

if [[ ! -d "$APP_DIR/.output" && ! -f "$VERSION_FILE" ]]; then
  msg_error "No KanjiPop installation found."
  exit 1
fi

NODE_VERSION="20" NODE_MODULE="npm" setup_nodejs
RELEASE=$(get_latest_github_release "$APP_REPO")
CURRENT_VERSION=""
[[ -f "$VERSION_FILE" ]] && CURRENT_VERSION=$(cat "$VERSION_FILE")

prune_app_dir() {
  find "$APP_DIR" -mindepth 1 -maxdepth 1 \
    \( -name data -o -name public \) -prune -o -exec rm -rf {} +
  if [[ -d "$APP_DIR/public" ]]; then
    find "$APP_DIR/public" -mindepth 1 -maxdepth 1 \
      -name kanjisvg -prune -o -exec rm -rf {} +
  fi
  if [[ -d "$APP_DIR/data" ]]; then
    find "$APP_DIR/data" -mindepth 1 -maxdepth 1 \
      -name db -prune -o -exec rm -rf {} +
  fi
}

if [[ "$CURRENT_VERSION" != "$RELEASE" ]]; then
  msg_info "Stopping Service"
  systemctl stop kanjipop
  msg_ok "Stopped Service"

  msg_info "Updating KanjiPop to ${RELEASE}"
  export APP_TAG="$RELEASE"
  RELEASE_FETCH="$RELEASE"
  if [[ "$RELEASE_FETCH" != v* ]]; then
    RELEASE_FETCH="v${RELEASE_FETCH}"
  fi
  export APP_ASSET="${APP_ASSET:-kanjipop-${RELEASE_FETCH}.tar.gz}"
  prune_app_dir
  CLEAN_INSTALL=0 fetch_and_deploy_gh_release "kanjipop" "$APP_REPO" "prebuild" "$RELEASE_FETCH" "$APP_DIR" "$APP_ASSET"

  msg_info "Installing production dependencies"
  cd "$APP_DIR"
  $STD npm ci --omit=dev
  rm -rf "$APP_DIR/.output/server/node_modules" "$APP_DIR/.output/node_modules"
  echo "$RELEASE" >"$VERSION_FILE"
  msg_ok "Updated KanjiPop"

  msg_info "Starting Service"
  systemctl start kanjipop
  msg_ok "Started Service"
  msg_ok "Updated successfully!"
else
  msg_ok "No update required. KanjiPop is already at ${RELEASE}"
fi
