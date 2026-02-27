#!/usr/bin/env bash
# Build Android APK for sideloading. Uses EAS Build (preview profile = APK).
# First run:  eas login
# Then:      ./build-apk.sh

set -e
cd "$(dirname "$0")"
export TMPDIR="${TMPDIR:-$HOME/.cache/expo-metro}"
mkdir -p "$TMPDIR"
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
[[ -s "$NVM_DIR/nvm.sh" ]] && . "$NVM_DIR/nvm.sh" && nvm use
echo "Building Android APK..."
eas build --platform android --profile preview --non-interactive
