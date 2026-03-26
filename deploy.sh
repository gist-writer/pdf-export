#!/usr/bin/env bash
set -euo pipefail

git pull

LATEST=$(git tag --sort=-v:refname | head -1)
if [ -z "$LATEST" ]; then
  LATEST="v0.0.0"
fi
VERSION=${LATEST#v}

IFS='.' read -r MAJOR MINOR PATCH <<< "$VERSION"

PATCH=$((PATCH + 1))
if [ "$PATCH" -ge 10 ]; then
  PATCH=0
  MINOR=$((MINOR + 1))
fi
if [ "$MINOR" -ge 10 ]; then
  MINOR=0
  MAJOR=$((MAJOR + 1))
fi

NEW_TAG="v${MAJOR}.${MINOR}.${PATCH}"
NEW_VERSION="${MAJOR}.${MINOR}.${PATCH}"

echo "$LATEST -> $NEW_TAG"

# Bump package.json version
sed -i '' "s/\"version\": \".*\"/\"version\": \"${NEW_VERSION}\"/" package.json
git add package.json
git commit -m "chore: bump version to $NEW_TAG"
git push

git tag "$NEW_TAG"
git push origin "$NEW_TAG"

echo "Deployed $NEW_TAG"
