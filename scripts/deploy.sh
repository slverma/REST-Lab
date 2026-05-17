#!/usr/bin/env bash
set -euo pipefail

BUMP="${1:-patch}"

if [[ "$BUMP" != "patch" && "$BUMP" != "minor" && "$BUMP" != "major" ]]; then
  echo "Usage: $0 [patch|minor|major]"
  echo "  Default: patch"
  exit 1
fi

# Ensure clean working tree
if [[ -n "$(git status --porcelain)" ]]; then
  echo "Error: working tree is dirty. Commit or stash changes first."
  exit 1
fi

# Ensure we're on main
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$BRANCH" != "main" ]]; then
  echo "Error: must be on main branch (currently on '$BRANCH')."
  exit 1
fi

git pull --ff-only origin main

# Bump version in package.json and create commit + tag
NEW_VERSION="$(npm version "$BUMP" --no-git-tag-version)"
git add package.json package-lock.json
git commit -m "chore: release $NEW_VERSION"
git tag "$NEW_VERSION"

echo "Tagged $NEW_VERSION — pushing to GitHub to trigger deploy pipeline..."
git push origin main
git push origin "$NEW_VERSION"

echo "Done. Pipeline running at: https://github.com/slverma/REST-Lab/actions"
