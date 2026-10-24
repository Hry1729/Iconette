//! v0.4.7 「更新」 without the signing secrets.
//!
//! The signed tauri-plugin-updater path (latest.json) only works when the release workflow has
//! TAURI_SIGNING_PRIVATE_KEY; this repo's releases have none, so the app updates itself from the
//! plain GitHub release instead:
//!   1. `upd_latest`   — GitHub API releases/latest → version + the installer asset for this platform.
//!   2. `upd_download` — stream the asset to %TEMP%/iconette-update (progress events "upd-progress",
//!                       a stall of 30 s = timeout, `upd_cancel` stops it).
//!   3. `upd_install`  — Windows: run the NSIS setup silently (`/S /UPDATE /R`: the installer closes
//!                       this app via Restart Manager, replaces the files and starts the new version);
//!                       macOS: mount the dmg, copy Iconette.app over the running bundle, relaunch.
//!                       If the bundle cannot be replaced (no write access, App Translocation, running
//!                       from the dmg) the dmg is opened in Finder and "manual" is returned.
//! Errors are short codes the UI maps to text: timeout · connect · rate · http:NNN · noasset ·
//! cancel · busy · net:… · io:… · install:…

use serde::Serialize;
use std::{
    io::Write,
    path::{Path, PathBuf},
    sync::atomic::{AtomicBool, Ordering},
    time::{Duration, Instant},
};
use tauri::{AppHandle, Emitter, Runtime};

const API: &str = "https://api.github.com/repos/Hry1729/icones-desktop/releases/latest";
const UA: &str = concat!("Iconette/", env!("CARGO_PKG_VERSION"));
/// A download with no bytes for this long is reported as `timeout` (slow networks still finish).
const STALL: Duration = Duration::from_secs(30);

static CANCEL: AtomicBool = AtomicBool::new(false);
static BUSY: AtomicBool = AtomicBool::new(false);

#[derive(Serialize, Clone)]
pub struct Asset {
    name: String,
    url: String,
    size: u64,
}

#[derive(Serialize)]
pub struct Latest {
    version: String,
    page: String,
    asset: Option<Asset>,
}

#[derive(Serialize, Clone)]
struct Progress {
    got: u64,
    total: u64,
}

fn client(total: Option<Duration>) -> Result<reqwest::Client, String> {
    // reqwest is built with rustls but no crypto provider (shared with tauri-plugin-updater).
    if rustls::crypto::CryptoProvider::get_default().is_none() {
        let _ = rustls::crypto::ring::default_provider().install_default();
    }
    let mut b = reqwest::Client::builder().user_agent(UA).connect_timeout(Duration::from_secs(12));
    if let Some(t) = total {
        b = b.timeout(t);
    }
    b.build().map_err(|e| format!("net:{e}"))
}

fn net_err(e: reqwest::Error) -> String {
    if e.is_timeout() {
        "timeout".into()
    } else if e.is_connect() {
        "connect".into()
    } else {
        format!("net:{e}")
    }
}

/// The installer for this machine among the release assets.
fn pick(assets: &[Asset]) -> Option<Asset> {
    let by = |f: &dyn Fn(&str) -> bool| assets.iter().find(|a| f(&a.name.to_lowercase())).cloned();
    if cfg!(target_os = "windows") {
        by(&|n| n.ends_with("_x64-setup.exe")).or_else(|| by(&|n| n.ends_with("-setup.exe")))
    } else if cfg!(target_os = "macos") {
        let arch = if cfg!(target_arch = "aarch64") { "aarch64" } else { "x64" };
        by(&|n| n.ends_with(".dmg") && n.contains("universal"))
            .or_else(|| by(&|n| n.ends_with(".dmg") && n.contains(arch)))
            .or_else(|| by(&|n| n.ends_with(".dmg")))
    } else {
        None
    }
}

