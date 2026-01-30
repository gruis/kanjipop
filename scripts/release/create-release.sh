#!/usr/bin/env bash
set -euo pipefail

# Create a GitHub release and upload the tarball (requires gh CLI)
# Usage:
#   ./scripts/release/create-release.sh v1.0.0
#
# Prereqs:
#   - gh CLI installed and authenticated: https://cli.github.com/
#   - tarball exists in dist/kanjipop-<tag>.tar.gz

TAG="${1:-}"

if [[ -z "$TAG" ]]; then
  echo "Usage: $0 <tag> (e.g., v1.0.0)"
  exit 1
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI not found. Install from https://cli.github.com/ and run: gh auth login"
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DIST_DIR="${ROOT_DIR}/dist"
TARBALL="${DIST_DIR}/kanjipop-${TAG}.tar.gz"

if [[ ! -f "$TARBALL" ]]; then
  echo "Tarball not found: $TARBALL"
  echo "Run ./scripts/release/package-release.sh ${TAG} first."
  exit 1
fi

echo "==> Creating GitHub release ${TAG}"
gh release create "$TAG" "$TARBALL" --title "$TAG" --notes "KanjiPop ${TAG}"
echo "==> Release created"
