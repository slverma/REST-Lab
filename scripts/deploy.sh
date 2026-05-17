#!/usr/bin/env bash
# Usage: ./scripts/deploy.sh [patch|minor|major]   (default: patch)
set -euo pipefail

BUMP="${1:-patch}"
if [[ "$BUMP" != "patch" && "$BUMP" != "minor" && "$BUMP" != "major" ]]; then
  echo "Usage: $0 [patch|minor|major]"
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Error: working tree is dirty. Commit or stash changes first."
  exit 1
fi

if [[ "$(git rev-parse --abbrev-ref HEAD)" != "main" ]]; then
  echo "Error: must be on main branch."
  exit 1
fi

git pull --ff-only origin main

NEW_VERSION="$(npm version "$BUMP" --no-git-tag-version)"
RELEASE_BRANCH="chore/release-${NEW_VERSION}"

git checkout -b "$RELEASE_BRANCH"
git add package.json package-lock.json
git commit -m "chore: release ${NEW_VERSION}"
git tag "$NEW_VERSION"

git push origin "$RELEASE_BRANCH"
git push origin "$NEW_VERSION"

echo ""
echo "Tag ${NEW_VERSION} pushed — pipeline running at:"
echo "  https://github.com/slverma/REST-Lab/actions"
echo ""
echo "Open PR to land version bump in main:"
echo "  https://github.com/slverma/REST-Lab/pull/new/${RELEASE_BRANCH}"