#[tauri::command]
pub async fn upd_latest() -> Result<Latest, String> {
    let r = client(Some(Duration::from_secs(15)))?
        .get(API)
        .header("Accept", "application/vnd.github+json")
        .send()
        .await
        .map_err(net_err)?;
    let st = r.status().as_u16();
    if st == 403 || st == 429 {
        return Err("rate".into());
    }
    if !r.status().is_success() {
        return Err(format!("http:{st}"));
    }
    let j: serde_json::Value = serde_json::from_slice(&r.bytes().await.map_err(net_err)?).map_err(|e| format!("net:{e}"))?;
    let s = |v: &serde_json::Value, k: &str| v.get(k).and_then(|x| x.as_str()).unwrap_or_default().to_string();
    let assets: Vec<Asset> = j
        .get("assets")
        .and_then(|a| a.as_array())
        .map(|a| a.iter().map(|x| Asset { name: s(x, "name"), url: s(x, "browser_download_url"), size: x.get("size").and_then(|n| n.as_u64()).unwrap_or(0) }).collect())
        .unwrap_or_default();
    Ok(Latest { version: s(&j, "tag_name").trim_start_matches(['v', 'V']).to_string(), page: s(&j, "html_url"), asset: pick(&assets) })
}

#[tauri::command]
pub fn upd_cancel() {
    CANCEL.store(true, Ordering::SeqCst);
}

struct Busy;
impl Drop for Busy {
    fn drop(&mut self) {
        BUSY.store(false, Ordering::SeqCst);
    }
}

/// Download `url` to the temp dir; returns the file path.
#[tauri::command]
pub async fn upd_download<R: Runtime>(app: AppHandle<R>, url: String, name: String, size: u64) -> Result<String, String> {
    if BUSY.swap(true, Ordering::SeqCst) {
        return Err("busy".into());
    }
    let _busy = Busy;
    CANCEL.store(false, Ordering::SeqCst);
    let safe: String = name.chars().map(|c| if c.is_ascii_alphanumeric() || "._-".contains(c) { c } else { '_' }).collect();
    let dir = std::env::temp_dir().join("iconette-update");
    std::fs::create_dir_all(&dir).map_err(|e| format!("io:{e}"))?;
    let dest = dir.join(&safe);
    // already downloaded by an earlier attempt
    if size > 0 && std::fs::metadata(&dest).map(|m| m.len() == size).unwrap_or(false) {
        let _ = app.emit("upd-progress", Progress { got: size, total: size });
        return Ok(dest.to_string_lossy().into_owned());
    }
    let part = dir.join(format!("{safe}.part"));
    let mut r = client(None)?.get(&url).send().await.map_err(net_err)?;
    let st = r.status().as_u16();
    if st == 403 || st == 429 {
        return Err("rate".into());
    }
    if !r.status().is_success() {
        return Err(format!("http:{st}"));
    }
    let total = r.content_length().unwrap_or(size);
    let mut f = std::fs::File::create(&part).map_err(|e| format!("io:{e}"))?;
    let mut got = 0u64;
    let mut last = Instant::now();
    let _ = app.emit("upd-progress", Progress { got, total });
    let res: Result<(), String> = async {
        loop {
            if CANCEL.load(Ordering::SeqCst) {
                return Err("cancel".into());
            }
            let chunk = match tokio::time::timeout(STALL, r.chunk()).await {
                Err(_) => return Err("timeout".into()),
                Ok(c) => c.map_err(net_err)?,
            };
            let Some(chunk) = chunk else { break };
            f.write_all(&chunk).map_err(|e| format!("io:{e}"))?;
            got += chunk.len() as u64;
            if last.elapsed() >= Duration::from_millis(80) {
                last = Instant::now();
                let _ = app.emit("upd-progress", Progress { got, total });
            }
        }
        if total > 0 && got != total {
            return Err("net:incomplete".into());
        }
        f.flush().map_err(|e| format!("io:{e}"))
    }
    .await;
    drop(f);
    if let Err(e) = res {
        let _ = std::fs::remove_file(&part);
        return Err(e);
    }
    let _ = app.emit("upd-progress", Progress { got, total: got });
    let _ = std::fs::remove_file(&dest);
    std::fs::rename(&part, &dest).map_err(|e| format!("io:{e}"))?;
    Ok(dest.to_string_lossy().into_owned())
}

/// Install the downloaded file. "restart" = the app is about to quit and the new version starts;
/// "manual" = the installer was opened for the user (macOS fallback).
#[tauri::command]
pub async fn upd_install<R: Runtime>(app: AppHandle<R>, path: String) -> Result<String, String> {
    let p = PathBuf::from(&path);
    if !p.is_file() {
        return Err("install:missing".into());
    }
    let how = tauri::async_runtime::spawn_blocking(move || install(&p)).await.map_err(|e| format!("install:{e}"))??;
    if how == "restart" {
        let h = app.clone();
        // let the UI paint its last state, then quit so the files can be replaced
        tauri::async_runtime::spawn(async move {
            tokio::time::sleep(Duration::from_millis(400)).await;
            h.exit(0);
        });
    }
    Ok(how)
}

