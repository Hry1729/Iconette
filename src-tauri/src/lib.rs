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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    #[cfg(desktop)]
    {
        // A second launch just focuses the existing window.
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| show_main(app)));
        // ⌥/Alt + Space toggles the quick-pick window from any app.
        builder = builder.plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_shortcuts(["alt+space"])
                .expect("valid shortcut")
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
        .manage(Shell::<tauri::Wry> { close_to_tray: AtomicBool::new(true), items: Mutex::new(None) })
        .invoke_handler(tauri::generate_handler![
            toggle_quick,
            quick_hide,
            show_main_window,
            set_close_to_tray,
            set_tray_labels,
            drag_prepare
        ])
        .setup(|app| {
            let h = app.handle();
            let show = MenuItem::with_id(h, "show", "显示主窗口", true, None::<&str>)?;
            let quick = MenuItem::with_id(h, "quick", "速取窗口", true, Some("Alt+Space"))?;
            let quit = MenuItem::with_id(h, "quit", "退出", true, None::<&str>)?;
            let sep = PredefinedMenuItem::separator(h)?;
            let menu = Menu::with_items(h, &[&show, &quick, &sep, &quit])?;
            TrayIconBuilder::with_id("main")
                .icon(app.default_window_icon().cloned().expect("app icon"))
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
                })
                .build(app)?;
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
        .expect("error while building Icônette")
        .run(|app, e| {
            // macOS: clicking the Dock icon brings the hidden main window back.
            #[cfg(target_os = "macos")]
            if let tauri::RunEvent::Reopen { .. } = e {
                show_main(app);
            }
            let _ = (app, e);
        });
}
