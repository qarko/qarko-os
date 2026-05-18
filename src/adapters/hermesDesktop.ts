import { invoke } from "@tauri-apps/api/core";

export type HermesInstallState = "unknown" | "installed" | "missing" | "installing" | "error";

export interface HermesDesktopStatus {
  installed: boolean;
  executablePath?: string;
  version?: string;
  message: string;
}

export interface HermesInstallCommand {
  program: string;
  args: string[];
  script: string;
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

export const getHermesInstallCommand = (): HermesInstallCommand => {
  const script =
    "$ErrorActionPreference='Stop'; " +
    "$installer=Join-Path $env:TEMP 'qarko-hermes-install.ps1'; " +
    "Invoke-WebRequest -UseBasicParsing 'https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.ps1' -OutFile $installer; " +
    "& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $installer -SkipSetup -NonInteractive";

  return {
    program: "powershell.exe",
    args: ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script],
    script,
  };
};

const hasTauriRuntime = () => typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export const getHermesDesktopStatus = async (): Promise<HermesDesktopStatus> => {
  if (!hasTauriRuntime()) {
    return {
      installed: false,
      message: "브라우저 미리보기에서는 Hermes 데스크톱 상태 확인을 사용할 수 없습니다.",
    };
  }
  return invoke<HermesDesktopStatus>("hermes_status");
};

export const startHermesInstall = async () => {
  if (!hasTauriRuntime()) {
    throw new Error("Hermes 자동 설치는 Windows 데스크톱 앱에서만 사용할 수 있습니다.");
  }
  return invoke<string>("install_hermes");
};

export const configureHermesGuidedSetup = async (setup: HermesGuidedSetup): Promise<HermesCommandResult> => {
  if (!hasTauriRuntime()) {
    throw new Error("Hermes 설정 저장은 Windows 데스크톱 앱에서만 사용할 수 있습니다.");
  }
  return invoke<HermesCommandResult>("configure_hermes", { request: setup });
};