#[cfg(target_os = "windows")]
fn install(p: &Path) -> Result<String, String> {
    // tauri.windows.conf.json: nsis.installMode = "currentUser" → installs to %LOCALAPPDATA%, no UAC
    // prompt, so the silent mode is safe. /S silent · /UPDATE update mode (keeps shortcuts as they are)
    // · /R start the app again when done (the installer closes the running copy itself).
    std::process::Command::new(p).args(["/S", "/UPDATE", "/R"]).spawn().map_err(|e| format!("install:{e}"))?;
    Ok("restart".into())
}

#[cfg(target_os = "macos")]
fn install(dmg: &Path) -> Result<String, String> {
    use std::process::Command;
    let open_dmg = || -> Result<String, String> {
        Command::new("open").arg(dmg).spawn().map_err(|e| format!("install:{e}"))?;
        Ok("manual".into())
    };
    // …/Iconette.app/Contents/MacOS/iconette → …/Iconette.app
    let exe = std::env::current_exe().map_err(|e| format!("install:{e}"))?;
    let Some(bundle) = exe.ancestors().nth(3).map(Path::to_path_buf) else { return open_dmg() };
    let bs = bundle.to_string_lossy().to_string();
    if bundle.extension().map(|e| e != "app").unwrap_or(true) || bs.contains("/AppTranslocation/") || bs.starts_with("/Volumes/") {
        return open_dmg();
    }
    let Some(parent) = bundle.parent().map(Path::to_path_buf) else { return open_dmg() };
    let mnt = std::env::temp_dir().join(format!("iconette-mnt-{}", std::process::id()));
    let _ = std::fs::create_dir_all(&mnt);
    let ok = Command::new("hdiutil").args(["attach", "-nobrowse", "-noautoopen", "-noverify", "-mountpoint"]).arg(&mnt).arg(dmg).status().map(|s| s.success()).unwrap_or(false);
    if !ok {
        return open_dmg();
    }
    let detach = || {
        let _ = Command::new("hdiutil").args(["detach", "-force"]).arg(&mnt).status();
    };
    let src = std::fs::read_dir(&mnt).ok().and_then(|d| d.flatten().map(|e| e.path()).find(|p| p.extension().map(|x| x == "app").unwrap_or(false)));
    let Some(src) = src else {
        detach();
        return open_dmg();
    };
    let stage = parent.join(".Iconette-update.app");
    let old = parent.join(".Iconette-old.app");
    let _ = std::fs::remove_dir_all(&stage);
    let _ = std::fs::remove_dir_all(&old);
    let copied = Command::new("ditto").arg(&src).arg(&stage).status().map(|s| s.success()).unwrap_or(false);
    detach();
    if !copied {
        let _ = std::fs::remove_dir_all(&stage);
        return open_dmg();
    }
    let _ = Command::new("xattr").args(["-dr", "com.apple.quarantine"]).arg(&stage).status();
    if std::fs::rename(&bundle, &old).is_err() {
        let _ = std::fs::remove_dir_all(&stage);
        return open_dmg();
    }
    if std::fs::rename(&stage, &bundle).is_err() {
        let _ = std::fs::rename(&old, &bundle);
        let _ = std::fs::remove_dir_all(&stage);
        return open_dmg();
    }
    let _ = std::fs::remove_dir_all(&old);
    let _ = std::fs::remove_dir_all(&mnt);
    // start the new copy once this process is gone (single-instance would otherwise just focus us)
    Command::new("/bin/sh")
        .args(["-c", "while kill -0 \"$1\" 2>/dev/null; do sleep 0.2; done; open \"$2\"", "sh"])
        .arg(std::process::id().to_string())
        .arg(&bundle)
        .spawn()
        .map_err(|e| format!("install:{e}"))?;
    Ok("restart".into())
}

#[cfg(not(any(target_os = "windows", target_os = "macos")))]
fn install(_p: &Path) -> Result<String, String> {
    Err("noasset".into())
}
