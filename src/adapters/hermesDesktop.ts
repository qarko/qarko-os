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
      installed: false,
      verified: false,
      message: "Hermes desktop status is available only in the Windows desktop app.",
    };
  }
  return invoke<HermesDesktopStatus>("hermes_status");
};

export const startHermesInstall = async () => {
  if (!hasTauriRuntime()) {
    throw new Error("Hermes automatic install is available only in the Windows desktop app.");
  }
  return invoke<string>("install_hermes");
};

export const updateHermesToVerifiedVersion = async () => {
  if (!hasTauriRuntime()) {
    throw new Error("Hermes update is available only in the Windows desktop app.");
  }
  return invoke<string>("update_hermes_verified");
};

export const openHermesSetupTerminal = async (section?: string): Promise<HermesCommandResult> => {
  if (!hasTauriRuntime()) {
    throw new Error("Hermes setup terminal is available only in the Windows desktop app.");
  }
  return invoke<HermesCommandResult>("open_hermes_setup_terminal", { section });
};

export const configureHermesGuidedSetup = async (setup: HermesGuidedSetup): Promise<HermesCommandResult> => {
  if (!hasTauriRuntime()) {
    throw new Error("Hermes settings can be saved only in the Windows desktop app.");
  }
  return invoke<HermesCommandResult>("configure_hermes", { request: setup });
};

export const getHermesHealthReport = async (): Promise<HermesHealthReport> => {
  if (!hasTauriRuntime()) {
    return {
      ok: false,
      statusOutput: "Windows desktop app required.",
      doctorOutput: "Hermes doctor is available only in the desktop app.",
      toolsOutput: "Hermes tools are available only in the desktop app.",
      message: "Hermes health check is available only in the Windows desktop app.",
    };
  }
  return invoke<HermesHealthReport>("hermes_health");
};

export const configureHermesToolPreset = async (mode: "safe" | "work" | "developer" | "automation"): Promise<HermesCommandResult> => {
  if (!hasTauriRuntime()) {
    throw new Error("Hermes tool presets are available only in the Windows desktop app.");
  }
  return invoke<HermesCommandResult>("configure_hermes_tool_preset", { request: { mode } });
};

export const loginHermesProvider = async (provider: string): Promise<HermesCommandResult> => {
  if (!hasTauriRuntime()) {
    throw new Error("Hermes OAuth login is available only in the Windows desktop app.");
  }
  return invoke<HermesCommandResult>("login_hermes_provider", { request: { provider } });
};

export const openHermesLoginTerminal = async (provider: string): Promise<HermesCommandResult> => {
  if (!hasTauriRuntime()) {
    throw new Error("Hermes login fallback is available only in the Windows desktop app.");
  }
  return invoke<HermesCommandResult>("open_hermes_login_terminal", { request: { provider } });
};

export const checkHermesAuthStatus = async (provider: string): Promise<HermesCommandResult> => {
  if (!hasTauriRuntime()) {
    throw new Error("Hermes auth check is available only in the Windows desktop app.");
  }
  return invoke<HermesCommandResult>("check_hermes_auth_status", { request: { provider } });
};

export const runHermesBusinessStep = async (request: HermesOneShotRequest): Promise<HermesCommandResult> => {
  if (!hasTauriRuntime()) {
    return {
      ok: true,
      message: "Browser preview generated a beta draft instead of running Hermes.",
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
