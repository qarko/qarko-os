import { invoke } from "@tauri-apps/api/core";

export type HermesInstallState = "unknown" | "installed" | "missing" | "installing" | "error";

export interface HermesDesktopStatus {
  installed: boolean;
  verified?: boolean;
  executablePath?: string;
  version?: string;
  message: string;
}

export interface HermesInstallCommand {
  program: string;
  args: string[];
  script: string;
}

export interface HermesVerifiedDependency {
  name: string;
  version: string;
  policy: string;
}

export interface HermesVerifiedInstallPlan {
  channel: "verified";
  label: string;
  hermesCommit: string;
  installScriptSha256: string;
  allowUnverifiedLatest: boolean;
  dependencies: HermesVerifiedDependency[];
}

export interface HermesGuidedSetup {
  provider: string;
  modelName: string;
  apiKey: string;
  endpoint: string;
}

export interface HermesCommandResult {
  ok: boolean;
  message: string;
  output: string;
  workspacePath?: string;
}

export interface HermesHealthReport {
  ok: boolean;
  configPath?: string;
  envPath?: string;
  statusOutput: string;
  doctorOutput: string;
  toolsOutput: string;
  message: string;
}

export interface HermesOneShotRequest {
  prompt: string;
  modelName: string;
  provider: string;
  apiKey: string;
  projectId?: string;
  runId?: string;
  toolsets?: string;
  workspacePath?: string;
}

const hermesVerifiedInstallPlan: HermesVerifiedInstallPlan = {
  channel: "verified",
  label: "QARKO verified version",
  hermesCommit: "a0bd11d0227239674fe378ff8817f8f6129ef5a7",
  installScriptSha256: "E11D0D0CF4FA89041867F362AA10A83B4A9525033F0636D8622C26D22D119064",
  allowUnverifiedLatest: false,
  dependencies: [
    {
      name: "Hermes Agent",
      version: "a0bd11d0227239674fe378ff8817f8f6129ef5a7",
      policy: "QARKO installs and updates Hermes from a pinned Git commit.",
    },
    {
      name: "Hermes Windows installer",
      version: "SHA256 E11D0D0CF4FA89041867F362AA10A83B4A9525033F0636D8622C26D22D119064",
      policy: "The installer runs only when the downloaded script hash matches.",
    },
    {
      name: "Sub-dependencies",
      version: "Hermes installer managed",
      policy: "For beta, Hermes manages its own dependencies. Before commercial release, QARKO should move to a fully bundled dependency channel.",
    },
  ],
};

const buildHermesVerifiedCommand = (): HermesInstallCommand => {
  const { hermesCommit, installScriptSha256 } = hermesVerifiedInstallPlan;
  const script =
    "$ErrorActionPreference='Stop'; " +
    "$installer=Join-Path $env:TEMP 'qarko-hermes-install.ps1'; " +
    `$url='https://raw.githubusercontent.com/NousResearch/hermes-agent/${hermesCommit}/scripts/install.ps1'; ` +
    "Invoke-WebRequest -UseBasicParsing $url -OutFile $installer; " +
    `$hash=(Get-FileHash -Algorithm SHA256 $installer).Hash.ToUpperInvariant(); if ($hash -ne '${installScriptSha256}') { throw 'Hermes installer hash mismatch' }; ` +
    `& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $installer -SkipSetup -NonInteractive -Commit '${hermesCommit}'`;

  return {
    program: "powershell.exe",
    args: ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script],
    script,
  };
};

export const getHermesVerifiedInstallPlan = (): HermesVerifiedInstallPlan => hermesVerifiedInstallPlan;

export const getHermesInstallCommand = (): HermesInstallCommand => buildHermesVerifiedCommand();

export const getHermesUpdateCommand = (): HermesInstallCommand => buildHermesVerifiedCommand();

export const hasTauriRuntime = () => typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export const getHermesDesktopStatus = async (): Promise<HermesDesktopStatus> => {
  if (!hasTauriRuntime()) {
    return {
      installed: true,
      verified: true,
      executablePath: "browser-preview://hermes",
      version: "Browser preview",
      message: "웹 미리보기 모드입니다. 실제 Hermes 설치와 실행은 Windows 앱 패키징 후 검증합니다.",
    };
  }
  return invoke<HermesDesktopStatus>("hermes_status");
};

export const startHermesInstall = async () => {
  if (!hasTauriRuntime()) {
    return "웹 미리보기에서는 Hermes 설치를 건너뜁니다. Windows 앱에서는 실제 설치가 실행됩니다.";
  }
  return invoke<string>("install_hermes");
};

