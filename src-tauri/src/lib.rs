use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::{HashMap, HashSet};
use std::env;
use std::fs;
use std::fs::File;
use std::io::{BufRead, BufReader, Read, Write};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::mpsc;
use std::thread;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

#[cfg(windows)]
use std::os::windows::process::CommandExt;

const CREATE_NO_WINDOW: u32 = 0x08000000;
const HERMES_INSTALL_COMMIT: &str = "a0bd11d0227239674fe378ff8817f8f6129ef5a7";
const HERMES_INSTALL_SHA256: &str =
    "E11D0D0CF4FA89041867F362AA10A83B4A9525033F0636D8622C26D22D119064";
static HERMES_INSTALL_IN_PROGRESS: AtomicBool = AtomicBool::new(false);
static HERMES_PROMPT_COUNTER: AtomicU64 = AtomicU64::new(0);

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct HermesStatus {
    installed: bool,
    verified: bool,
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
struct HermesToolPresetRequest {
    mode: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct HermesOneShotRequest {
    prompt: String,
    model_name: String,
    provider: String,
    api_key: String,
    project_id: Option<String>,
    run_id: Option<String>,
    session_id: Option<String>,
    toolsets: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct HermesGatewayTurnRequest {
    prompt: String,
    model_name: String,
    provider: String,
    api_key: String,
    project_id: Option<String>,
    run_id: Option<String>,
    session_id: Option<String>,
    gateway_session_id: Option<String>,
    toolsets: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct HermesGatewayControlRequest {
    session_id: Option<String>,
    request_id: Option<String>,
    method: String,
    approved: Option<bool>,
    response: Option<String>,
    prompt: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct CommandResult {
    ok: bool,
    message: String,
    output: String,
    workspace_path: Option<String>,
    session_id: Option<String>,
    change_summary: Option<WorkspaceChangeSummary>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct HermesGatewayEvent {
    id: String,
    kind: String,
    title: String,
    message: String,
    status: String,
    timestamp: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct HermesGatewayTurnResult {
    ok: bool,
    message: String,
    output: String,
    workspace_path: Option<String>,
    session_id: Option<String>,
    gateway_session_id: Option<String>,
    change_summary: Option<WorkspaceChangeSummary>,
    gateway_events: Vec<HermesGatewayEvent>,
    fallback_to_one_shot: bool,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct WorkspaceChangeSummary {
    files_changed: usize,
    insertions: usize,
    deletions: usize,
    files: Vec<WorkspaceChangedFile>,
    truncated: bool,
    files_truncated: bool,
    file_limit: usize,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct WorkspaceChangedFile {
    path: String,
    status: String,
    insertions: usize,
    deletions: usize,
}

#[derive(Clone)]
struct WorkspaceFileSnapshot {
    lines: usize,
    hash: String,
}

struct WorkspaceChangeSnapshot {
    files: HashMap<String, WorkspaceFileSnapshot>,
    truncated: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct HermesHealthReport {
    ok: bool,
    config_path: Option<String>,
    env_path: Option<String>,
    status_output: String,
    doctor_output: String,
    tools_output: String,
    message: String,
}

fn hermes_candidate_paths() -> Vec<PathBuf> {
    let mut paths = Vec::new();
    if let Ok(local_app_data) = env::var("LOCALAPPDATA") {
        let base = PathBuf::from(local_app_data)
            .join("hermes")
            .join("hermes-agent");
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

fn qarko_local_app_dir() -> PathBuf {
    env::var("LOCALAPPDATA")
        .map(PathBuf::from)
        .unwrap_or_else(|_| env::temp_dir())
        .join("QARKO OS")
}

fn qarko_workspace_root() -> PathBuf {
    env::var("USERPROFILE")
        .map(PathBuf::from)
        .unwrap_or_else(|_| qarko_local_app_dir())
        .join("QARKO")
        .join("workspaces")
}

fn sanitize_workspace_segment(value: &str) -> String {
    let cleaned = value
        .chars()
        .map(|ch| {
            if ch.is_ascii_alphanumeric() || ch == '-' || ch == '_' {
                ch
            } else {
                '-'
            }
        })
        .collect::<String>()
        .trim_matches('-')
        .to_string();
    if cleaned.is_empty() {
        "default".to_string()
    } else {
        cleaned.chars().take(64).collect()
    }
}

fn qarko_workspace_dir(
    project_id: Option<String>,
    run_id: Option<String>,
) -> Result<PathBuf, String> {
    let project = sanitize_workspace_segment(project_id.as_deref().unwrap_or("project"));
    let run = sanitize_workspace_segment(run_id.as_deref().unwrap_or("run"));
    let dir = qarko_workspace_root().join(project).join(run);
    fs::create_dir_all(&dir).map_err(|error| error.to_string())?;
    Ok(dir)
}

fn verified_qarko_workspace_path(path: &str) -> Result<PathBuf, String> {
    let candidate = Path::new(path);
    if path.trim().is_empty() {
        return Err("Workspace path is empty.".to_string());
    }
    if !candidate.exists() {
        return Err("Workspace path does not exist yet.".to_string());
    }
    let root = qarko_workspace_root();
    fs::create_dir_all(&root).map_err(|error| error.to_string())?;
    let root = fs::canonicalize(&root).map_err(|error| error.to_string())?;
    let candidate = fs::canonicalize(candidate).map_err(|error| error.to_string())?;
    if !candidate.starts_with(&root) {
        return Err("QARKO can only open folders inside its own workspace directory.".to_string());
    }
    Ok(candidate)
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

fn should_skip_change_summary_path(path: &Path) -> bool {
    path.components().any(|component| {
        let value = component.as_os_str().to_string_lossy().to_ascii_lowercase();
        matches!(
            value.as_str(),
            ".git" | "node_modules" | "target" | "dist" | "build" | ".next" | ".venv" | "__pycache__"
        )
    })
}

const WORKSPACE_CHANGE_FILE_LIMIT: usize = 5000;
const WORKSPACE_CHANGED_FILE_DISPLAY_LIMIT: usize = 50;

fn snapshot_workspace_changes(root: &Path) -> WorkspaceChangeSnapshot {
    fn visit(
        root: &Path,
        canonical_root: &Path,
        dir: &Path,
        files: &mut HashMap<String, WorkspaceFileSnapshot>,
        visited: &mut usize,
    ) {
        if *visited >= WORKSPACE_CHANGE_FILE_LIMIT {
            return;
        }
        let entries = match fs::read_dir(dir) {
            Ok(entries) => entries,
            Err(_) => return,
        };
        for entry in entries.flatten() {
            if *visited >= WORKSPACE_CHANGE_FILE_LIMIT {
                return;
            }
            let path = entry.path();
            if should_skip_change_summary_path(&path) {
                continue;
            }
            let metadata = match fs::symlink_metadata(&path) {
                Ok(metadata) => metadata,
                Err(_) => continue,
            };
            if metadata.file_type().is_symlink() {
                continue;
            }
            if metadata.is_dir() {
                let Ok(canonical_dir) = fs::canonicalize(&path) else {
                    continue;
                };
                if !canonical_dir.starts_with(canonical_root) {
                    continue;
                }
                visit(root, canonical_root, &path, files, visited);
                continue;
            }
            if !metadata.is_file() || metadata.len() > 1_000_000 {
                continue;
            }
            *visited += 1;
            let Ok(bytes) = fs::read(&path) else {
                continue;
            };
            if bytes.contains(&0) {
                continue;
            }
            let relative_path = path
                .strip_prefix(root)
                .unwrap_or(path.as_path())
                .to_string_lossy()
                .replace('\\', "/");
            let line_count = String::from_utf8_lossy(&bytes).lines().count();
            let hash = format!("{:X}", Sha256::digest(&bytes));
            files.insert(
                relative_path,
                WorkspaceFileSnapshot {
                    lines: line_count,
                    hash,
                },
            );
        }
    }

    let mut files = HashMap::new();
    let canonical_root = fs::canonicalize(root).unwrap_or_else(|_| root.to_path_buf());
    let mut visited = 0;
    visit(root, &canonical_root, root, &mut files, &mut visited);
    WorkspaceChangeSnapshot {
        files,
        truncated: visited >= WORKSPACE_CHANGE_FILE_LIMIT,
    }
}

fn summarize_workspace_changes(
    before: &WorkspaceChangeSnapshot,
    after: &WorkspaceChangeSnapshot,
) -> WorkspaceChangeSummary {
    let mut files_changed = 0;
    let mut insertions = 0;
    let mut deletions = 0;
    let mut files = Vec::new();
    let paths = before
        .files
        .keys()
        .chain(after.files.keys())
        .cloned()
        .collect::<HashSet<_>>();

    for path in paths {
        match (before.files.get(&path), after.files.get(&path)) {
            (Some(previous), Some(current)) if previous.hash == current.hash => {}
            (Some(previous), Some(current)) => {
                files_changed += 1;
                let mut file_insertions = 0;
                let mut file_deletions = 0;
                if current.lines > previous.lines {
                    file_insertions = current.lines - previous.lines;
                    insertions += file_insertions;
                } else if previous.lines > current.lines {
                    file_deletions = previous.lines - current.lines;
                    deletions += file_deletions;
                } else {
                    file_insertions = 1;
                    file_deletions = 1;
                    insertions += 1;
                    deletions += 1;
                }
                files.push(WorkspaceChangedFile {
                    path,
                    status: "modified".to_string(),
                    insertions: file_insertions,
                    deletions: file_deletions,
                });
            }
            (None, Some(current)) => {
                files_changed += 1;
                insertions += current.lines;
                files.push(WorkspaceChangedFile {
                    path,
                    status: "added".to_string(),
                    insertions: current.lines,
                    deletions: 0,
                });
            }
            (Some(previous), None) => {
                files_changed += 1;
                deletions += previous.lines;
                files.push(WorkspaceChangedFile {
                    path,
                    status: "deleted".to_string(),
                    insertions: 0,
                    deletions: previous.lines,
                });
            }
            (None, None) => {}
        }
    }
    files.sort_by(|left, right| left.path.cmp(&right.path));
    let files_truncated = files.len() > WORKSPACE_CHANGED_FILE_DISPLAY_LIMIT;
    files.truncate(WORKSPACE_CHANGED_FILE_DISPLAY_LIMIT);

    WorkspaceChangeSummary {
        files_changed,
        insertions,
        deletions,
        files,
        truncated: before.truncated || after.truncated,
        files_truncated,
        file_limit: WORKSPACE_CHANGE_FILE_LIMIT,
    }
}

fn file_sha256_hex(path: &PathBuf) -> Result<String, String> {
    let bytes = fs::read(path).map_err(|error| error.to_string())?;
    let digest = Sha256::digest(&bytes);
    Ok(format!("{:X}", digest))
}

fn write_hermes_verified_marker() -> Result<(), String> {
    let hermes = find_hermes_executable()
        .ok_or_else(|| "Hermes Agent executable was not found after install.".to_string())?;
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

fn verified_hermes_executable() -> Result<PathBuf, String> {
    let hermes =
        find_hermes_executable().ok_or_else(|| "Hermes Agent is not installed yet.".to_string())?;
    if !hermes_verified_for_execution(&hermes) {
        return Err("Hermes executable does not match the QARKO verified install state. Run repair/update from the setup wizard first.".to_string());
    }
    Ok(hermes)
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
    let clean_value = strip_ansi_codes(&value);
    for line in clean_value.lines() {
        let lower = line.to_lowercase();
        if is_hermes_session_id_line(line)
            || lower.contains("api_key")
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

fn is_hermes_session_id_line(value: &str) -> bool {
    let line = value.trim();
    line.to_lowercase().starts_with("session_id:") || line.starts_with("Session ID:")
}

fn strip_ansi_codes(value: &str) -> String {
    let mut result = String::new();
    let mut chars = value.chars().peekable();
    while let Some(ch) = chars.next() {
        if ch == '\u{1b}' && chars.peek() == Some(&'[') {
            let _ = chars.next();
            while let Some(next) = chars.next() {
                if next.is_ascii_alphabetic() {
                    break;
                }
            }
        } else {
            result.push(ch);
        }
    }
    result
}

fn extract_hermes_session_id(value: &str) -> Option<String> {
    let clean_value = strip_ansi_codes(value);
    for line in clean_value.lines() {
        let line = line.trim();
        let raw_id = if let Some(rest) = line
            .to_lowercase()
            .strip_prefix("session_id:")
            .map(|rest| rest.len())
        {
            let offset = line.len() - rest;
            line[offset..].trim()
        } else if let Some(rest) = line.strip_prefix("Session ID:") {
            rest.trim()
        } else {
            continue;
        };
        if raw_id
            .chars()
            .all(|ch| ch.is_ascii_alphanumeric() || ch == '_' || ch == '-')
            && !raw_id.is_empty()
        {
            return Some(raw_id.to_string());
        }
    }
    None
}

fn validate_hermes_session_id(value: Option<&str>) -> Result<Option<String>, String> {
    let Some(session_id) = value.map(str::trim).filter(|value| !value.is_empty()) else {
        return Ok(None);
    };
    if !session_id
        .chars()
        .all(|ch| ch.is_ascii_alphanumeric() || ch == '_' || ch == '-')
    {
        return Err("Hermes session id is invalid. QARKO cleared the stored session pointer; try this request again.".to_string());
    }
    Ok(Some(session_id.to_string()))
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
            "Command completed.".to_string()
        } else {
            "Command failed.".to_string()
        },
        output: combined,
        workspace_path: None,
        session_id: None,
        change_summary: None,
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
    let session_id = extract_hermes_session_id(&stderr);
    let combined = redact_sensitive_output(combined);

    CommandResult {
        ok: status_success,
        message: if status_success {
            "Command completed.".to_string()
        } else {
            "Command failed.".to_string()
        },
        output: combined,
        workspace_path: None,
        session_id,
        change_summary: None,
    }
}

fn run_hidden_command_with_timeout(
    command: &mut Command,
    timeout: Duration,
) -> Result<CommandResult, String> {
    #[cfg(windows)]
    command.creation_flags(CREATE_NO_WINDOW);
    command.stdout(Stdio::piped()).stderr(Stdio::piped());

    let start = Instant::now();
    let mut child = command.spawn().map_err(|error| error.to_string())?;
    let mut stdout = child
        .stdout
        .take()
        .ok_or_else(|| "Could not open stdout pipe.".to_string())?;
    let mut stderr = child
        .stderr
        .take()
        .ok_or_else(|| "Could not open stderr pipe.".to_string())?;
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
            return Ok(command_result_from_output(
                status.success(),
                &stdout,
                &stderr,
            ));
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
                message: "Hermes execution timed out.".to_string(),
                output: "Hermes did not finish within 3 minutes. Check auth, network, and model settings, then try again.".to_string(),
                workspace_path: None,
                session_id: None,
                change_summary: None,
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
            .map_err(|_| "Hermes install or update is already running. Wait for it to finish, then try again.".to_string())
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
        let verified = hermes_verified_for_execution(&path);
        let version = if verified {
            run_hidden_command(Command::new(&path).arg("--version"))
                .ok()
                .map(|result| result.output)
                .filter(|value| !value.is_empty())
        } else {
            None
        };

        return HermesStatus {
            installed: true,
            verified,
            executable_path: Some(path.to_string_lossy().to_string()),
            version,
            message: if verified {
                "Hermes Agent is installed and verified.".to_string()
            } else {
                "Hermes Agent was found, but QARKO has not verified this install. Run repair/update before setup or auth.".to_string()
            },
        };
    }

    HermesStatus {
        installed: false,
        verified: false,
        executable_path: None,
        version: None,
        message: "Hermes Agent was not found. Install Hermes before setup or auth.".to_string(),
    }
}

#[tauri::command]
async fn install_hermes() -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(|| {
        let _guard = HermesInstallGuard::acquire()?;
        let script = powershell_install_script();
        let result = run_hidden_command(Command::new("powershell.exe").args([
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            script.as_str(),
        ]))?;
        if result.ok {
            write_hermes_verified_marker()?;
        }

        if result.ok {
            Ok("Hermes installation is complete. Continue with model setup.".to_string())
        } else {
            Err(if result.output.is_empty() {
                result.message
            } else {
                result.output
            })
        }
    })
    .await
    .map_err(|error| error.to_string())?
}

#[tauri::command]
async fn update_hermes_verified() -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(|| {
        let _guard = HermesInstallGuard::acquire()?;
        let script = powershell_install_script();
        let result = run_hidden_command(Command::new("powershell.exe").args([
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            script.as_str(),
        ]))?;
        if result.ok {
            write_hermes_verified_marker()?;
        }

        if result.ok {
            Ok(
                "Hermes was repaired/updated to the QARKO verified version. Check model setup again."
                    .to_string(),
            )
        } else {
            Err(if result.output.is_empty() {
                result.message
            } else {
                result.output
            })
        }
    })
    .await
    .map_err(|error| error.to_string())?
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

fn run_optional_hermes_command(hermes: &PathBuf, args: &[&str]) -> CommandResult {
    run_hidden_command(Command::new(hermes).args(args)).unwrap_or_else(|error| CommandResult {
        ok: false,
        message: error,
        output: String::new(),
        workspace_path: None,
        session_id: None,
        change_summary: None,
    })
}

fn command_output_or_empty(result: &CommandResult) -> String {
    if result.output.is_empty() {
        result.message.clone()
    } else {
        result.output.clone()
    }
}

fn extract_first_https_url(value: &str) -> Option<String> {
    let start = value.find("https://")?;
    let tail = &value[start..];
    let url = tail
        .chars()
        .take_while(|ch| !ch.is_whitespace() && !ch.is_control() && *ch != '\u{1b}')
        .collect::<String>();
    if url.starts_with("https://") {
        Some(url)
    } else {
        None
    }
}

fn open_url_in_default_browser(url: &str) {
    if !url.starts_with("https://") {
        return;
    }
    #[cfg(windows)]
    {
        let _ = Command::new("rundll32.exe")
            .args(["url.dll,FileProtocolHandler", url])
            .creation_flags(CREATE_NO_WINDOW)
            .spawn();
    }
}

fn wait_for_auth_output(log_path: &PathBuf, timeout: Duration) -> String {
    let start = Instant::now();
    let mut last_output = String::new();
    while start.elapsed() < timeout {
        let output = fs::read_to_string(log_path).unwrap_or_default();
        if extract_first_https_url(&output).is_some()
            || output.contains("Enter this code")
            || output.contains("Waiting for sign-in")
        {
            return output;
        }
        if !output.trim().is_empty() {
            last_output = output;
        }
        thread::sleep(Duration::from_millis(500));
    }
    last_output
}

fn cmd_quote(value: &str) -> String {
    format!("\"{}\"", value.replace('"', "\\\""))
}

fn open_visible_hermes_terminal(args: &[&str], title: &str) -> Result<(), String> {
    let hermes = verified_hermes_executable()?;
    let mut command_line = cmd_quote(&hermes.to_string_lossy());
    for arg in args {
        command_line.push(' ');
        command_line.push_str(&cmd_quote(arg));
    }
    command_line.push_str(
        " & echo. & echo QARKO OS: You can close this window after the Hermes task finishes.",
    );

    Command::new("cmd.exe")
        .args(["/C", "start", title, "cmd.exe", "/K", &command_line])
        .spawn()
        .map_err(|error| error.to_string())?;
    Ok(())
}

fn oauth_provider_allowed(provider: &str) -> bool {
    matches!(
        provider,
        "nous"
            | "openai-codex"
            | "xai-oauth"
            | "qwen-oauth"
            | "google-gemini-cli"
            | "minimax-oauth"
    )
}

#[tauri::command]
fn open_hermes_setup_terminal(section: Option<String>) -> Result<CommandResult, String> {
    let section = section.unwrap_or_default();
    let section = section.trim();
    let mut args = vec!["setup"];
    if !section.is_empty() {
        match section {
            "model" | "tts" | "terminal" | "gateway" | "tools" | "agent" => args.push(section),
            _ => return Err("Unsupported Hermes setup section.".to_string()),
        }
    }
    open_visible_hermes_terminal(&args, "QARKO Hermes Setup")?;
    Ok(CommandResult {
        ok: true,
        message:
            "Hermes setup terminal opened. Use the visible window to choose models and settings."
                .to_string(),
        output: "Visible terminal launched for hermes setup.".to_string(),
        workspace_path: None,
        session_id: None,
        change_summary: None,
    })
}

#[tauri::command]
fn hermes_health() -> Result<HermesHealthReport, String> {
    let hermes = verified_hermes_executable()?;
    let config_path = run_optional_hermes_command(&hermes, &["config", "path"]);
    let env_path = run_optional_hermes_command(&hermes, &["config", "env-path"]);
    let config_check = run_optional_hermes_command(&hermes, &["config", "check"]);
    let status = run_optional_hermes_command(&hermes, &["status", "--all"]);
    let doctor = run_optional_hermes_command(&hermes, &["doctor"]);
    let tools = run_optional_hermes_command(&hermes, &["tools", "list"]);

    let ok = config_check.ok && status.ok && doctor.ok;
    Ok(HermesHealthReport {
        ok,
        config_path: config_path
            .ok
            .then(|| command_output_or_empty(&config_path)),
        env_path: env_path.ok.then(|| command_output_or_empty(&env_path)),
        status_output: command_output_or_empty(&status),
        doctor_output: command_output_or_empty(&doctor),
        tools_output: command_output_or_empty(&tools),
        message: if ok {
            "Hermes workspace health check passed.".to_string()
        } else {
            "Hermes needs attention. Review doctor/status details in QARKO OS.".to_string()
        },
    })
}

fn toolsets_for_mode(mode: &str) -> Vec<&'static str> {
    match mode {
        "developer" => vec![
            "web",
            "file",
            "terminal",
            "browser",
            "skills",
            "memory",
            "session_search",
            "delegation",
            "todo",
        ],
        "work" | "automation" => vec!["web", "file", "skills", "memory", "session_search", "todo"],
        _ => vec!["web", "file", "skills", "memory", "session_search", "todo"],
    }
}

#[tauri::command]
fn configure_hermes_tool_preset(request: HermesToolPresetRequest) -> Result<CommandResult, String> {
    let hermes = verified_hermes_executable()?;
    let mut outputs = Vec::new();
    for (key, value) in [
        ("security.redact_secrets", "true"),
        ("privacy.redact_pii", "true"),
    ] {
        let result = set_hermes_config(&hermes, key, value)?;
        outputs.push(command_output_or_empty(&result));
        if !result.ok {
            return Ok(CommandResult {
                ok: false,
                message: format!("Failed to set Hermes config {}.", key),
                output: outputs.join("\n"),
                workspace_path: None,
                session_id: None,
                change_summary: None,
            });
        }
    }

    let enabled = toolsets_for_mode(request.mode.trim());
    for tool in enabled {
        let result = run_hidden_command(Command::new(&hermes).args(["tools", "enable", tool]))?;
        outputs.push(command_output_or_empty(&result));
        if !result.ok {
            return Ok(CommandResult {
                ok: false,
                message: format!("Failed to enable Hermes toolset {}.", tool),
                output: outputs.join("\n"),
                workspace_path: None,
                session_id: None,
                change_summary: None,
            });
        }
    }

    if request.mode.trim() == "safe" {
        for tool in ["terminal", "browser"] {
            let result =
                run_hidden_command(Command::new(&hermes).args(["tools", "disable", tool]))?;
            outputs.push(command_output_or_empty(&result));
        }
    }

    Ok(CommandResult {
        ok: true,
        message: "Hermes tool preset was saved. New QARKO runs will use the updated capabilities."
            .to_string(),
        output: outputs.join("\n"),
        workspace_path: None,
        session_id: None,
        change_summary: None,
    })
}

#[tauri::command]
fn configure_hermes(request: HermesSetupRequest) -> Result<CommandResult, String> {
    let hermes = verified_hermes_executable()?;
    let model = request.model_name.trim();
    if model.is_empty() {
        return Err("Enter a model name.".to_string());
    }
    let provider = request.provider.trim();
    let provider_config = hermes_provider_config(provider)
        .ok_or_else(|| "Unsupported Hermes provider.".to_string())?;

    let mut outputs = Vec::new();
    if api_key_name_for_provider(provider).is_some() && !request.api_key.trim().is_empty() {
        return Ok(CommandResult {
            ok: false,
            message: "For security, QARKO does not save API keys through Hermes config commands. The key is used only for the current connection test/run.".to_string(),
            output: outputs.join("\n"),
            workspace_path: None,
            session_id: None,
            change_summary: None,
        });
    }

    for (key, value, error_message) in [
        ("model.default", model, "Failed to save the Hermes model."),
        (
            "model.provider",
            provider_config.provider,
            "Failed to save the Hermes provider.",
        ),
    ] {
        let result = set_hermes_config(&hermes, key, value)?;
        outputs.push(result.output);
        if !result.ok {
            return Ok(CommandResult {
                ok: false,
                message: error_message.to_string(),
                output: outputs.join("\n"),
                workspace_path: None,
                session_id: None,
                change_summary: None,
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
            message: "Failed to save the Hermes API base URL.".to_string(),
            output: outputs.join("\n"),
            workspace_path: None,
            session_id: None,
            change_summary: None,
        });
    }

    let api_mode_result = set_hermes_config(
        &hermes,
        "model.api_mode",
        provider_config.api_mode.unwrap_or(""),
    )?;
    outputs.push(api_mode_result.output);
    if !api_mode_result.ok {
        return Ok(CommandResult {
            ok: false,
            message: "Failed to save the Hermes API mode.".to_string(),
            output: outputs.join("\n"),
            workspace_path: None,
            session_id: None,
            change_summary: None,
        });
    }

    Ok(CommandResult {
        ok: true,
        message: "Hermes default settings were saved.".to_string(),
        output: outputs
            .into_iter()
            .filter(|value| !value.is_empty())
            .collect::<Vec<_>>()
            .join("\n"),
        workspace_path: None,
        session_id: None,
        change_summary: None,
    })
}

#[tauri::command]
fn login_hermes_provider(request: HermesLoginRequest) -> Result<CommandResult, String> {
    let provider = request.provider.trim();
    if !oauth_provider_allowed(provider) {
        return Err("이 제공자는 QARKO OS OAuth 로그인에서 아직 지원하지 않습니다.".to_string());
    }

    let hermes = verified_hermes_executable()?;
    let runtime_dir = qarko_local_app_dir().join("runtime");
    fs::create_dir_all(&runtime_dir).map_err(|error| error.to_string())?;
    let log_path = runtime_dir.join(format!(
        "qarko-hermes-auth-{}-{}.log",
        provider,
        std::process::id()
    ));
    let stdout_file = File::create(&log_path).map_err(|error| error.to_string())?;
    let stderr_file = stdout_file.try_clone().map_err(|error| error.to_string())?;
    let mut command = Command::new(&hermes);
    #[cfg(windows)]
    command.creation_flags(CREATE_NO_WINDOW);
    command
        .args([
            "auth",
            "add",
            provider,
            "--type",
            "oauth",
            "--timeout",
            "900",
        ])
        .stdout(Stdio::from(stdout_file))
        .stderr(Stdio::from(stderr_file))
        .spawn()
        .map_err(|error| error.to_string())?;

    let output = wait_for_auth_output(&log_path, Duration::from_secs(15));
    let url = extract_first_https_url(&output);
    if let Some(url) = url.as_deref() {
        open_url_in_default_browser(url);
    }
    let output = redact_sensitive_output(output);

    Ok(CommandResult {
        ok: true,
        message: if url.is_some() {
            "Hermes OAuth login is ready. QARKO opened the login page; enter the code shown below, then press Check auth.".to_string()
        } else {
            "Hermes OAuth login started, but QARKO could not find a browser URL yet. Use the visible login fallback if the URL does not appear.".to_string()
        },
        output: if output.trim().is_empty() {
            format!("Started hermes auth add {} --type oauth. Waiting for Hermes to print the browser URL.", provider)
        } else {
            output
        },
        workspace_path: None,
        session_id: None,
        change_summary: None,
    })
}

#[tauri::command]
fn open_hermes_login_terminal(request: HermesLoginRequest) -> Result<CommandResult, String> {
    let provider = request.provider.trim();
    if !oauth_provider_allowed(provider) {
        return Err("This provider is not supported for QARKO OS OAuth login yet.".to_string());
    }
    open_visible_hermes_terminal(
        &[
            "auth",
            "add",
            provider,
            "--type",
            "oauth",
            "--timeout",
            "900",
        ],
        "QARKO Hermes Login",
    )?;
    Ok(CommandResult {
        ok: true,
        message: "Hermes login window opened. Complete the login there, then return to QARKO OS and press Check auth.".to_string(),
        output: "Visible fallback launched for hermes auth add --type oauth.".to_string(),
        workspace_path: None,
        session_id: None,
        change_summary: None,
    })
}

#[tauri::command]
fn check_hermes_auth_status(request: HermesLoginRequest) -> Result<CommandResult, String> {
    let hermes = verified_hermes_executable()?;
    let provider = request.provider.trim();
    if !oauth_provider_allowed(provider) {
        return Err("This provider is not supported for QARKO OS OAuth checks yet.".to_string());
    }
    let status = run_hidden_command(Command::new(&hermes).args(["auth", "status", provider]))?;
    let list = run_hidden_command(Command::new(&hermes).args(["auth", "list", provider]))
        .unwrap_or_else(|error| CommandResult {
            ok: false,
            message: "Provider auth list failed.".to_string(),
            output: error,
            workspace_path: None,
            session_id: None,
            change_summary: None,
        });
    let doctor = run_optional_hermes_command(&hermes, &["doctor"]);
    let combined = [
        command_output_or_empty(&status),
        command_output_or_empty(&list),
        command_output_or_empty(&doctor),
    ]
    .join("\n");
    let provider_auth_output = [
        command_output_or_empty(&status),
        command_output_or_empty(&list),
    ]
    .join("\n");
    let provider_auth_lower = provider_auth_output.to_lowercase();
    let provider_positive = provider_auth_lower.contains("logged in")
        || provider_auth_lower.contains(&format!("{} (", provider))
        || provider_auth_lower.contains(&format!("{}:", provider));
    let logged_in = provider_positive
        && !provider_auth_lower.contains("logged out")
        && !provider_auth_lower.contains("no credentials")
        && !provider_auth_lower.contains("not logged")
        && !provider_auth_lower.contains("not authenticated");
    Ok(CommandResult {
        ok: logged_in,
        message: if logged_in {
            "Hermes auth status is connected.".to_string()
        } else {
            "Hermes auth is not complete yet. Finish browser login, then check again. If it still fails, use the advanced Hermes setup fallback.".to_string()
        },
        output: redact_sensitive_output(combined),
        workspace_path: None,
        session_id: None,
        change_summary: None,
    })
}

#[tauri::command]
fn open_qarko_workspace_path(path: String) -> Result<CommandResult, String> {
    let workspace_path = verified_qarko_workspace_path(path.trim())?;
    #[cfg(windows)]
    {
        Command::new("explorer.exe")
            .arg(&workspace_path)
            .spawn()
            .map_err(|error| error.to_string())?;
    }
    #[cfg(not(windows))]
    {
        let _ = workspace_path;
        return Err(
            "Opening workspace folders is currently supported on Windows only.".to_string(),
        );
    }
    Ok(CommandResult {
        ok: true,
        message: "QARKO workspace folder opened.".to_string(),
        output: canonical_path_text(&workspace_path),
        workspace_path: Some(canonical_path_text(&workspace_path)),
        session_id: None,
        change_summary: None,
    })
}

#[tauri::command]
async fn run_hermes_oneshot(request: HermesOneShotRequest) -> Result<CommandResult, String> {
    tauri::async_runtime::spawn_blocking(move || run_hermes_oneshot_blocking(request))
        .await
        .map_err(|error| error.to_string())?
}

fn gateway_event(kind: &str, title: &str, message: &str, status: &str) -> HermesGatewayEvent {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .unwrap_or(0);
    HermesGatewayEvent {
        id: format!("gateway-{}-{}", now, kind.replace('.', "-")),
        kind: kind.to_string(),
        title: title.to_string(),
        message: message.to_string(),
        status: status.to_string(),
        timestamp: now.to_string(),
    }
}

fn gateway_event_from_wire(value: &serde_json::Value) -> Option<HermesGatewayEvent> {
    let params = value.get("params")?;
    let event_type = params.get("type")?.as_str()?;
    let payload = params.get("payload").cloned().unwrap_or(serde_json::Value::Null);
    let message = payload
        .get("text")
        .or_else(|| payload.get("message"))
        .or_else(|| payload.get("line"))
        .and_then(|item| item.as_str())
        .unwrap_or(event_type);
    Some(gateway_event(
        event_type,
        "Hermes Gateway",
        message,
        if event_type.contains("complete") {
            "completed"
        } else if event_type.contains("request") {
            "needs_approval"
        } else {
            "running"
        },
    ))
}

fn extract_gateway_session_id(value: &serde_json::Value) -> Option<String> {
    value
        .get("result")
        .and_then(|result| result.get("session_id").or_else(|| result.get("sessionId")))
        .and_then(|session| session.as_str())
        .map(|session| session.to_string())
}

fn try_hermes_tui_gateway(request: &HermesGatewayTurnRequest) -> Result<HermesGatewayTurnResult, String> {
    let prompt = request.prompt.trim();
    if prompt.is_empty() {
        return Err("The task prompt for Hermes is empty.".to_string());
    }

    let workspace_dir = qarko_workspace_dir(request.project_id.clone(), request.run_id.clone())?;
    let before_changes = snapshot_workspace_changes(&workspace_dir);
    let mut command = Command::new("python");
    #[cfg(windows)]
    command.creation_flags(CREATE_NO_WINDOW);
    command
        .args(["-m", "tui_gateway.entry"])
        .current_dir(&workspace_dir)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    if let Ok(src_root) = env::var("HERMES_PYTHON_SRC_ROOT") {
        if !src_root.trim().is_empty() {
            command.env("HERMES_PYTHON_SRC_ROOT", src_root);
        }
    }

    let mut child = command.spawn().map_err(|error| format!("gateway spawn failed: {error}"))?;
    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| "gateway stdout was not available".to_string())?;
    let stderr = child
        .stderr
        .take()
        .ok_or_else(|| "gateway stderr was not available".to_string())?;
    let mut stdin = child
        .stdin
        .take()
        .ok_or_else(|| "gateway stdin was not available".to_string())?;
    let (tx, rx) = mpsc::channel::<String>();
    let tx_stdout = tx.clone();
    thread::spawn(move || {
        for line in BufReader::new(stdout).lines().flatten() {
            let _ = tx_stdout.send(line);
        }
    });
    let tx_stderr = tx.clone();
    thread::spawn(move || {
        for line in BufReader::new(stderr).lines().flatten() {
            let _ = tx_stderr.send(format!(r#"{{"jsonrpc":"2.0","method":"event","params":{{"type":"gateway.stderr","payload":{{"line":{}}}}}}}"#, serde_json::to_string(&line).unwrap_or_else(|_| "\"stderr\"".to_string())));
        }
    });

    let mut events = Vec::new();
    let startup_deadline = Instant::now() + Duration::from_secs(8);
    let mut ready = false;
    while Instant::now() < startup_deadline {
        if let Ok(line) = rx.recv_timeout(Duration::from_millis(250)) {
            if let Ok(value) = serde_json::from_str::<serde_json::Value>(&line) {
                if let Some(event) = gateway_event_from_wire(&value) {
                    if event.kind == "gateway.ready" {
                        ready = true;
                    }
                    events.push(event);
                }
            }
            if ready {
                break;
            }
        }
    }
    if !ready {
        let _ = child.kill();
        return Err("gateway.ready was not received before timeout".to_string());
    }

    let create_request = serde_json::json!({
        "jsonrpc": "2.0",
        "id": "qarko-session-create",
        "method": "session.create",
        "params": {}
    });
    writeln!(stdin, "{}", create_request).map_err(|error| error.to_string())?;
    stdin.flush().map_err(|error| error.to_string())?;

    let mut gateway_session_id = request.gateway_session_id.clone().or_else(|| request.session_id.clone());
    let create_deadline = Instant::now() + Duration::from_secs(20);
    while Instant::now() < create_deadline {
        if let Ok(line) = rx.recv_timeout(Duration::from_millis(500)) {
            if let Ok(value) = serde_json::from_str::<serde_json::Value>(&line) {
                if value.get("id").and_then(|id| id.as_str()) == Some("qarko-session-create") {
                    gateway_session_id = extract_gateway_session_id(&value).or(gateway_session_id);
                    break;
                }
                if let Some(event) = gateway_event_from_wire(&value) {
                    events.push(event);
                }
            }
        }
    }
    let session_id = gateway_session_id
        .clone()
        .ok_or_else(|| "session.create did not return a session id".to_string())?;
    let submit_request = serde_json::json!({
        "jsonrpc": "2.0",
        "id": "qarko-prompt-submit",
        "method": "prompt.submit",
        "params": {
            "session_id": session_id,
            "prompt": prompt
        }
    });
    writeln!(stdin, "{}", submit_request).map_err(|error| error.to_string())?;
    stdin.flush().map_err(|error| error.to_string())?;

    let mut output = String::new();
    let run_deadline = Instant::now() + Duration::from_secs(180);
    while Instant::now() < run_deadline {
        if let Ok(line) = rx.recv_timeout(Duration::from_millis(500)) {
            if let Ok(value) = serde_json::from_str::<serde_json::Value>(&line) {
                if let Some(event) = gateway_event_from_wire(&value) {
                    if matches!(event.kind.as_str(), "message.delta" | "message.complete" | "review.summary") {
                        output.push_str(&event.message);
                        output.push('\n');
                    }
                    let complete = matches!(event.kind.as_str(), "message.complete" | "review.summary");
                    events.push(event);
                    if complete {
                        break;
                    }
                }
            }
        }
    }
    let _ = child.kill();
    if output.trim().is_empty() {
        return Err("prompt.submit did not produce a final message before timeout".to_string());
    }
    let change_summary = summarize_workspace_changes(&before_changes, &snapshot_workspace_changes(&workspace_dir));
    Ok(HermesGatewayTurnResult {
        ok: true,
        message: "Hermes TUI Gateway completed the project turn.".to_string(),
        output,
        workspace_path: Some(canonical_path_text(&workspace_dir)),
        session_id: Some(session_id.clone()),
        gateway_session_id: Some(session_id),
        change_summary: Some(change_summary),
        gateway_events: events,
        fallback_to_one_shot: false,
    })
}

#[tauri::command]
async fn run_hermes_gateway_turn(
    request: HermesGatewayTurnRequest,
) -> Result<HermesGatewayTurnResult, String> {
    tauri::async_runtime::spawn_blocking(move || run_hermes_gateway_turn_blocking(request))
        .await
        .map_err(|error| error.to_string())?
}

fn run_hermes_gateway_turn_blocking(
    request: HermesGatewayTurnRequest,
) -> Result<HermesGatewayTurnResult, String> {
    // Hermes TUI Gateway JSON-RPC integration point.
    // Target RPC flow: session.create -> prompt.submit, then streamed tool.progress,
    // approval.request, clarify.request, session.steer, and session.interrupt events.
    if let Ok(result) = try_hermes_tui_gateway(&request) {
        return Ok(result);
    }

    // If the installed Hermes/Python environment cannot expose the gateway on this machine,
    // QARKO preserves product behavior by falling back to the verified one-shot runner.
    let one_shot = HermesOneShotRequest {
        prompt: request.prompt,
        model_name: request.model_name,
        provider: request.provider,
        api_key: request.api_key,
        project_id: request.project_id,
        run_id: request.run_id,
        session_id: request.session_id.or(request.gateway_session_id),
        toolsets: request.toolsets,
    };
    let result = run_hermes_oneshot_blocking(one_shot)?;
    let session_id = result.session_id.clone();
    let gateway_session_id = session_id.clone();
    Ok(HermesGatewayTurnResult {
        ok: result.ok,
        message: result.message,
        output: result.output,
        workspace_path: result.workspace_path,
        session_id,
        gateway_session_id,
        change_summary: result.change_summary,
        gateway_events: vec![
            gateway_event(
                "status.update",
                "Hermes Gateway",
                "hermes_tui_gateway JSON-RPC bridge prepared; one-shot fallback executed for this build.",
                "running",
            ),
            gateway_event(
                "message.complete",
                "Hermes message",
                "Fallback result is available. Future Gateway builds will stream message.delta and tool.progress here.",
                "completed",
            ),
        ],
        fallback_to_one_shot: true,
    })
}

#[tauri::command]
fn respond_hermes_gateway(request: HermesGatewayControlRequest) -> Result<CommandResult, String> {
    let method = request.method.trim();
    // Native control bridge placeholder for JSON-RPC approval.respond, clarify.respond,
    // session.steer, and session.interrupt. The persistent gateway process will own this
    // transport in the next step; returning a structured result avoids a missing-handler crash.
    let detail = format!(
        "Hermes Gateway control queued: method={} session={:?} request={:?} approved={:?} response_present={} prompt_present={}",
        method,
        request.session_id,
        request.request_id,
        request.approved,
        request.response.as_deref().unwrap_or("").len() > 0,
        request.prompt.as_deref().unwrap_or("").len() > 0
    );
    Ok(CommandResult {
        ok: false,
        message: "Hermes Gateway control transport is not attached yet.".to_string(),
        output: detail,
        workspace_path: None,
        session_id: request.session_id,
        change_summary: None,
    })
}

fn run_hermes_oneshot_blocking(request: HermesOneShotRequest) -> Result<CommandResult, String> {
    let hermes = verified_hermes_executable()?;
    let prompt = request.prompt.trim();
    let model = request.model_name.trim();
    let provider = request.provider.trim();
    let provider_config = hermes_provider_config(provider)
        .ok_or_else(|| "Unsupported Hermes provider.".to_string())?;

    let api_key = request.api_key.trim();
    if api_key_name_for_provider(provider).is_some() && api_key.is_empty() {
        return Err("This provider requires an API key for each run. QARKO does not save API keys, so enter it again after reopening the app.".to_string());
    }

    if prompt.is_empty() {
        return Err("The task prompt for Hermes is empty.".to_string());
    }
    if prompt.len() > 12000 {
        return Err(
            "The task prompt is too long. Shorten the project goal and try again.".to_string(),
        );
    }
    let resume_session_id = validate_hermes_session_id(request.session_id.as_deref())?;

    let workspace_dir = qarko_workspace_dir(request.project_id.clone(), request.run_id.clone())?;
    let before_changes = snapshot_workspace_changes(&workspace_dir);
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
        "Read the local task file at this exact path and follow its instructions. File: {}\nSave every artifact, draft, note, code file, and summary inside this QARKO workspace folder only: {}\nDo not modify files outside that folder unless the user explicitly approves it in QARKO OS.",
        prompt_path.to_string_lossy(),
        workspace_dir.to_string_lossy()
    );

    let mut command = Command::new(&hermes);
    if !api_key.is_empty() {
        if let Some(env_name) = api_key_name_for_provider(provider) {
            command.env(env_name, api_key);
        }
    }
    command.current_dir(&workspace_dir);
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
    if let Some(session_id) = resume_session_id {
        command.args(["--resume", session_id.as_str()]);
    }
    let toolsets = request
        .toolsets
        .as_deref()
        .unwrap_or("web,file,skills,memory,session_search,todo")
        .split(',')
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .filter(|value| {
            matches!(
                *value,
                "web"
                    | "file"
                    | "terminal"
                    | "browser"
                    | "skills"
                    | "memory"
                    | "session_search"
                    | "delegation"
                    | "todo"
            )
        })
        .collect::<Vec<_>>()
        .join(",");
    if !toolsets.is_empty() {
        command.args(["-t", toolsets.as_str()]);
    }

    let result = run_hidden_command_with_timeout(&mut command, Duration::from_secs(180));
    let _ = fs::remove_file(prompt_path);
    let result = result?;
    let change_summary = summarize_workspace_changes(&before_changes, &snapshot_workspace_changes(&workspace_dir));
    if result.ok {
        let session_id = result.session_id.clone();
        Ok(CommandResult {
            ok: true,
            message: "Hermes completed the project turn.".to_string(),
            output: format!(
                "Hermes workspace folder is available from the QARKO artifacts panel.\n\n{}",
                result.output
            ),
            workspace_path: Some(canonical_path_text(&workspace_dir)),
            session_id,
            change_summary: Some(change_summary),
        })
    } else {
        let session_id = result.session_id.clone();
        Ok(CommandResult {
            ok: false,
            message: "Hermes execution failed.".to_string(),
            output: result.output,
            workspace_path: Some(canonical_path_text(&workspace_dir)),
            session_id,
            change_summary: Some(change_summary),
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
            open_hermes_setup_terminal,
            hermes_health,
            configure_hermes,
            configure_hermes_tool_preset,
            login_hermes_provider,
            open_hermes_login_terminal,
            check_hermes_auth_status,
            open_qarko_workspace_path,
            respond_hermes_gateway,
            run_hermes_gateway_turn,
            run_hermes_oneshot
        ])
        .run(tauri::generate_context!())
        .expect("error while running QARKO OS");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn command_result_extracts_session_id_without_returning_it_in_output() {
        let result = command_result_from_output(
            true,
            b"Hermes completed work\n",
            b"Session ID: abc_123-session\nstatus: ok\n",
        );

        assert_eq!(result.session_id.as_deref(), Some("abc_123-session"));
        assert!(!result.output.contains("abc_123-session"));
        assert!(result.output.contains("[redacted sensitive output]"));
        assert!(result.output.contains("Hermes completed work"));
    }

    #[test]
    fn redact_sensitive_output_removes_lowercase_session_id_lines() {
        let output = redact_sensitive_output("session_id: secret-session\nnormal line".to_string());

        assert!(!output.contains("secret-session"));
        assert!(output.contains("[redacted sensitive output]"));
        assert!(output.contains("normal line"));
    }

    #[test]
    fn summarize_workspace_changes_counts_same_line_modifications() {
        let mut before = HashMap::new();
        before.insert(
            "note.md".to_string(),
            WorkspaceFileSnapshot {
                lines: 1,
                hash: "before".to_string(),
            },
        );
        let mut after = HashMap::new();
        after.insert(
            "note.md".to_string(),
            WorkspaceFileSnapshot {
                lines: 1,
                hash: "after".to_string(),
            },
        );

        let summary = summarize_workspace_changes(
            &WorkspaceChangeSnapshot {
                files: before,
                truncated: false,
            },
            &WorkspaceChangeSnapshot {
                files: after,
                truncated: false,
            },
        );

        assert_eq!(summary.files_changed, 1);
        assert_eq!(summary.insertions, 1);
        assert_eq!(summary.deletions, 1);
        assert_eq!(summary.files[0].status, "modified");
    }
}
