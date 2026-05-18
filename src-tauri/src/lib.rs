use serde::{Deserialize, Serialize};
use std::env;
use std::path::PathBuf;
use std::process::Command;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

const CREATE_NO_WINDOW: u32 = 0x08000000;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct HermesStatus {
    installed: bool,
    executable_path: Option<String>,
    version: Option<String>,
    message: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct HermesSetupRequest {
    provider: String,
    model_name: String,
    api_key: String,
    endpoint: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct CommandResult {
    ok: bool,
    message: String,
    output: String,
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

fn run_hidden_command(command: &mut Command) -> Result<CommandResult, String> {
    #[cfg(windows)]
    command.creation_flags(CREATE_NO_WINDOW);

    let output = command.output().map_err(|error| error.to_string())?;
    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
    let combined = [stdout.as_str(), stderr.as_str()]
        .into_iter()
        .filter(|value| !value.is_empty())
        .collect::<Vec<_>>()
        .join("\n");

    Ok(CommandResult {
        ok: output.status.success(),
        message: if output.status.success() {
            "명령이 완료되었습니다.".to_string()
        } else {
            "명령 실행 중 오류가 발생했습니다.".to_string()
        },
        output: combined,
    })
}

#[tauri::command]
fn hermes_status() -> HermesStatus {
    if let Some(path) = find_hermes_executable() {
        let version = run_hidden_command(Command::new(&path).arg("--version"))
            .ok()
            .map(|result| result.output)
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
    let result = run_hidden_command(
        Command::new("powershell.exe")
            .args(["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", &powershell_install_script()])
    )?;

    if result.ok {
        Ok("Hermes 설치가 완료되었습니다. 이제 모델 설정을 진행하세요.".to_string())
    } else {
        Err(if result.output.is_empty() {
            result.message
        } else {
            result.output
        })
    }
}

fn api_key_name_for_provider(provider: &str) -> Option<&'static str> {
    match provider {
        "openrouter" => Some("OPENROUTER_API_KEY"),
        "openai" => Some("OPENAI_API_KEY"),
        "anthropic" => Some("ANTHROPIC_API_KEY"),
        "deepseek" => Some("DEEPSEEK_API_KEY"),
        "google" => Some("GEMINI_API_KEY"),
        "xai" => Some("XAI_API_KEY"),
        "nous" => Some("NOUS_API_KEY"),
        "custom" => Some("OPENAI_API_KEY"),
        _ => None,
    }
}

#[tauri::command]
fn configure_hermes(request: HermesSetupRequest) -> Result<CommandResult, String> {
    let hermes = find_hermes_executable().ok_or_else(|| "Hermes Agent가 아직 설치되지 않았습니다.".to_string())?;
    let model = request.model_name.trim();
    if model.is_empty() {
        return Err("모델명을 입력하세요.".to_string());
    }

    let mut outputs = Vec::new();
    let model_result = run_hidden_command(Command::new(&hermes).args(["config", "set", "model", model]))?;
    outputs.push(model_result.output);
    if !model_result.ok {
        return Ok(CommandResult {
            ok: false,
            message: "Hermes 모델 설정에 실패했습니다.".to_string(),
            output: outputs.join("\n"),
        });
    }

    if let Some(key_name) = api_key_name_for_provider(request.provider.trim()) {
        let api_key = request.api_key.trim();
        if !api_key.is_empty() {
            let key_result = run_hidden_command(Command::new(&hermes).args(["config", "set", key_name, api_key]))?;
            outputs.push(key_result.output);
            if !key_result.ok {
                return Ok(CommandResult {
                    ok: false,
                    message: "Hermes API Key 저장에 실패했습니다.".to_string(),
                    output: outputs.join("\n"),
                });
            }
        }
    }

    if request.provider.trim() == "custom" {
        let endpoint = request.endpoint.trim();
        if !endpoint.is_empty() {
            let endpoint_result = run_hidden_command(Command::new(&hermes).args(["config", "set", "model.base_url", endpoint]))?;
            outputs.push(endpoint_result.output);
            if !endpoint_result.ok {
                return Ok(CommandResult {
                    ok: false,
                    message: "Hermes custom endpoint 저장에 실패했습니다.".to_string(),
                    output: outputs.join("\n"),
                });
            }
        }

        let api_key = request.api_key.trim();
        if !api_key.is_empty() {
            let key_result = run_hidden_command(Command::new(&hermes).args(["config", "set", "model.api_key", api_key]))?;
            outputs.push(key_result.output);
            if !key_result.ok {
                return Ok(CommandResult {
                    ok: false,
                    message: "Hermes custom API key 저장에 실패했습니다.".to_string(),
                    output: outputs.join("\n"),
                });
            }
        }
    }

    Ok(CommandResult {
        ok: true,
        message: "Hermes 기본 설정을 저장했습니다.".to_string(),
        output: outputs
            .into_iter()
            .filter(|value| !value.is_empty())
            .collect::<Vec<_>>()
            .join("\n"),
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            hermes_status,
            install_hermes,
            configure_hermes
        ])
        .run(tauri::generate_context!())
        .expect("error while running QARKO OS");
}
