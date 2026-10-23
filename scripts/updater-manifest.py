#!/usr/bin/env python3
"""Write latest.json for tauri-plugin-updater from the signed updater artifacts of a release.

Usage: updater-manifest.py <artifact dir> <tag> <out file>
Does nothing (exit 0, no file) when there are no .sig files, i.e. when the build ran without the
TAURI_SIGNING_PRIVATE_KEY secret. The app then falls back to the GitHub API update check."""
import datetime, json, pathlib, sys

root, tag, out = pathlib.Path(sys.argv[1]), sys.argv[2], pathlib.Path(sys.argv[3])
base = f"https://github.com/Hry1729/icones-desktop/releases/download/{tag}/"
sigs = {p.name[:-4]: p for p in root.rglob("*.sig")}
platforms = {}

def add(keys, name):
    entry = {"signature": sigs[name].read_text().strip(), "url": base + name}
    for k in keys:
        platforms[k] = entry

for name in sigs:
    if name.endswith("-setup.exe"):
        add(["windows-x86_64", "windows-x86_64-nsis"], name)
    elif name.endswith(".msi"):
        add(["windows-x86_64-msi"], name)
    elif name.endswith(".app.tar.gz"):
        # Universal macOS build: one archive serves both architectures.
        add(["darwin-aarch64", "darwin-x86_64", "darwin-aarch64-app", "darwin-x86_64-app"], name)

if not platforms:
    print("no updater signatures found; skipping latest.json")
    sys.exit(0)
out.write_text(json.dumps({
    "version": tag.lstrip("v"),
    "notes": f"https://github.com/Hry1729/icones-desktop/releases/tag/{tag}",
    "pub_date": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
    "platforms": platforms,
}, indent=2))
print(f"wrote {out} for {sorted(platforms)}")
