#!/usr/bin/env bash
set -euo pipefail

# Build and package a GitHub Release tar.gz
# Usage:
#   ./scripts/release/package-release.sh v1.0.0
#
# Output:
#   dist/kanjipop-v1.0.0.tar.gz

TAG="${1:-}"
VERSION="${TAG#v}"

if [[ -z "$TAG" ]]; then
  echo "Usage: $0 <tag> (e.g., v1.0.0)"
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DIST_DIR="${ROOT_DIR}/dist"
TARBALL="${DIST_DIR}/kanjipop-${TAG}.tar.gz"

cd "$ROOT_DIR"

echo "==> Setting package version to ${VERSION}"
npm version --no-git-tag-version "$VERSION"

echo "==> Installing deps"
npm ci

echo "==> Building"
npm run build

echo "==> Writing app-version.json"
GIT_DESCRIBE="$(git describe --tags --always --dirty 2>/dev/null || echo \"$TAG\")"
BUILD_TIME="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
cat > app-version.json <<EOF
{
  "tag": "${TAG}",
  "version": "${VERSION}",
  "gitDescribe": "${GIT_DESCRIBE}",
  "buildTime": "${BUILD_TIME}"
}
EOF

echo "==> Packaging"
export COPYFILE_DISABLE=1
mkdir -p "$DIST_DIR"
tar --no-xattrs -czf "$TARBALL" .output package.json package-lock.json public app-version.json

echo "==> Done: ${TARBALL}"
