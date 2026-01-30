#!/usr/bin/env bash
source <(curl -fsSL https://raw.githubusercontent.com/community-scripts/ProxmoxVE/main/misc/build.func)
# Copyright (c) 2021-2026 community-scripts ORG
# License: MIT | https://github.com/community-scripts/ProxmoxVE/raw/main/LICENSE
# Source: https://github.com/community-scripts/ProxmoxVE

APP="KanjiPop"
var_tags="${var_tags:-education;kanjipop}"
var_cpu="${var_cpu:-2}"
var_ram="${var_ram:-2048}"
var_disk="${var_disk:-8}"
var_os="${var_os:-debian}"
var_version="${var_version:-12}"
var_unprivileged="${var_unprivileged:-1}"

# REQUIRED: set before running
#   export APP_REPO="gruis/kanjipop"
#   export APP_TAG="v1.0.0"
#
# Optional:
#   export APP_ASSET="kanjipop-v1.0.0.tar.gz"
#   export APP_PORT="3000"
#   export APP_DIR="/opt/kanjipop"
#   export DATA_DIR="/opt/kanjipop/data/db"
#   export KANJISVG_DIR="/opt/kanjipop/public/kanjisvg"
#   export INSTALL_SCRIPT_URL="https://raw.githubusercontent.com/gruis/kanjipop/main/scripts/proxmox/kanjipop-install.sh"

export APP_REPO="${APP_REPO:-gruis/kanjipop}"
export APP_TAG="${APP_TAG:-}"
export APP_ASSET="${APP_ASSET:-}"
export APP_PORT="${APP_PORT:-3000}"
export APP_DIR="${APP_DIR:-/opt/kanjipop}"
export DATA_DIR="${DATA_DIR:-/opt/kanjipop/data/db}"
export KANJISVG_DIR="${KANJISVG_DIR:-/opt/kanjipop/public/kanjisvg}"
export VERSION_FILE="/opt/kanjipop_version.txt"
export INSTALL_SCRIPT_URL="${INSTALL_SCRIPT_URL:-https://raw.githubusercontent.com/${APP_REPO}/main/scripts/proxmox/kanjipop-install.sh}"
export CACHE_BUSTER="${CACHE_BUSTER:-}"
if [[ -z "$CACHE_BUSTER" ]]; then
  CACHE_BUSTER="$(date +%s)"
fi

header_info "$APP"
variables
color
catch_errors

if [[ -z "$APP_TAG" ]]; then
  msg_error "APP_TAG is required."
  echo "Example: APP_TAG=v1.0.0"
  exit 1
fi

if [[ -z "$INSTALL_SCRIPT_URL" ]]; then
  INSTALL_SCRIPT_URL="https://raw.githubusercontent.com/${APP_REPO}/main/scripts/proxmox/kanjipop-install.sh"
fi

function update_script() {
  header_info
  check_container_storage
  check_container_resources

  if [[ ! -d "$APP_DIR/.output" && ! -f "$VERSION_FILE" ]]; then
    msg_error "No ${APP} installation found!"
    exit 1
  fi

  NODE_VERSION="20" NODE_MODULE="npm" setup_nodejs
  RELEASE=$(get_latest_github_release "$APP_REPO")
  CURRENT_VERSION=""
  [[ -f "$VERSION_FILE" ]] && CURRENT_VERSION=$(cat "$VERSION_FILE")

  if [[ "$CURRENT_VERSION" != "$RELEASE" ]]; then
    msg_info "Stopping Service"
    systemctl stop kanjipop
    msg_ok "Stopped Service"

    msg_info "Updating ${APP} to ${RELEASE}"
    export APP_TAG="$RELEASE"
    RELEASE_FETCH="$RELEASE"
    if [[ "$RELEASE_FETCH" != v* ]]; then
      RELEASE_FETCH="v${RELEASE_FETCH}"
    fi
    export APP_ASSET="${APP_ASSET:-kanjipop-${RELEASE}.tar.gz}"
    CLEAN_INSTALL=1 fetch_and_deploy_gh_release "kanjipop" "$APP_REPO" "prebuild" "$RELEASE_FETCH" "$APP_DIR" "$APP_ASSET"
    cd "$APP_DIR"
    npm ci --omit=dev
    echo "$RELEASE" >"$VERSION_FILE"
    msg_ok "Updated ${APP} to ${RELEASE}"

    msg_info "Starting Service"
    systemctl start kanjipop
    msg_ok "Started Service"
    msg_ok "Updated successfully!"
  else
    msg_ok "No update required. ${APP} is already at ${RELEASE}"
  fi
  exit
}

# Patch build_container to use our installer URL while keeping the standard
# community-scripts creation flow (auto CTID, menus, etc.).
if declare -f build_container >/dev/null 2>&1; then
  INSTALL_WITH_CACHE="${INSTALL_SCRIPT_URL}?cb=${CACHE_BUSTER}"
  eval "$(declare -f build_container | sed \"s#https://raw.githubusercontent.com/community-scripts/ProxmoxVE/main/install/\\${var_install}.sh#${INSTALL_WITH_CACHE}#\")"
fi

start
build_container
description

msg_ok "Completed successfully!"
