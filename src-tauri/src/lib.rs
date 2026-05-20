use sha2::{Digest, Sha256};
use serde::{Deserialize, Serialize};
use std::env;
use std::fs;
use std::io::Read;
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::thread;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

#[cfg(windows)]
use std::os::windows::process::CommandExt;

const CREATE_NO_WINDOW: u32 = 0x08000000;
const HERMES_INSTALL_COMMIT: &str = "a0bd11d0227239674fe378ff8817f8f6129ef5a7";
const HERMES_INSTALL_SHA256: &str = "E11D0D0CF4FA89041867F362AA10A83B4A9525033F0636D8622C26D22D119064";
static HERMES_INSTALL_IN_PROGRESS: AtomicBool = AtomicBool::new(false);
static HERMES_PROMPT_COUNTER: AtomicU64 = AtomicU64::new(0);

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

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct HermesLoginRequest {
    provider: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct HermesOneShotRequest {
    prompt: String,
    model_name: String,
    provider: String,
    api_key: String,
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
    hermes_candidate_paths().into_iter().find(|path| path.exists())
}

fn qarko_local_app_dir() -> PathBuf {
    env::var("LOCALAPPDATA")
        .map(PathBuf::from)
        .unwrap_or_else(|_| env::temp_dir())
        .join("QARKO OS")
}

fn hermes_verification_marker_path() -> PathBuf {
    qarko_local_app_dir().join("hermes-verified-install.txt")
}

fn canonical_path_text(path: &PathBuf) -> String {
    fs::canonicalize(path)
        .unwrap_or_else(|_| path.to_path_buf())
        .to_string_lossy()
        .to_string()
}

fn file_sha256_hex(path: &PathBuf) -> Result<String, String> {
    let bytes = fs::read(path).map_err(|error| error.to_string())?;
    let digest = Sha256::digest(&bytes);
    Ok(format!("{:X}", digest))
}

fn write_hermes_verified_marker() -> Result<(), String> {
    let hermes = find_hermes_executable().ok_or_else(|| "Hermes Agent 실행 파일을 찾지 못했습니다.".to_string())?;
    let exe_hash = file_sha256_hex(&hermes)?;
    let marker_path = hermes_verification_marker_path();
    if let Some(parent) = marker_path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    fs::write(
        marker_path,
        format!(
            "commit={}\ninstaller_sha256={}\nexe={}\nexe_sha256={}\n",
            HERMES_INSTALL_COMMIT,
            HERMES_INSTALL_SHA256,
            canonical_path_text(&hermes),
            exe_hash
        ),
    )
    .map_err(|error| error.to_string())
}

fn hermes_verified_for_execution(path: &PathBuf) -> bool {
    let marker_path = hermes_verification_marker_path();
    let marker = match fs::read_to_string(&marker_path) {
        Ok(value) => value,
        Err(_) => return false,
    };
    if !marker.contains(HERMES_INSTALL_COMMIT) || !marker.contains(&canonical_path_text(path)) {
        return false;
    }
    let current_hash = match file_sha256_hex(path) {
        Ok(value) => value,
        Err(_) => return false,
    };
    if !marker.contains(&format!("exe_sha256={}", current_hash)) {
        return false;
    }

    let marker_modified = fs::metadata(&marker_path).and_then(|metadata| metadata.modified());
    let exe_modified = fs::metadata(path).and_then(|metadata| metadata.modified());
    match (marker_modified, exe_modified) {
        (Ok(marker_time), Ok(exe_time)) => marker_time >= exe_time,
        _ => false,
    }
}

fn powershell_install_script() -> String {
    format!(
        "$ErrorActionPreference='Stop'; \
         $installer=Join-Path $env:TEMP 'qarko-hermes-install.ps1'; \
         $url='https://raw.githubusercontent.com/NousResearch/hermes-agent/{}/scripts/install.ps1'; \
         Invoke-WebRequest -UseBasicParsing $url -OutFile $installer; \
         $hash=(Get-FileHash -Algorithm SHA256 $installer).Hash.ToUpperInvariant(); \
         if ($hash -ne '{}') {{ throw \"Hermes installer hash mismatch\" }}; \
         & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $installer -SkipSetup -NonInteractive -Commit '{}'",
        HERMES_INSTALL_COMMIT,
        HERMES_INSTALL_SHA256,
        HERMES_INSTALL_COMMIT
    )
}

fn redact_sensitive_output(value: String) -> String {
    let mut redacted_lines = Vec::new();
    for line in value.lines() {
        let lower = line.to_lowercase();
        if lower.contains("api_key")
            || lower.contains("apikey")
            || lower.contains("token")
            || lower.contains("bearer ")
            || line.contains("sk-")
            || line.contains("sk-or-")
        {
            redacted_lines.push("[redacted sensitive output]");
        } else {
            redacted_lines.push(line);
        }
    }
    redacted_lines.join("\n")
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
    let combined = redact_sensitive_output(combined);

    Ok(CommandResult {
        ok: output.status.success(),
        message: if output.status.success() {
            "명령을 완료했습니다.".to_string()
        } else {
            "명령 실행 중 오류가 발생했습니다.".to_string()
        },
        output: combined,
    })
}

fn command_result_from_output(status_success: bool, stdout: &[u8], stderr: &[u8]) -> CommandResult {
    let stdout = String::from_utf8_lossy(stdout).trim().to_string();
    let stderr = String::from_utf8_lossy(stderr).trim().to_string();
    let combined = [stdout.as_str(), stderr.as_str()]
        .into_iter()
        .filter(|value| !value.is_empty())
        .collect::<Vec<_>>()
        .join("\n");
    let combined = redact_sensitive_output(combined);

    CommandResult {
        ok: status_success,
        message: if status_success {
            "명령을 완료했습니다.".to_string()
        } else {
            "명령 실행 중 오류가 발생했습니다.".to_string()
        },
        output: combined,
    }
}

fn run_hidden_command_with_timeout(command: &mut Command, timeout: Duration) -> Result<CommandResult, String> {
    #[cfg(windows)]
    command.creation_flags(CREATE_NO_WINDOW);
    command.stdout(Stdio::piped()).stderr(Stdio::piped());

    let start = Instant::now();
    let mut child = command.spawn().map_err(|error| error.to_string())?;
    let mut stdout = child.stdout.take().ok_or_else(|| "stdout pipe를 열지 못했습니다.".to_string())?;
    let mut stderr = child.stderr.take().ok_or_else(|| "stderr pipe를 열지 못했습니다.".to_string())?;
    let stdout_handle = thread::spawn(move || {
        let mut buffer = Vec::new();
        let _ = stdout.read_to_end(&mut buffer);
        buffer
    });
    let stderr_handle = thread::spawn(move || {
        let mut buffer = Vec::new();
        let _ = stderr.read_to_end(&mut buffer);
        buffer
    });

    loop {
        if let Some(status) = child.try_wait().map_err(|error| error.to_string())? {
            let stdout = stdout_handle.join().unwrap_or_default();
            let stderr = stderr_handle.join().unwrap_or_default();
            return Ok(command_result_from_output(status.success(), &stdout, &stderr));
        }
        if start.elapsed() >= timeout {
            #[cfg(windows)]
            {
                let _ = Command::new("taskkill")
                    .args(["/PID", &child.id().to_string(), "/T", "/F"])
                    .creation_flags(CREATE_NO_WINDOW)
                    .output();
            }
            let _ = child.kill();
            let _ = child.wait();
            let _ = stdout_handle.join();
            let _ = stderr_handle.join();
            return Ok(CommandResult {
                ok: false,
                message: "Hermes 실행 시간이 초과되었습니다.".to_string(),
                output: "Hermes 실행이 3분 안에 끝나지 않아 중단했습니다. 인증 상태나 네트워크를 확인한 뒤 다시 시도하세요.".to_string(),
            });
        }
        thread::sleep(Duration::from_millis(250));
    }
}

struct HermesInstallGuard;

impl HermesInstallGuard {
    fn acquire() -> Result<Self, String> {
        HERMES_INSTALL_IN_PROGRESS
            .compare_exchange(false, true, Ordering::Acquire, Ordering::Relaxed)
            .map(|_| HermesInstallGuard)
            .map_err(|_| "Hermes 설치 또는 업데이트가 이미 진행 중입니다. 완료 후 다시 시도하세요.".to_string())
    }
}

impl Drop for HermesInstallGuard {
    fn drop(&mut self) {
        HERMES_INSTALL_IN_PROGRESS.store(false, Ordering::Release);
    }
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
    let _guard = HermesInstallGuard::acquire()?;
    let result = run_hidden_command(Command::new("powershell.exe").args([
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        &powershell_install_script(),
    ]))?;
    if result.ok {
        write_hermes_verified_marker()?;
    }

    if result.ok {
        Ok("Hermes 설치가 완료되었습니다. 이제 모델 설정을 진행하세요.".to_string())
    } else {
        Err(if result.output.is_empty() { result.message } else { result.output })
    }
}

#[tauri::command]
fn update_hermes_verified() -> Result<String, String> {
    let _guard = HermesInstallGuard::acquire()?;
    let result = run_hidden_command(Command::new("powershell.exe").args([
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        &powershell_install_script(),
    ]))?;
    if result.ok {
        write_hermes_verified_marker()?;
    }

    if result.ok {
        Ok("Hermes를 QARKO 검증 버전으로 업데이트/복구했습니다. 모델 설정을 다시 확인하세요.".to_string())
    } else {
        Err(if result.output.is_empty() { result.message } else { result.output })
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

struct HermesProviderConfig {
    provider: &'static str,
    base_url: Option<&'static str>,
    api_mode: Option<&'static str>,
}

fn hermes_provider_config(provider: &str) -> Option<HermesProviderConfig> {
    match provider {
        "openai-codex" => Some(HermesProviderConfig {
            provider: "openai-codex",
            base_url: Some("https://chatgpt.com/backend-api/codex"),
            api_mode: None,
        }),
        "openai" => Some(HermesProviderConfig {
            provider: "openai",
            base_url: Some("https://api.openai.com/v1"),
            api_mode: Some("chat_completions"),
        }),
        "openrouter" => Some(HermesProviderConfig {
            provider: "openrouter",
            base_url: Some("https://openrouter.ai/api/v1"),
            api_mode: Some("chat_completions"),
        }),
        "anthropic" => Some(HermesProviderConfig {
            provider: "anthropic",
            base_url: Some("https://api.anthropic.com"),
            api_mode: None,
        }),
        "nous" => Some(HermesProviderConfig {
            provider: "nous",
            base_url: None,
            api_mode: None,
        }),
        "deepseek" => Some(HermesProviderConfig {
            provider: "deepseek",
            base_url: Some("https://api.deepseek.com/v1"),
            api_mode: Some("chat_completions"),
        }),
        "google" => Some(HermesProviderConfig {
            provider: "gemini",
            base_url: Some("https://generativelanguage.googleapis.com/v1beta/openai"),
            api_mode: Some("chat_completions"),
        }),
        "custom" => Some(HermesProviderConfig {
            provider: "custom",
            base_url: None,
            api_mode: Some("chat_completions"),
        }),
        _ => None,
    }
}

fn set_hermes_config(hermes: &PathBuf, key: &str, value: &str) -> Result<CommandResult, String> {
    run_hidden_command(Command::new(hermes).args(["config", "set", key, value]))
}

#[tauri::command]
fn configure_hermes(request: HermesSetupRequest) -> Result<CommandResult, String> {
    let hermes = find_hermes_executable().ok_or_else(|| "Hermes Agent가 아직 설치되지 않았습니다.".to_string())?;
    let model = request.model_name.trim();
    if model.is_empty() {
        return Err("모델명을 입력하세요.".to_string());
    }
    let provider = request.provider.trim();
    let provider_config = hermes_provider_config(provider)
        .ok_or_else(|| "지원하지 않는 Hermes 제공자입니다.".to_string())?;

    let mut outputs = Vec::new();
    if api_key_name_for_provider(provider).is_some() && !request.api_key.trim().is_empty() {
        return Ok(CommandResult {
            ok: false,
            message: "보안을 위해 API 키를 Hermes CLI 명령 인자로 저장하지 않습니다. 키는 연결 테스트에만 임시 사용됩니다.".to_string(),
            output: outputs.join("\n"),
        });
    }

    for (key, value, error_message) in [
        ("model.default", model, "Hermes 모델 저장에 실패했습니다."),
        ("model.provider", provider_config.provider, "Hermes 제공자 저장에 실패했습니다."),
    ] {
        let result = set_hermes_config(&hermes, key, value)?;
        outputs.push(result.output);
        if !result.ok {
            return Ok(CommandResult {
                ok: false,
                message: error_message.to_string(),
                output: outputs.join("\n"),
            });
        }
    }

    let endpoint = if provider == "custom" {
        request.endpoint.trim()
    } else {
        provider_config.base_url.unwrap_or("")
    };
    let endpoint_result = set_hermes_config(&hermes, "model.base_url", endpoint)?;
    outputs.push(endpoint_result.output);
    if !endpoint_result.ok {
        return Ok(CommandResult {
            ok: false,
            message: "Hermes API 주소 저장에 실패했습니다.".to_string(),
            output: outputs.join("\n"),
        });
    }

    let api_mode_result = set_hermes_config(&hermes, "model.api_mode", provider_config.api_mode.unwrap_or(""))?;
    outputs.push(api_mode_result.output);
    if !api_mode_result.ok {
        return Ok(CommandResult {
            ok: false,
            message: "Hermes API 모드 저장에 실패했습니다.".to_string(),
            output: outputs.join("\n"),
        });
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

#[tauri::command]
fn login_hermes_provider(request: HermesLoginRequest) -> Result<CommandResult, String> {
    let hermes = find_hermes_executable().ok_or_else(|| "Hermes Agent가 아직 설치되지 않았습니다.".to_string())?;
    let provider = request.provider.trim();
    let allowed_provider = match provider {
        "nous" | "openai-codex" | "xai-oauth" | "qwen-oauth" | "google-gemini-cli" | "minimax-oauth" => provider,
        _ => return Err("이 제공자는 QARKO OS OAuth 로그인에서 아직 지원하지 않습니다.".to_string()),
    };

    let result = run_hidden_command(Command::new(&hermes).args([
        "auth",
        "add",
        allowed_provider,
        "--type",
        "oauth",
        "--timeout",
        "240",
    ]))?;

    if result.ok {
        Ok(CommandResult {
            ok: true,
            message: "Hermes OAuth 인증이 완료되었습니다. 이제 사용할 모델을 선택하고 저장하세요.".to_string(),
            output: "OAuth 인증 명령이 완료되었습니다. 보안을 위해 인증 출력 원문은 표시하지 않습니다.".to_string(),
        })
    } else {
        Ok(CommandResult {
            ok: false,
            message: "Hermes OAuth 로그인이 완료되지 않았습니다.".to_string(),
            output: result.output,
        })
    }
}

#[tauri::command]
fn run_hermes_oneshot(request: HermesOneShotRequest) -> Result<CommandResult, String> {
    let hermes = find_hermes_executable().ok_or_else(|| "Hermes Agent가 아직 설치되지 않았습니다.".to_string())?;
    if !hermes_verified_for_execution(&hermes) {
        return Err("Hermes 실행 파일이 QARKO 검증 설치 상태와 일치하지 않습니다. 설정 마법사에서 검증 버전 복구/업데이트를 먼저 실행하세요.".to_string());
    }
    let prompt = request.prompt.trim();
    let model = request.model_name.trim();
    let provider = request.provider.trim();
    let provider_config = hermes_provider_config(provider)
        .ok_or_else(|| "지원하지 않는 Hermes 제공자입니다.".to_string())?;

    let api_key = request.api_key.trim();
    if api_key_name_for_provider(provider).is_some() && api_key.is_empty() {
        return Err("API 키 방식 모델은 실행 전에 키를 입력해야 합니다. QARKO OS는 보안을 위해 API 키를 저장하지 않으므로 앱을 다시 열면 다시 입력하세요.".to_string());
    }

    if prompt.is_empty() {
        return Err("Hermes에 보낼 작업 내용이 비어 있습니다.".to_string());
    }
    if prompt.len() > 12000 {
        return Err("작업 내용이 너무 깁니다. 프로젝트 목표를 조금 줄인 뒤 다시 실행하세요.".to_string());
    }

    let runtime_dir = qarko_local_app_dir().join("runtime");
    fs::create_dir_all(&runtime_dir).map_err(|error| error.to_string())?;
    let now_nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_nanos())
        .unwrap_or(0);
    let prompt_path = runtime_dir.join(format!(
        "qarko-hermes-prompt-{}-{}-{}.txt",
        std::process::id(),
        HERMES_PROMPT_COUNTER.fetch_add(1, Ordering::Relaxed),
        now_nanos
    ));
    fs::write(&prompt_path, prompt).map_err(|error| error.to_string())?;
    let query = format!(
        "Read the local task file at this exact path and follow its instructions. File: {}",
        prompt_path.to_string_lossy()
    );

    let mut command = Command::new(&hermes);
    if !api_key.is_empty() {
        if let Some(env_name) = api_key_name_for_provider(provider) {
            command.env(env_name, api_key);
        }
    }
    command.args([
        "chat",
        "-q",
        query.as_str(),
        "-Q",
        "--max-turns",
        "3",
        "--provider",
        provider_config.provider,
        "--source",
        "qarko-os",
    ]);
    if !model.is_empty() {
        command.args(["--model", model]);
    }

    let result = run_hidden_command_with_timeout(&mut command, Duration::from_secs(180));
    let _ = fs::remove_file(prompt_path);
    let result = result?;
    if result.ok {
        Ok(CommandResult {
            ok: true,
            message: "Hermes가 MVP 실행 초안을 생성했습니다.".to_string(),
            output: result.output,
        })
    } else {
        Ok(CommandResult {
            ok: false,
            message: "Hermes 실행에 실패했습니다.".to_string(),
            output: result.output,
        })
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            hermes_status,
            install_hermes,
            update_hermes_verified,
            configure_hermes,
            login_hermes_provider,
            run_hermes_oneshot
        ])
        .run(tauri::generate_context!())
        .expect("error while running QARKO OS");
}
