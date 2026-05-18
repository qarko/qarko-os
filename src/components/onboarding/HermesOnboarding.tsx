import { CheckCircle2, PlugZap, ShieldCheck, X } from "lucide-react";
import { useEffect } from "react";
import { useQarkoStore } from "../../store/useQarkoStore";
import { StatusBadge } from "../ui/StatusBadge";

export function HermesOnboarding() {
  const {
    checkHermesInstall,
    dismissHermesOnboarding,
    hermesExecutablePath,
    hermesConnection,
    hermesInstallMessage,
    hermesInstallStatus,
    hermesSetupOutput,
    hermesSetupProvider,
    installHermesDesktop,
    saveHermesGuidedSetup,
    showHermesOnboarding,
    testHermesRuntime,
    updateHermesConnection,
    updateHermesSetupProvider,
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
            <h2 className="mt-1 text-2xl font-bold text-ink">QARKO OS에서 Hermes 준비하기</h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              터미널이나 PowerShell을 열지 않고 Hermes 설치와 기본 모델 설정을 진행합니다. 어려운 항목은 숨기고, 필요한 선택만 순서대로 보여드립니다.
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

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              onClick={installHermesDesktop}
              disabled={installing}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-ink px-4 py-3 text-sm font-semibold text-white hover:bg-moss disabled:cursor-not-allowed disabled:opacity-60"
            >
              <PlugZap className="h-4 w-4" />
              앱 안에서 Hermes 설치
            </button>
            <button
              onClick={checkHermesInstall}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-line bg-white px-4 py-3 text-sm font-semibold text-ink hover:bg-panel"
            >
              <CheckCircle2 className="h-4 w-4" />
              상태 확인
            </button>
          </div>

          <div className="rounded-md border border-line p-4">
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-signal" />
              <h3 className="text-sm font-semibold text-ink">쉬운 모델 설정</h3>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold text-ink">
                모델 제공자
                <select
                  value={hermesSetupProvider}
                  onChange={(event) => updateHermesSetupProvider(event.target.value)}
                  className="rounded-md border border-line bg-white px-3 py-3 text-sm text-ink outline-none focus:border-signal"
                >
                  <option value="openrouter">OpenRouter</option>
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic / Claude</option>
                  <option value="nous">Nous Portal</option>
                  <option value="custom">직접 입력</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm font-semibold text-ink">
                모델명
                <input
                  value={hermesConnection.modelName}
                  onChange={(event) => updateHermesConnection({ modelName: event.target.value })}
                  placeholder="openrouter/anthropic/claude-sonnet-4"
                  className="rounded-md border border-line bg-white px-3 py-3 text-sm text-ink outline-none focus:border-signal"
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-ink sm:col-span-2">
                API Key
                <input
                  type="password"
                  value={hermesConnection.apiKey}
                  onChange={(event) => updateHermesConnection({ apiKey: event.target.value })}
                  placeholder="키가 필요 없는 제공자는 비워두세요"
                  className="rounded-md border border-line bg-white px-3 py-3 text-sm text-ink outline-none focus:border-signal"
                />
              </label>
              {hermesSetupProvider === "custom" ? (
                <label className="grid gap-2 text-sm font-semibold text-ink sm:col-span-2">
                  API 주소
                  <input
                    value={hermesConnection.endpoint}
                    onChange={(event) => updateHermesConnection({ endpoint: event.target.value })}
                    placeholder="http://localhost:11434/v1"
                    className="rounded-md border border-line bg-white px-3 py-3 text-sm text-ink outline-none focus:border-signal"
                  />
                </label>
              ) : null}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button
                onClick={saveHermesGuidedSetup}
                disabled={!installed}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-ink px-4 py-3 text-sm font-semibold text-white hover:bg-moss disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ShieldCheck className="h-4 w-4" />
                Hermes 설정 저장
              </button>
              <button
                onClick={testHermesRuntime}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-line bg-white px-4 py-3 text-sm font-semibold text-ink hover:bg-panel"
              >
                <CheckCircle2 className="h-4 w-4" />
                연결 테스트
              </button>
            </div>
            {hermesSetupOutput ? <pre className="mt-3 max-h-28 overflow-auto rounded-md bg-panel p-3 text-xs leading-5 text-stone-600">{hermesSetupOutput}</pre> : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              onClick={dismissHermesOnboarding}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-line bg-white px-4 py-3 text-sm font-semibold text-ink hover:bg-panel"
            >
              나중에 하기
            </button>
            <button
              onClick={dismissHermesOnboarding}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-line bg-white px-4 py-3 text-sm font-semibold text-ink hover:bg-panel"
            >
              QARKO OS 시작
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
