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

export interface HermesOneShotRequest {
  prompt: string;
  modelName: string;
  provider: string;
  apiKey: string;
}

const hermesVerifiedInstallPlan: HermesVerifiedInstallPlan = {
  channel: "verified",
  label: "QARKO 고정 버전",
  hermesCommit: "a0bd11d0227239674fe378ff8817f8f6129ef5a7",
  installScriptSha256: "E11D0D0CF4FA89041867F362AA10A83B4A9525033F0636D8622C26D22D119064",
  allowUnverifiedLatest: false,
  dependencies: [
    {
      name: "Hermes Agent",
      version: "a0bd11d0227239674fe378ff8817f8f6129ef5a7",
      policy: "QARKO가 지정한 Git commit으로 설치와 업데이트를 고정합니다.",
    },
    {
      name: "Hermes Windows installer",
      version: "SHA256 E11D0D0CF4FA89041867F362AA10A83B4A9525033F0636D8622C26D22D119064",
      policy: "다운로드 후 해시가 일치할 때만 실행합니다.",
    },
    {
      name: "하위 런타임 의존성",
      version: "Hermes installer managed",
      policy: "현재는 Hermes 설치 스크립트가 요구하는 런타임을 따릅니다. 상용화 전에는 QARKO 번들 채널로 고정 대상을 넓힙니다.",
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

export const updateHermesToVerifiedVersion = async () => {
  if (!hasTauriRuntime()) {
    throw new Error("Hermes 업데이트는 Windows 데스크톱 앱에서만 사용할 수 있습니다.");
  }
  return invoke<string>("update_hermes_verified");
};

export const configureHermesGuidedSetup = async (setup: HermesGuidedSetup): Promise<HermesCommandResult> => {
  if (!hasTauriRuntime()) {
    throw new Error("Hermes 설정 저장은 Windows 데스크톱 앱에서만 사용할 수 있습니다.");
  }
  return invoke<HermesCommandResult>("configure_hermes", { request: setup });
};

export const loginHermesProvider = async (provider: string): Promise<HermesCommandResult> => {
  if (!hasTauriRuntime()) {
    throw new Error("Hermes OAuth 로그인은 Windows 데스크톱 앱에서만 사용할 수 있습니다.");
  }
  return invoke<HermesCommandResult>("login_hermes_provider", { request: { provider } });
};

export const runHermesBusinessStep = async (request: HermesOneShotRequest): Promise<HermesCommandResult> => {
  if (!hasTauriRuntime()) {
    return {
      ok: true,
      message: "브라우저 미리보기에서는 실제 Hermes 실행 대신 베타용 초안을 생성했습니다.",
      output: [
        "## MVP 실행 초안",
        "",
        "1. 고객과 문제를 한 문장으로 고정하세요.",
        "2. 오늘 만들 수 있는 가장 작은 결과물을 정하세요.",
        "3. 첫 사용자 1명에게 보여줄 화면, 문구, 피드백 질문을 준비하세요.",
        "",
        "Windows 앱에서는 이 단계가 Hermes 실제 모델 실행으로 대체됩니다.",
      ].join("\n"),
    };
  }
  return invoke<HermesCommandResult>("run_hermes_oneshot", { request });
};
