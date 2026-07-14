#!/usr/bin/env bash
#
# Run the unit tests (Shared logic) from the command line.
#
set -euo pipefail

export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer
cd "$(dirname "$0")"

xcodegen generate >/dev/null
xcodebuild test \
  -project GitHubProjectMenuBar.xcodeproj \
  -scheme GitHubProjectMenuBar \
  -destination 'platform=macOS' \
  -derivedDataPath build \
  -allowProvisioningUpdates
