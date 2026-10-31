//! 完整图标集 JSON 放在应用数据目录的 iconify/ 下，不打进安装包。
//! 前端用 asset 协议按文件读取，避免把几十 MB 的正文塞进一次 IPC。

use std::{
    io::Write,
    path::{Path, PathBuf},
    sync::atomic::{AtomicBool, Ordering},
    time::Duration,
};
use tauri::{AppHandle, Runtime};

const UA: &str = concat!("Iconette/", env!("CARGO_PKG_VERSION"));
const STALL: Duration = Duration::from_secs(30);

static CANCEL: AtomicBool = AtomicBool::new(false);

fn client() -> Result<reqwest::Client, String> {
    if rustls::crypto::CryptoProvider::get_default().is_none() {
        let _ = rustls::crypto::ring::default_provider().install_default();
    }
    reqwest::Client::builder()
        .user_agent(UA)
        .connect_timeout(Duration::from_secs(12))
        .build()
        .map_err(|e| format!("net:{e}"))
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

fn safe_prefix(p: &str) -> bool {
    !p.is_empty()
        && p.len() <= 64
        && !p.starts_with('-')
        && !p.ends_with('-')
        && p.bytes().all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == b'-')
}

/// 只允许固定版本的 @iconify/json（unpkg / jsDelivr）和官方 API。
/// jsDelivr 目前会拒绝这个超过 150 MB 的包，unpkg 是实际能下到单文件的源。
fn allowed_url(url: &str, prefix: &str) -> bool {
    if url.contains("..") || url.contains('\\') || url.contains('?') || url.contains('#') {
        return false;
    }
    let tail = format!("/json/{prefix}.json");
    let marker = "@iconify/json@";
    for origin in ["https://unpkg.com/", "https://cdn.jsdelivr.net/npm/"] {
        if let Some(rest) = url.strip_prefix(origin) {
            let Some(ver) = rest.strip_prefix(marker) else { return false };
            return ver.ends_with(&tail) && ver.chars().next().is_some_and(|c| c.is_ascii_digit());
        }
    }
    url == format!("https://api.iconify.design/{prefix}.json")
}

fn pack_dir<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    Ok(app.path().app_data_dir().map_err(|e| e.to_string())?.join("iconify"))
}

fn file_of(dir: &Path, prefix: &str) -> PathBuf {
    dir.join(format!("{prefix}.json"))
}

#[tauri::command]
pub fn iconpack_cancel() {
    CANCEL.store(true, Ordering::SeqCst);
}

#[tauri::command]
pub fn iconpack_reset() {
    CANCEL.store(false, Ordering::SeqCst);
}

#[tauri::command]
pub fn iconpack_list<R: Runtime>(app: AppHandle<R>) -> Result<Vec<String>, String> {
    let dir = pack_dir(&app)?;
    let rd = match std::fs::read_dir(&dir) {
        Ok(rd) => rd,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(vec![]),
        Err(e) => return Err(format!("io:{e}")),
    };
    let mut out = Vec::new();
    for ent in rd.flatten() {
        let name = ent.file_name().to_string_lossy().into_owned();
        if let Some(prefix) = name.strip_suffix(".json") {
            if safe_prefix(prefix) {
                out.push(prefix.to_string());
            }
        }
    }
    out.sort();
    Ok(out)
}

#[tauri::command]
pub fn iconpack_path<R: Runtime>(app: AppHandle<R>, prefix: String) -> Result<Option<String>, String> {
    if !safe_prefix(&prefix) {
        return Err("bad prefix".into());
    }
    let path = file_of(&pack_dir(&app)?, &prefix);
    if path.is_file() {
        Ok(Some(path.to_string_lossy().into_owned()))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub fn iconpack_drop<R: Runtime>(app: AppHandle<R>, prefix: String) -> Result<(), String> {
    if !safe_prefix(&prefix) {
        return Err("bad prefix".into());
    }
    let dir = pack_dir(&app)?;
    let _ = std::fs::remove_file(file_of(&dir, &prefix));
    let _ = std::fs::remove_file(dir.join(format!("{prefix}.json.part")));
    Ok(())
}

fn looks_json(path: &Path) -> bool {
    let mut f = match std::fs::File::open(path) {
        Ok(f) => f,
        Err(_) => return false,
    };
    let mut buf = [0u8; 32];
    let n = std::io::Read::read(&mut f, &mut buf).unwrap_or(0);
    let s = String::from_utf8_lossy(&buf[..n]);
    s.trim_start().starts_with('{')
}

/// 把一个图标集的 JSON 流式写到应用数据目录。返回写入字节数。
#[tauri::command]
pub async fn iconpack_download<R: Runtime>(app: AppHandle<R>, prefix: String, url: String) -> Result<u64, String> {
    if !safe_prefix(&prefix) {
        return Err("bad prefix".into());
    }
    if !allowed_url(&url, &prefix) {
        return Err("bad url".into());
    }
    if CANCEL.load(Ordering::SeqCst) {
        return Err("cancel".into());
    }
    let dir = pack_dir(&app)?;
    std::fs::create_dir_all(&dir).map_err(|e| format!("io:{e}"))?;
    let dest = file_of(&dir, &prefix);
    let part = dir.join(format!("{prefix}.json.part"));
    let mut r = client()?.get(&url).send().await.map_err(net_err)?;
    let st = r.status().as_u16();
    if !r.status().is_success() {
        return Err(format!("http:{st}"));
    }
    let total = r.content_length().unwrap_or(0);
    let mut f = std::fs::File::create(&part).map_err(|e| format!("io:{e}"))?;
    let mut got = 0u64;
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
        }
        // content-length 比实际字节少，多半是压缩声明；截断（got < total）则丢掉。
        if total > 0 && got < total {
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
    if !looks_json(&part) {
        let _ = std::fs::remove_file(&part);
        return Err("not json".into());
    }
    let _ = std::fs::remove_file(&dest);
    std::fs::rename(&part, &dest).map_err(|e| format!("io:{e}"))?;
    Ok(got)
}
