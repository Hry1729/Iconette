use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;

use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager, Runtime, WindowEvent};

/// Shared state: whether closing the main window hides it to the tray, and the tray menu items
/// (kept so their labels can follow the UI language).
struct Shell<R: Runtime> {
    close_to_tray: AtomicBool,
    items: Mutex<Option<[MenuItem<R>; 3]>>,
    /// The global shortcut that actually got registered ("alt+space" / "alt+shift+space"), if any.
    shortcut: Mutex<Option<&'static str>>,
}

fn show_main<R: Runtime>(app: &AppHandle<R>) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.unminimize();
        let _ = w.show();
        let _ = w.set_focus();
    }
}

fn hide_quick<R: Runtime>(app: &AppHandle<R>) {
    if let Some(q) = app.get_webview_window("quick") {
        let _ = q.hide();
    }
    // Give focus back to whatever app was in front when the main window isn't showing.
    #[cfg(target_os = "macos")]
    {
        let main_visible = app
            .get_webview_window("main")
            .and_then(|w| w.is_visible().ok())
            .unwrap_or(false);
        if !main_visible {
            let _ = app.hide();
        }
    }
}

fn toggle_quick_window<R: Runtime>(app: &AppHandle<R>) {
    let Some(q) = app.get_webview_window("quick") else { return };
    if q.is_visible().unwrap_or(false) && q.is_focused().unwrap_or(false) {
        hide_quick(app);
    } else {
        let _ = q.center();
        let _ = q.show();
        let _ = q.set_focus();
        let _ = q.emit("quick-open", ());
    }
}

#[tauri::command]
fn toggle_quick<R: Runtime>(app: AppHandle<R>) {
    toggle_quick_window(&app);
}

#[tauri::command]
fn quick_hide<R: Runtime>(app: AppHandle<R>) {
    hide_quick(&app);
}

#[tauri::command]
fn show_main_window<R: Runtime>(app: AppHandle<R>) {
    show_main(&app);
}

#[tauri::command]
fn set_close_to_tray<R: Runtime>(app: AppHandle<R>, on: bool) {
    app.state::<Shell<R>>().close_to_tray.store(on, Ordering::Relaxed);
}

/// The quick-window shortcut that is really active, so the UI can show it (None: none could be registered).
#[tauri::command]
fn quick_shortcut<R: Runtime>(app: AppHandle<R>) -> Option<String> {
    app.state::<Shell<R>>().shortcut.lock().unwrap().map(str::to_string)
}

/// Tray menu labels: [show main window, quick window, quit].
#[tauri::command]
fn set_tray_labels<R: Runtime>(app: AppHandle<R>, labels: Vec<String>) {
    if let Some(items) = app.state::<Shell<R>>().items.lock().unwrap().as_ref() {
        for (it, l) in items.iter().zip(labels.iter()) {
            let _ = it.set_text(l);
        }
    }
}

/// Write the dragged icon to a temp folder; returns (svg file, png preview) for the native drag.
#[tauri::command]
fn drag_prepare(name: String, svg: String, png: Vec<u8>) -> Result<(String, String), String> {
    let safe: String = name
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() || c == '-' || c == '_' { c } else { '-' })
        .collect();
    let dir = std::env::temp_dir().join("iconette-drag");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let file = dir.join(format!("{safe}.svg"));
    std::fs::write(&file, svg).map_err(|e| e.to_string())?;
    let icon = dir.join(format!("{safe}.drag.png"));
    std::fs::write(&icon, png).map_err(|e| e.to_string())?;
    Ok((file.to_string_lossy().into_owned(), icon.to_string_lossy().into_owned()))
}

/// Where crash / startup errors go: %LOCALAPPDATA%\io.github.hry1729.iconette\logs\iconette.log
/// (macOS: ~/Library/Logs/io.github.hry1729.iconette/iconette.log). Release builds have no console,
/// so without this a startup failure is completely silent.
fn log_path() -> std::path::PathBuf {
    #[cfg(target_os = "windows")]
    let base = std::env::var_os("LOCALAPPDATA").map(std::path::PathBuf::from);
    #[cfg(target_os = "macos")]
    let base = std::env::var_os("HOME").map(|h| std::path::PathBuf::from(h).join("Library/Logs"));
    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    let base: Option<std::path::PathBuf> = None;
    let dir = base.unwrap_or_else(std::env::temp_dir).join("io.github.hry1729.iconette").join("logs");
    let _ = std::fs::create_dir_all(&dir);
    dir.join("iconette.log")
}

fn log(msg: &str) {
    use std::io::Write;
    let secs = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_secs()).unwrap_or(0);
    if let Ok(mut f) = std::fs::OpenOptions::new().create(true).append(true).open(log_path()) {
        let _ = writeln!(f, "[{secs}] v{} {msg}", env!("CARGO_PKG_VERSION"));
    }
    eprintln!("{msg}");
}

