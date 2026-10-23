//! Copy a PNG as BOTH an image and a real file (v0.4.3), so the same copy pastes into chat apps / Figma / Office
//! (image data) and into Windows Explorer / macOS Finder (a `.png` file).
//!
//! The file is written to `<temp>/iconette-clip/<name>.png`; files there older than a day are removed on each copy
//! (the newest copies stay, since the clipboard only holds a reference to them).
//! * Windows: one clipboard transaction with CF_HDROP (file list) + registered "PNG" (raw PNG bytes, used by
//!   Office / browsers / most chat apps) + CF_DIBV5 (32-bit BGRA with alpha; Windows synthesises CF_DIB/CF_BITMAP).
//! * macOS: one NSPasteboardItem carrying `public.file-url` (Finder pastes the file) and `public.png`.
//! * Other platforms: Err → the UI falls back to the plain image copy.

use std::path::{Path, PathBuf};

const KEEP_SECS: u64 = 24 * 3600;

fn clip_dir() -> PathBuf {
    std::env::temp_dir().join("iconette-clip")
}

/// `mdi:home` → `mdi-home`; keeps ASCII letters, digits, `-` and `_`.
pub fn safe_name(name: &str) -> String {
    let s: String = name
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() || c == '-' || c == '_' { c } else { '-' })
        .collect();
    let s = s.trim_matches('-').to_string();
    if s.is_empty() { "icon".into() } else { s.chars().take(80).collect() }
}

fn clean_old(dir: &Path, keep: &Path) {
    let Ok(rd) = std::fs::read_dir(dir) else { return };
    let now = std::time::SystemTime::now();
    for e in rd.flatten() {
        let p = e.path();
        if p == keep {
            continue;
        }
        let old = e
            .metadata()
            .and_then(|m| m.modified())
            .ok()
            .and_then(|t| now.duration_since(t).ok())
            .map(|d| d.as_secs() > KEEP_SECS)
            .unwrap_or(false);
        if old {
            let _ = std::fs::remove_file(p);
        }
    }
}

/// Write the PNG to the clip folder and return its path.
pub fn write_png(name: &str, png: &[u8]) -> Result<PathBuf, String> {
    if png.len() < 8 || &png[1..4] != b"PNG" {
        return Err("not a png".into());
    }
    let dir = clip_dir();
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let file = dir.join(format!("{}.png", safe_name(name)));
    std::fs::write(&file, png).map_err(|e| e.to_string())?;
    clean_old(&dir, &file);
    Ok(file)
}

/// Put `png` on the clipboard as image + file. Returns the file path written.
pub fn copy_png_file(name: &str, png: &[u8]) -> Result<String, String> {
    let file = write_png(name, png)?;
    set_clipboard(&file, png)?;
    Ok(file.to_string_lossy().into_owned())
}

#[cfg(target_os = "windows")]
fn set_clipboard(file: &Path, png: &[u8]) -> Result<(), String> {
    use clipboard_win::{raw, Clipboard};
    const CF_DIBV5: u32 = 17;
    let dib = dibv5(png)?;
    let path = file.to_string_lossy().into_owned();
    let _guard = Clipboard::new_attempts(10).map_err(|e| format!("open clipboard: {e}"))?;
    raw::empty().map_err(|e| format!("empty clipboard: {e}"))?;
    if let Some(f) = raw::register_format("PNG") {
        raw::set_without_clear(f.get(), png).map_err(|e| format!("set PNG: {e}"))?;
    }
    raw::set_without_clear(CF_DIBV5, &dib).map_err(|e| format!("set DIBV5: {e}"))?;
    raw::set_file_list(&[path]).map_err(|e| format!("set file list: {e}"))?;
    Ok(())
}