export const updateHermesToVerifiedVersion = async () => {
  if (!hasTauriRuntime()) {
    return "웹 미리보기에서는 Hermes 업데이트를 건너뜁니다. Windows 앱에서는 검증된 버전으로 업데이트합니다.";
  }
  return invoke<string>("update_hermes_verified");
};

export const openHermesSetupTerminal = async (section?: string): Promise<HermesCommandResult> => {
  if (!hasTauriRuntime()) {
    return {
      ok: true,
      message: "웹 미리보기에서는 고급 Hermes setup 창을 열지 않습니다.",
      output: `Preview fallback: hermes setup${section ? ` ${section}` : ""}`,
    };
  }
  return invoke<HermesCommandResult>("open_hermes_setup_terminal", { section });
};

export const configureHermesGuidedSetup = async (setup: HermesGuidedSetup): Promise<HermesCommandResult> => {
  if (!hasTauriRuntime()) {
    return {
      ok: true,
      message: "웹 미리보기 모델 설정을 저장했습니다.",
      output: `Preview model: ${setup.provider} / ${setup.modelName}`,
    };
  }
  return invoke<HermesCommandResult>("configure_hermes", { request: setup });
};

export const getHermesHealthReport = async (): Promise<HermesHealthReport> => {
  if (!hasTauriRuntime()) {
    return {
      ok: true,
      configPath: "browser-preview://config.yaml",
      envPath: "browser-preview://.env",
      statusOutput: "Browser preview: Hermes runtime simulated.",
      doctorOutput: "Browser preview: native checks are deferred to Windows packaging.",
      toolsOutput: "web,file,skills,memory,session_search,todo",
      message: "웹 미리보기 점검이 완료되었습니다. 실제 Hermes 점검은 Windows 앱에서 실행합니다.",
    };
  }
  return invoke<HermesHealthReport>("hermes_health");
};

export const configureHermesToolPreset = async (mode: "safe" | "work" | "developer" | "automation"): Promise<HermesCommandResult> => {
  if (!hasTauriRuntime()) {
    return {
      ok: true,
      message: `웹 미리보기 업무 능력 프리셋을 ${mode}로 저장했습니다.`,
      output: `Preview tool preset: ${mode}`,
    };
  }
  return invoke<HermesCommandResult>("configure_hermes_tool_preset", { request: { mode } });
};

export const loginHermesProvider = async (provider: string): Promise<HermesCommandResult> => {
  if (!hasTauriRuntime()) {
    return {
      ok: true,
      message: "웹 미리보기 OAuth 흐름을 시작했습니다. 실제 브라우저 인증은 Windows 앱에서 검증합니다.",
      output: [`Preview OAuth provider: ${provider}`, "URL: https://auth.openai.com/codex/device", "Code: QARKO-DEMO"].join("\n"),
    };
  }
  return invoke<HermesCommandResult>("login_hermes_provider", { request: { provider } });
};

export const openHermesLoginTerminal = async (provider: string): Promise<HermesCommandResult> => {
  if (!hasTauriRuntime()) {
    return {
      ok: true,
      message: "웹 미리보기에서는 로그인 창 fallback을 열지 않습니다.",
      output: `Preview fallback: hermes auth add ${provider} --type oauth`,
    };
  }
  return invoke<HermesCommandResult>("open_hermes_login_terminal", { request: { provider } });
};

export const checkHermesAuthStatus = async (provider: string): Promise<HermesCommandResult> => {
  if (!hasTauriRuntime()) {
    return {
      ok: true,
      message: "웹 미리보기 OAuth 인증이 완료된 상태로 처리되었습니다.",
      output: `${provider}: logged in (browser preview)`,
    };
  }
  return invoke<HermesCommandResult>("check_hermes_auth_status", { request: { provider } });
};

export const runHermesBusinessStep = async (request: HermesOneShotRequest): Promise<HermesCommandResult> => {
  if (!hasTauriRuntime()) {
    return {
      ok: true,
      message: "Browser preview generated a beta draft instead of running Hermes.",
      workspacePath: "browser-preview://workspace",
      output: [
        "## MVP execution draft",
        "",
        "1. Lock the customer and problem into one sentence.",
        "2. Define the smallest result that can be built today.",
        "3. Prepare copy, a demo screen, and feedback questions for the first user.",
        "",
        "In the Windows desktop app, this step is replaced by a real Hermes model run.",
      ].join("\n"),
    };
  }
  return invoke<HermesCommandResult>("run_hermes_oneshot", { request });
};

export const openQarkoWorkspacePath = async (path: string): Promise<HermesCommandResult> => {
  if (!hasTauriRuntime()) {
    return {
      ok: true,
      message: "Browser preview cannot open a local folder, but the workspace action is wired.",
      output: path,
      workspacePath: path,
    };
  }
  return invoke<HermesCommandResult>("open_qarko_workspace_path", { path });
};
