#!/usr/bin/env bash
# Launch the built .app, make sure it stays alive and renders, then grab a screenshot.
set -euo pipefail
APP=$(ls -d src-tauri/target/universal-apple-darwin/release/bundle/macos/*.app | head -1)
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
kill "$PID" || true
echo "macOS smoke test passed"
