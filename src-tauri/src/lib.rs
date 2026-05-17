use serde::Serialize;
use std::env;
use std::path::PathBuf;
use std::process::Command;

#[derive(Serialize)]
struct HermesStatus {
    installed: bool,
    executable_path: Option<String>,
    version: Option<String>,
    message: String,
}

fn hermes_candidate_paths() -> Vec<PathBuf> {
    let mut paths = Vec::new();
    if let Ok(local_app_data) = env::var("LOCALAPPDATA") {
        let base = PathBuf::from(local_app_data).join("hermes").join("hermes-agent");
        paths.push(base.join("venv").join("Scripts").join("hermes.exe"));
        paths.push(base.join(".venv").join("Scripts").join("hermes.exe"));
    }
    paths
}

fn find_hermes_executable() -> Option<PathBuf> {
    hermes_candidate_paths()
        .into_iter()
        .find(|path| path.exists())
}

fn powershell_install_script() -> String {
    "$ErrorActionPreference='Stop'; \
     $installer=Join-Path $env:TEMP 'qarko-hermes-install.ps1'; \
     Invoke-WebRequest -UseBasicParsing 'https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.ps1' -OutFile $installer; \
     & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $installer -SkipSetup -NonInteractive"
        .to_string()
}

#[tauri::command]
fn hermes_status() -> HermesStatus {
    if let Some(path) = find_hermes_executable() {
        let version = Command::new(&path)
            .arg("--version")
            .output()
            .ok()
            .map(|output| {
                let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
                let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
                if stdout.is_empty() { stderr } else { stdout }
            })
            .filter(|value| !value.is_empty());

        return HermesStatus {
            installed: true,
            executable_path: Some(path.to_string_lossy().to_string()),
            version,
            message: "Hermes Agent가 설치되어 있습니다.".to_string(),
        };
    }

    HermesStatus {
        installed: false,
        executable_path: None,
        version: None,
        message: "Hermes Agent를 찾지 못했습니다.".to_string(),
    }
}

#[tauri::command]
fn install_hermes() -> Result<String, String> {
    Command::new("powershell.exe")
        .args(["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", &powershell_install_script()])
        .spawn()
        .map_err(|error| error.to_string())?;

    Ok("Hermes 설치 터미널을 열었습니다.".to_string())
}

#[tauri::command]
fn open_hermes_setup() -> Result<String, String> {
    let hermes = find_hermes_executable().ok_or_else(|| "Hermes Agent가 아직 설치되지 않았습니다.".to_string())?;
    let command = format!("\"{}\" setup", hermes.to_string_lossy());
    Command::new("cmd.exe")
        .args(["/K", &command])
        .spawn()
        .map_err(|error| error.to_string())?;

    Ok("Hermes setup 터미널을 열었습니다.".to_string())
}

#[tauri::command]
fn open_hermes_cli() -> Result<String, String> {
    let hermes = find_hermes_executable().ok_or_else(|| "Hermes Agent가 아직 설치되지 않았습니다.".to_string())?;
    let command = format!("\"{}\"", hermes.to_string_lossy());
    Command::new("cmd.exe")
        .args(["/K", &command])
        .spawn()
        .map_err(|error| error.to_string())?;

    Ok("Hermes CLI 터미널을 열었습니다.".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            hermes_status,
            install_hermes,
            open_hermes_setup,
            open_hermes_cli
        ])
        .run(tauri::generate_context!())
        .expect("error while running QARKO OS");
}
