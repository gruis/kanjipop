#!/usr/bin/env bash
source <(curl -fsSL https://raw.githubusercontent.com/community-scripts/ProxmoxVE/main/misc/build.func)
# Copyright (c) 2021-2026 community-scripts ORG
# License: MIT | https://github.com/community-scripts/ProxmoxVE/raw/main/LICENSE
# Source: https://github.com/community-scripts/ProxmoxVE

APP="KanjiPop"
var_tags="${var_tags:-education}"
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
export INSTALL_SCRIPT_URL="${INSTALL_SCRIPT_URL:-}"

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
    export APP_ASSET="${APP_ASSET:-kanjipop-${RELEASE}.tar.gz}"
    CLEAN_INSTALL=1 fetch_and_deploy_gh_release "kanjipop" "$APP_REPO" "tarball"
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

function install_script() {
  # This overrides build.func's install_script to pull our installer from this repo.
  if [[ -z "$INSTALL_SCRIPT_URL" ]]; then
    msg_error "INSTALL_SCRIPT_URL is required."
    exit 1
  fi

  if command -v curl >/dev/null 2>&1; then
    export FUNCTIONS_FILE_PATH="$(curl -fsSL https://raw.githubusercontent.com/community-scripts/ProxmoxVE/main/misc/install.func)"
  else
    export FUNCTIONS_FILE_PATH="$(wget -qO- https://raw.githubusercontent.com/community-scripts/ProxmoxVE/main/misc/install.func)"
  fi

  export INSTALL_LOG="/root/.install-${SESSION_ID}.log"
  export APP_REPO APP_TAG APP_ASSET APP_PORT APP_DIR DATA_DIR KANJISVG_DIR VERSION_FILE

  # Install base packages inside container
  pct exec "$CTID" -- bash -c "apt-get update >/dev/null && apt-get install -y sudo curl mc gnupg2 jq >/dev/null" || {
    msg_error "apt-get base packages installation failed"
    exit 1
  }

  # Run application installer inside container
  lxc-attach -n "$CTID" -- bash -c "$(curl -fsSL "$INSTALL_SCRIPT_URL")"
}

start
build_container
description

msg_ok "Completed successfully!"
