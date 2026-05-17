import { CheckCircle2, ExternalLink, Terminal, X } from "lucide-react";
import { useEffect } from "react";
import { useQarkoStore } from "../../store/useQarkoStore";
import { StatusBadge } from "../ui/StatusBadge";

export function HermesOnboarding() {
  const {
    checkHermesInstall,
    dismissHermesOnboarding,
    hermesExecutablePath,
    hermesInstallMessage,
    hermesInstallStatus,
    installHermesDesktop,
    openHermesSetupTerminal,
    showHermesOnboarding,
  } = useQarkoStore();

  useEffect(() => {
    if (showHermesOnboarding && hermesInstallStatus === "unknown") {
      void checkHermesInstall();
    }
  }, [checkHermesInstall, hermesInstallStatus, showHermesOnboarding]);

  if (!showHermesOnboarding) return null;

  const installed = hermesInstallStatus === "installed";
  const installing = hermesInstallStatus === "installing";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4">
      <section className="w-full max-w-2xl rounded-md border border-line bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-line p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-normal text-moss">First run setup</p>
            <h2 className="mt-1 text-2xl font-bold text-ink">Hermes Agent 준비</h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              QARKO OS는 Hermes를 실행 엔진으로 사용할 수 있습니다. 설치가 끝나면 Hermes의 터미널 setup 화면에서 모델, 프로바이더, 도구를 그대로 선택합니다.
            </p>
          </div>
          <button
            onClick={dismissHermesOnboarding}
            className="rounded-md border border-line p-2 text-stone-500 hover:bg-panel hover:text-ink"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-4 p-5">
          <div className="rounded-md bg-panel p-4">
            <div className="mb-2 flex items-center gap-2">
              <StatusBadge
                tone={installed ? "completed" : hermesInstallStatus === "error" ? "failed" : installing ? "running" : "planned"}
                label={installed ? "설치됨" : hermesInstallStatus === "error" ? "확인 필요" : installing ? "설치 중" : "설치 필요"}
              />
              <span className="text-sm font-semibold text-ink">Hermes 상태</span>
            </div>
            <p className="text-sm leading-6 text-stone-700">{hermesInstallMessage}</p>
            {hermesExecutablePath ? <p className="mt-2 break-all text-xs text-stone-500">{hermesExecutablePath}</p> : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <button
              onClick={installHermesDesktop}
              disabled={installing}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-ink px-4 py-3 text-sm font-semibold text-white hover:bg-moss disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ExternalLink className="h-4 w-4" />
              Hermes 설치
            </button>
            <button
              onClick={checkHermesInstall}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-line bg-white px-4 py-3 text-sm font-semibold text-ink hover:bg-panel"
            >
              <CheckCircle2 className="h-4 w-4" />
              상태 확인
            </button>
            <button
              onClick={openHermesSetupTerminal}
              disabled={!installed}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-line bg-white px-4 py-3 text-sm font-semibold text-ink hover:bg-panel disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Terminal className="h-4 w-4" />
              초기 설정
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
