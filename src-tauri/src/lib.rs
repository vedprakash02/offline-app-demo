use tauri::Manager;
use tauri_plugin_shell::ShellExt;
mod license;

use std::fs::OpenOptions;
use std::io::Write;
use std::path::Path;

fn log(log_dir: &Path, msg: &str) {
    let _ = std::fs::create_dir_all(log_dir);

    if let Ok(mut f) = OpenOptions::new()
        .create(true)
        .append(true)
        .open(log_dir.join("sidecar-debug.log"))
    {
        let _ = writeln!(f, "{msg}");
    }
}

fn start_sidecar(app: &tauri::App, name: &str, log_dir: &Path, envs: &[(&str, &Path)]) {
    let command = match app.shell().sidecar(name) {
        Ok(command) => command,
        Err(error) => {
            log(log_dir, &format!("{name} sidecar not found: {error}"));
            return;
        }
    };
    let command = envs
        .iter()
        .fold(command, |command, (key, value)| command.env(*key, *value));
    // Debug builds bypass licensing; release installers start a configurable demo trial.
    let command = if name == "backend-erp" {
        if cfg!(debug_assertions) {
            command.env("DEVELOPER_BYPASS_LICENSE", "1")
        } else {
            command.env(
                "DEMO_TRIAL_MONTHS",
                option_env!("DEMO_TRIAL_MONTHS").unwrap_or("3"),
            )
        }
    } else {
        command
    };
    match command.spawn() {
        Ok((mut receiver, child)) => {
            log(
                log_dir,
                &format!("{name} sidecar started; pid = {:?}", child.pid()),
            );
            let log_dir = log_dir.to_path_buf();
            let name = name.to_owned();
            tauri::async_runtime::spawn(async move {
                while let Some(event) = receiver.recv().await {
                    log(&log_dir, &format!("{name} sidecar event: {event:?}"));
                }
            });
        }
        Err(error) => log(log_dir, &format!("{name} sidecar failed to start: {error}")),
    }
}
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![license::demo_status, license::activate_demo])
        .setup(|app| {
            let app_data_dir = app
                .path()
                .local_data_dir()
                .map(|dir| dir.join("Vidya Prabandh Demo"))
                .unwrap_or_else(|_| std::env::current_dir().unwrap().join("Vidya Prabandh Demo"));
            let _ = std::fs::create_dir_all(&app_data_dir);

            // Move the legacy ID-card data only when no new data exists yet.
            let legacy_root = std::env::var_os("LOCALAPPDATA")
                .map(std::path::PathBuf::from)
                .unwrap_or_else(|| app_data_dir.parent().unwrap_or(&app_data_dir).to_path_buf())
                .join("SIRF ID Attendance");
            let id_card_data_dir = app_data_dir.join("id-card-data");
            if legacy_root.join("data").exists() && !id_card_data_dir.exists() {
                if let Err(error) = std::fs::rename(legacy_root.join("data"), &id_card_data_dir) {
                    log(
                        &app_data_dir,
                        &format!("ID-card data migration failed: {error}"),
                    );
                }
            }
            if legacy_root.join("admin.key").exists() && !app_data_dir.join("admin.key").exists() {
                if let Err(error) = std::fs::rename(
                    legacy_root.join("admin.key"),
                    app_data_dir.join("admin.key"),
                ) {
                    log(
                        &app_data_dir,
                        &format!("Admin key migration failed: {error}"),
                    );
                }
            }
            let _ = std::fs::create_dir_all(&id_card_data_dir);
            log(&app_data_dir, &format!("app_data_dir = {:?}", app_data_dir));

            let uploads_dir = app_data_dir.join("uploads");
            let license_dir = app_data_dir.join("license");
            if let Err(e) = std::fs::create_dir_all(&license_dir) {
                log(&app_data_dir, &format!("license folder error: {e}"));
            }
            if let Err(e) = std::fs::create_dir_all(&uploads_dir) {
                log(&app_data_dir, &format!("uploads folder error: {e}"));
            }

            start_sidecar(
                app,
                "backend-erp",
                &app_data_dir,
                &[
                    ("UPLOADS_DIR", &uploads_dir),
                    ("ERP_LICENSE_DIR", &license_dir),
                ],
            );
            start_sidecar(
                app,
                "backend-id",
                &app_data_dir,
                &[
                    ("SIRF_ID_DATA_DIR", &id_card_data_dir),
                    ("SIRF_ID_APP_DIR", &app_data_dir),
                ],
            );

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
