#!/usr/bin/env bash
# Launch the built .app, make sure it stays alive and renders, then grab a screenshot.
set -euo pipefail
APP=src-tauri/target/universal-apple-darwin/release/bundle/macos/Iconette.app
echo "App: $APP"
codesign -dv "$APP" 2>&1 | head -5 || true
lipo -info "$APP/Contents/MacOS/iconette"
"$APP/Contents/MacOS/iconette" > smoke.log 2>&1 &
PID=$!
sleep 20
if ! kill -0 "$PID" 2>/dev/null; then
  echo "App exited early"; cat smoke.log; exit 1
fi
screencapture -x smoke-macos.png || echo "screencapture unavailable"
# Also capture the DMG install window to check the custom background/layout
DMG=$(ls src-tauri/target/universal-apple-darwin/release/bundle/dmg/Iconette_*.dmg | head -1)
kill "$PID" || true; PID=0
hdiutil attach "$DMG" -quiet -mountpoint /Volumes/IconetteSmoke && open /Volumes/IconetteSmoke && sleep 4 && screencapture -x smoke-macos-dmg.png || echo "dmg capture skipped"
hdiutil detach /Volumes/IconetteSmoke -quiet || true
echo "macOS smoke test passed"
