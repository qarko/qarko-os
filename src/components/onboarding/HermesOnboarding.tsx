import { CheckCircle2, ExternalLink, KeyRound, PlugZap, Server, ShieldCheck, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getHermesVerifiedInstallPlan } from "../../adapters/hermesDesktop";
import { hermesProviderOptions } from "../../data/hermesProviders";
import { useQarkoStore } from "../../store/useQarkoStore";
import { StatusBadge } from "../ui/StatusBadge";

const steps = [
  { id: "install", label: "설치" },
  { id: "provider", label: "제공자" },
  { id: "auth", label: "인증/모델" },
  { id: "test", label: "확인" },
];

export function HermesOnboarding() {
  const {
    checkHermesInstall,
    dismissHermesOnboarding,
    hermesExecutablePath,
    hermesConnection,
    hermesInstallMessage,
    hermesInstallStatus,
    hermesAuthMessage,
    hermesAuthStatus,
    hermesSetupOutput,
    hermesSetupProvider,
    installHermesDesktop,
    loginHermesOAuthProvider,
    saveHermesGuidedSetup,
    showHermesOnboarding,
    testHermesRuntime,
    updateHermesConnection,
    updateHermesSetupProvider,
  } = useQarkoStore();
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (showHermesOnboarding) setStepIndex(0);
  }, [showHermesOnboarding]);

  useEffect(() => {
    if (showHermesOnboarding) {
      void checkHermesInstall();
    }
  }, [checkHermesInstall, showHermesOnboarding]);

  useEffect(() => {
    if (hermesInstallStatus === "installed" && stepIndex === 0) setStepIndex(1);
  }, [hermesInstallStatus, stepIndex]);

  const selectedProvider = useMemo(
    () => hermesProviderOptions.find((option) => option.id === hermesSetupProvider) ?? hermesProviderOptions[0],
    [hermesSetupProvider]
  );
  const hermesInstallPlan = getHermesVerifiedInstallPlan();

  if (!showHermesOnboarding) return null;

  const installed = hermesInstallStatus === "installed";
  const installing = hermesInstallStatus === "installing";
  const canSave = installed && hermesConnection.modelName.trim().length > 0;
  const isOauth = selectedProvider.authType === "oauth";
  const loggingIn = hermesAuthStatus === "running";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4">
      <section className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-md border border-line bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-line p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-normal text-moss">Hermes setup wizard</p>
            <h2 className="mt-1 text-2xl font-bold text-ink">QARKO OS에서 Hermes 연결하기</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
              터미널 없이 설치, 계정 인증, 모델 선택, 연결 확인까지 순서대로 진행합니다.
            </p>
          </div>
          <button onClick={dismissHermesOnboarding} className="rounded-md border border-line p-2 text-stone-500 hover:bg-panel hover:text-ink" aria-label="닫기">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[220px_1fr]">
          <aside className="border-b border-line bg-panel p-4 lg:border-b-0 lg:border-r">
            <div className="space-y-2">
              {steps.map((step, index) => {
                const active = index === stepIndex;
                const done = index < stepIndex;
                return (
                  <button
                    key={step.id}
                    onClick={() => setStepIndex(index)}
                    className={`flex w-full items-center gap-3 rounded-md px-3 py-3 text-left text-sm font-semibold ${
                      active ? "bg-white text-ink shadow-sm" : "text-stone-600 hover:bg-white/70"
                    }`}
                  >
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${done ? "bg-signal text-white" : active ? "bg-ink text-white" : "bg-white text-moss"}`}>
                      {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : index + 1}
                    </span>
                    {step.label}
                  </button>
                );
              })}
            </div>
            <div className="mt-5 rounded-md bg-white p-3 text-xs leading-5 text-stone-600">
              OpenAI만 고정하지 않습니다. 사용자의 계정과 예산에 맞춰 모델 제공자를 선택할 수 있습니다.
            </div>
          </aside>

          <div className="min-h-0 overflow-y-auto p-5 thin-scrollbar">
            {stepIndex === 0 ? (
              <div className="space-y-4">
                <div className="rounded-md bg-panel p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <StatusBadge tone={installed ? "completed" : hermesInstallStatus === "error" ? "failed" : installing ? "running" : "planned"} label={installed ? "설치됨" : hermesInstallStatus === "error" ? "확인 필요" : installing ? "설치 중" : "설치 필요"} />
                    <span className="text-sm font-semibold text-ink">Hermes 상태</span>
                  </div>
                  <p className="text-sm leading-6 text-stone-700">{hermesInstallMessage}</p>
                  <p className="mt-2 text-xs leading-5 text-stone-600">
                    설치는 {hermesInstallPlan.label}으로 고정된 검증 버전을 사용합니다. 이후 업데이트도 사용자가 직접 승인할 때만 진행합니다.
                  </p>
                  {hermesExecutablePath ? <p className="mt-2 break-all text-xs text-stone-500">{hermesExecutablePath}</p> : null}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button onClick={installHermesDesktop} disabled={installing} className="inline-flex items-center justify-center gap-2 rounded-md bg-ink px-4 py-3 text-sm font-semibold text-white hover:bg-moss disabled:cursor-not-allowed disabled:opacity-60">
                    <PlugZap className="h-4 w-4" />
                    안전하게 Hermes 설치
                  </button>
                  <button onClick={checkHermesInstall} className="inline-flex items-center justify-center gap-2 rounded-md border border-line bg-white px-4 py-3 text-sm font-semibold text-ink hover:bg-panel">
                    <CheckCircle2 className="h-4 w-4" />
                    설치 상태 다시 확인
                  </button>
                </div>
              </div>
            ) : null}

            {stepIndex === 1 ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-ink">사용할 AI 연결 방식 선택</h3>
                  <p className="mt-1 text-sm leading-6 text-stone-600">베타 테스터가 실제 Hermes 작업을 실행할 수 있도록 계정 방식과 모델 범위를 먼저 고릅니다.</p>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {hermesProviderOptions.map((option) => {
                    const active = option.id === hermesSetupProvider;
                    return (
                      <button key={option.id} onClick={() => updateHermesSetupProvider(option.id)} className={`rounded-md border p-4 text-left transition ${active ? "border-signal bg-panel shadow-sm" : "border-line bg-white hover:bg-panel"}`}>
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <span className="text-sm font-bold text-ink">{option.label}</span>
                          <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-moss">{option.authType === "api-key" ? "API Key" : option.authType === "oauth" ? "OAuth" : "Custom"}</span>
                        </div>
                        <p className="text-sm leading-6 text-stone-600">{option.summary}</p>
                        <p className="mt-2 break-all text-xs text-stone-500">기본 모델: {option.defaultModel}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {stepIndex === 2 ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-ink">{selectedProvider.label} 설정</h3>
                  <p className="mt-1 text-sm leading-6 text-stone-600">{selectedProvider.setupHint}</p>
                </div>

                {isOauth ? (
                  <div className="rounded-md border border-line bg-panel p-4 text-sm leading-6 text-stone-700">
                    <p className="font-semibold text-ink">1. 브라우저 로그인</p>
                    <p className="mt-1">버튼을 누르면 Hermes의 공식 OAuth 인증을 앱 안에서 시작합니다. 브라우저가 열리면 로그인 후 QARKO OS로 돌아오세요.</p>
                    <button onClick={loginHermesOAuthProvider} disabled={!installed || loggingIn} className="mt-3 inline-flex items-center justify-center gap-2 rounded-md bg-ink px-4 py-3 text-sm font-semibold text-white hover:bg-moss disabled:cursor-not-allowed disabled:opacity-50">
                      <ExternalLink className="h-4 w-4" />
                      {loggingIn ? "로그인 진행 중" : "OAuth 로그인 시작"}
                    </button>
                    <p className="mt-3 text-xs leading-5 text-stone-600">{hermesAuthMessage}</p>
                  </div>
                ) : null}

                <div className="grid gap-4">
                  <div>
                    <p className="text-sm font-semibold text-ink">{isOauth ? "2. 사용할 모델 선택" : "사용할 모델 선택"}</p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {selectedProvider.modelOptions.map((model) => {
                        const active = hermesConnection.modelName === model.id;
                        return (
                          <button key={model.id} onClick={() => updateHermesConnection({ modelName: model.id })} className={`rounded-md border p-3 text-left text-sm ${active ? "border-signal bg-panel" : "border-line bg-white hover:bg-panel"}`}>
                            <span className="block font-semibold text-ink">{model.label}</span>
                            <span className="mt-1 block text-xs text-stone-500">{model.id}{model.recommended ? " · 추천" : ""}{model.note ? ` · ${model.note}` : ""}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <label className="grid gap-2 text-sm font-semibold text-ink">
                    모델명 직접 입력
                    <input value={hermesConnection.modelName} onChange={(event) => updateHermesConnection({ modelName: event.target.value })} placeholder={selectedProvider.defaultModel} className="rounded-md border border-line bg-white px-3 py-3 text-sm text-ink outline-none focus:border-signal" />
                  </label>

                  {selectedProvider.authType !== "oauth" ? (
                    <label className="grid gap-2 text-sm font-semibold text-ink">
                      {selectedProvider.keyLabel ?? "API Key"}
                      <div className="relative">
                        <KeyRound className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-moss" />
                        <input type="password" value={hermesConnection.apiKey} onChange={(event) => updateHermesConnection({ apiKey: event.target.value })} placeholder="필요 없으면 비워두세요" className="w-full rounded-md border border-line bg-white py-3 pl-10 pr-3 text-sm text-ink outline-none focus:border-signal" />
                      </div>
                      <span className="text-xs font-normal leading-5 text-stone-500">API 키는 장기 저장하지 않고 연결 테스트 요청에만 임시로 사용합니다.</span>
                    </label>
                  ) : null}

                  {selectedProvider.authType === "custom-endpoint" ? (
                    <label className="grid gap-2 text-sm font-semibold text-ink">
                      API 주소
                      <div className="relative">
                        <Server className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-moss" />
                        <input value={hermesConnection.endpoint} onChange={(event) => updateHermesConnection({ endpoint: event.target.value })} placeholder={selectedProvider.defaultEndpoint} className="w-full rounded-md border border-line bg-white py-3 pl-10 pr-3 text-sm text-ink outline-none focus:border-signal" />
                      </div>
                    </label>
                  ) : null}
                </div>

                <button onClick={saveHermesGuidedSetup} disabled={!canSave} className="inline-flex items-center justify-center gap-2 rounded-md bg-ink px-4 py-3 text-sm font-semibold text-white hover:bg-moss disabled:cursor-not-allowed disabled:opacity-50">
                  <ShieldCheck className="h-4 w-4" />
                  선택한 모델 저장
                </button>
                {hermesSetupOutput ? <pre className="max-h-36 overflow-auto rounded-md bg-panel p-3 text-xs leading-5 text-stone-600">{hermesSetupOutput}</pre> : null}
              </div>
            ) : null}

            {stepIndex === 3 ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-ink">연결 확인</h3>
                  <p className="mt-1 text-sm leading-6 text-stone-600">선택한 제공자와 모델이 저장되었습니다. 실제 작업 테스트 전에 현재 상태를 확인하세요.</p>
                </div>
                <div className="rounded-md border border-line bg-panel p-4 text-sm leading-6 text-stone-700">
                  <p><span className="font-semibold text-ink">제공자:</span> {selectedProvider.label}</p>
                  <p><span className="font-semibold text-ink">모델:</span> {hermesConnection.modelName || "미입력"}</p>
                  <p><span className="font-semibold text-ink">인증:</span> {isOauth ? "OAuth" : hermesConnection.apiKey ? "API key 입력됨" : "키 없음"}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {isOauth ? null : (
                    <button onClick={testHermesRuntime} className="inline-flex items-center justify-center gap-2 rounded-md bg-ink px-4 py-3 text-sm font-semibold text-white hover:bg-moss">
                      <CheckCircle2 className="h-4 w-4" />
                      연결 테스트
                    </button>
                  )}
                  <button onClick={dismissHermesOnboarding} className="inline-flex items-center justify-center gap-2 rounded-md border border-line bg-white px-4 py-3 text-sm font-semibold text-ink hover:bg-panel">
                    {isOauth ? "설정 완료하고 시작" : "QARKO OS 시작"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap justify-between gap-2 border-t border-line p-4">
          <button onClick={() => setStepIndex((value) => Math.max(0, value - 1))} disabled={stepIndex === 0} className="rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold text-ink hover:bg-panel disabled:cursor-not-allowed disabled:opacity-50">
            이전
          </button>
          <button onClick={() => setStepIndex((value) => Math.min(steps.length - 1, value + 1))} disabled={stepIndex === steps.length - 1} className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-moss disabled:cursor-not-allowed disabled:opacity-50">
            다음
          </button>
        </div>
      </section>
    </div>
  );
}