/// Global shortcuts tried in order; the first one the OS lets us have wins. Another app holding
/// Alt+Space (PowerToys Run, uTools, Wox/Flow Launcher, ChatGPT / Copilot desktop…) must NOT stop
/// the app from starting.
const QUICK_SHORTCUTS: [&str; 2] = ["alt+space", "alt+shift+space"];

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // panic = "abort" still runs the hook first, so every panic leaves a line in the log.
    std::panic::set_hook(Box::new(|info| log(&format!("PANIC: {info}"))));

    let mut builder = tauri::Builder::default();

    #[cfg(desktop)]
    {
        // A second launch just focuses the existing window.
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| show_main(app)));
        // ⌥/Alt + Space toggles the quick-pick window from any app. Shortcuts are registered in
        // setup() instead of with_shortcuts(): with_shortcuts() registers inside the plugin's own
        // setup, and a single "already registered" error there aborts the whole app (v0.1–v0.3).
        builder = builder.plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _shortcut, event| {
                    if event.state() == tauri_plugin_global_shortcut::ShortcutState::Pressed {
                        toggle_quick_window(app);
                    }
                })
                .build(),
        );
        builder = builder.plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--hidden"]),
        ));
        builder = builder.plugin(tauri_plugin_drag::init());
    }

    builder
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_opener::init())
        .manage(Shell::<tauri::Wry> { close_to_tray: AtomicBool::new(true), items: Mutex::new(None), shortcut: Mutex::new(None) })
        .invoke_handler(tauri::generate_handler![
            toggle_quick,
            quick_hide,
            show_main_window,
            set_close_to_tray,
            set_tray_labels,
            quick_shortcut,
            drag_prepare
        ])
        .setup(|app| {
            let h = app.handle();

            #[cfg(desktop)]
            let quick_accel: Option<&str> = {
                use tauri_plugin_global_shortcut::GlobalShortcutExt;
                let mut got = None;
                for sc in QUICK_SHORTCUTS {
                    match app.global_shortcut().register(sc) {
                        Ok(()) => { got = Some(sc); break; }
                        Err(e) => log(&format!("global shortcut {sc} unavailable: {e}")),
                    }
                }
                *app.state::<Shell<tauri::Wry>>().shortcut.lock().unwrap() = got;
                got.map(|sc| if sc == "alt+space" { "Alt+Space" } else { "Alt+Shift+Space" })
            };
            #[cfg(not(desktop))]
            let quick_accel: Option<&str> = None;

            let show = MenuItem::with_id(h, "show", "显示主窗口", true, None::<&str>)?;
            let quick = MenuItem::with_id(h, "quick", "速取窗口", true, quick_accel)?;
            let quit = MenuItem::with_id(h, "quit", "退出", true, None::<&str>)?;
            let sep = PredefinedMenuItem::separator(h)?;
            let menu = Menu::with_items(h, &[&show, &quick, &sep, &quit])?;
            let mut tray = TrayIconBuilder::with_id("main");
            if let Some(icon) = app.default_window_icon().cloned() {
                tray = tray.icon(icon);
            }
            let tray = tray
                .tooltip("Icônette")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, e| match e.id().as_ref() {
                    "show" => show_main(app),
                    "quick" => toggle_quick_window(app),
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, e| {
                    if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = e {
                        show_main(tray.app_handle());
                    }
                });
            // A missing tray (e.g. Explorer restarting) is not worth refusing to start over.
            if let Err(e) = tray.build(app) {
                log(&format!("tray icon failed: {e}"));
            }
            *app.state::<Shell<tauri::Wry>>().items.lock().unwrap() = Some([show, quick, quit]);

            // Launched at login: start in the tray.
            if std::env::args().any(|a| a == "--hidden") {
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.hide();
                }
            }
            Ok(())
        })
        .on_window_event(|w, e| match (w.label(), e) {
            ("main", WindowEvent::CloseRequested { api, .. }) => {
                if w.app_handle().state::<Shell<tauri::Wry>>().close_to_tray.load(Ordering::Relaxed) {
                    api.prevent_close();
                    let _ = w.hide();
                } else {
                    w.app_handle().exit(0);
                }
            }
            ("quick", WindowEvent::Focused(false)) => hide_quick(w.app_handle()),
            _ => {}
        })
        .build(tauri::generate_context!())
        .unwrap_or_else(|e| {
            log(&format!("startup failed: {e}"));
            std::process::exit(1);
        })
        .run(|app, e| {
            // macOS: clicking the Dock icon brings the hidden main window back.
            #[cfg(target_os = "macos")]
            if let tauri::RunEvent::Reopen { .. } = e {
                show_main(app);
            }
            let _ = (app, e);
        });
}
