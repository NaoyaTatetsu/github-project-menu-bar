#!/usr/bin/env bash
#
# Build, sign and install the app (with its widget) from the command line —
# no need to open Xcode. Uses the free personal team baked into project.yml.
# Re-run this weekly if the free provisioning profile expires (7-day limit).
#
set -euo pipefail

export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer
cd "$(dirname "$0")"

echo "▶︎ Regenerating project…"
xcodegen generate >/dev/null

echo "▶︎ Building (Release, signed)…"
xcodebuild \
  -project GitHubProjectMenuBar.xcodeproj \
  -scheme GitHubProjectMenuBar \
  -configuration Release \
  -derivedDataPath build \
  -allowProvisioningUpdates \
  clean build

APP="build/Build/Products/Release/GitHubProjectMenuBar.app"
DEST="/Applications/GitHubProjectMenuBar.app"

echo "Installing to ${DEST}"
# stop the running instance so the copy isn't in use
pkill -f "${DEST}/Contents/MacOS/GitHubProjectMenuBar" 2>/dev/null || true
rm -rf "${DEST}"
cp -R "${APP}" "${DEST}"

echo "Launching"
open "${DEST}"
echo "Done: ${DEST}"
