#!/usr/bin/env bash
# Usage:
#   ./scripts/bump-version.sh          # patch: 0.0.5 -> 0.0.6
#   ./scripts/bump-version.sh minor    # minor: 0.0.5 -> 0.1.0
#   ./scripts/bump-version.sh 1.2.3    # exact: set to 1.2.3

set -euo pipefail

PKG="package.json"
CURRENT=$(grep -o '"version": "[^"]*"' "$PKG" | head -1 | cut -d'"' -f4)

if [ -z "$CURRENT" ]; then
  echo "error: could not read version from $PKG" >&2
  exit 1
fi

IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT"

case "${1:-patch}" in
  patch)
    PATCH=$((PATCH + 1))
    NEXT="$MAJOR.$MINOR.$PATCH"
    ;;
  minor)
    MINOR=$((MINOR + 1))
    PATCH=0
    NEXT="$MAJOR.$MINOR.$PATCH"
    ;;
  [0-9]*.*)
    NEXT="$1"
    ;;
  *)
    echo "usage: $0 [patch|minor|x.y.z]" >&2
    exit 1
    ;;
esac

# Platform-safe in-place sed
if [[ "$OSTYPE" == darwin* ]]; then
  sed -i '' "s/\"version\": \"$CURRENT\"/\"version\": \"$NEXT\"/" "$PKG"
else
  sed -i "s/\"version\": \"$CURRENT\"/\"version\": \"$NEXT\"/" "$PKG"
fi

echo "$CURRENT -> $NEXT"