/// PNG → CF_DIBV5 bytes (BITMAPV5HEADER + bottom-up BGRA, straight alpha). Fully transparent pixels get a white
/// colour so apps that ignore alpha show a white (not black) background.
#[cfg(target_os = "windows")]
fn dibv5(png_bytes: &[u8]) -> Result<Vec<u8>, String> {
    let mut dec = png::Decoder::new(std::io::Cursor::new(png_bytes));
    dec.set_transformations(png::Transformations::EXPAND | png::Transformations::STRIP_16);
    let mut rd = dec.read_info().map_err(|e| e.to_string())?;
    let mut buf = vec![0u8; rd.output_buffer_size().ok_or("png too large")?];
    let info = rd.next_frame(&mut buf).map_err(|e| e.to_string())?;
    let (w, h) = (info.width as usize, info.height as usize);
    let ch = match info.color_type {
        png::ColorType::Rgba => 4,
        png::ColorType::Rgb => 3,
        png::ColorType::GrayscaleAlpha => 2,
        png::ColorType::Grayscale => 1,
        _ => return Err("unsupported png colour type".into()),
    };
    let stride = info.line_size;
    let mut out = Vec::with_capacity(124 + w * h * 4);
    let le32 = |v: &mut Vec<u8>, x: u32| v.extend_from_slice(&x.to_le_bytes());
    le32(&mut out, 124); // bV5Size
    le32(&mut out, w as u32); // width
    le32(&mut out, h as u32); // height (> 0: bottom-up)
    out.extend_from_slice(&1u16.to_le_bytes()); // planes
    out.extend_from_slice(&32u16.to_le_bytes()); // bit count
    le32(&mut out, 3); // BI_BITFIELDS
    le32(&mut out, (w * h * 4) as u32); // size image
    le32(&mut out, 2835); // 72 dpi
    le32(&mut out, 2835);
    le32(&mut out, 0); // clr used
    le32(&mut out, 0); // clr important
    le32(&mut out, 0x00FF_0000); // red mask
    le32(&mut out, 0x0000_FF00); // green
    le32(&mut out, 0x0000_00FF); // blue
    le32(&mut out, 0xFF00_0000); // alpha
    le32(&mut out, 0x7352_4742); // LCS_sRGB
    out.extend_from_slice(&[0u8; 36]); // endpoints
    out.extend_from_slice(&[0u8; 12]); // gamma
    le32(&mut out, 4); // LCS_GM_IMAGES
    le32(&mut out, 0); // profile data
    le32(&mut out, 0); // profile size
    le32(&mut out, 0); // reserved
    debug_assert_eq!(out.len(), 124);
    for y in (0..h).rev() {
        let row = &buf[y * stride..y * stride + w * ch];
        for x in 0..w {
            let p = &row[x * ch..x * ch + ch];
            let (r, g, b, a) = match ch {
                4 => (p[0], p[1], p[2], p[3]),
                3 => (p[0], p[1], p[2], 255),
                2 => (p[0], p[0], p[0], p[1]),
                _ => (p[0], p[0], p[0], 255),
            };
            if a == 0 {
                out.extend_from_slice(&[255, 255, 255, 0]);
            } else {
                out.extend_from_slice(&[b, g, r, a]);
            }
        }
    }
    Ok(out)
}

#[cfg(target_os = "macos")]
fn set_clipboard(file: &Path, png: &[u8]) -> Result<(), String> {
    use objc2::runtime::ProtocolObject;
    use objc2_app_kit::{NSPasteboard, NSPasteboardItem, NSPasteboardTypeFileURL, NSPasteboardTypePNG, NSPasteboardWriting};
    use objc2_foundation::{NSArray, NSData, NSString, NSURL};
    let path = NSString::from_str(&file.to_string_lossy());
    let url = NSURL::fileURLWithPath(&path);
    let url_str = url.absoluteString().ok_or("file url")?;
    let data = NSData::with_bytes(png);
    let item = NSPasteboardItem::new();
    // SAFETY: AppKit pasteboard type constants are immutable NSString statics.
    let (t_url, t_png) = unsafe { (NSPasteboardTypeFileURL, NSPasteboardTypePNG) };
    if !item.setString_forType(&url_str, t_url) || !item.setData_forType(&data, t_png) {
        return Err("pasteboard item".into());
    }
    let obj: objc2::rc::Retained<ProtocolObject<dyn NSPasteboardWriting>> = ProtocolObject::from_retained(item);
    let arr = NSArray::from_retained_slice(&[obj]);
    let pb = NSPasteboard::generalPasteboard();
    pb.clearContents();
    if pb.writeObjects(&arr) { Ok(()) } else { Err("writeObjects failed".into()) }
}

#[cfg(not(any(target_os = "windows", target_os = "macos")))]
fn set_clipboard(_file: &Path, _png: &[u8]) -> Result<(), String> {
    Err("file clipboard not supported on this platform".into())
}
