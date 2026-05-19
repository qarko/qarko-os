import { CheckCircle2, ExternalLink, KeyRound, PlugZap, Server, ShieldCheck, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { hermesProviderOptions } from "../../data/hermesProviders";
import { useQarkoStore } from "../../store/useQarkoStore";
import { StatusBadge } from "../ui/StatusBadge";

const steps = [
  { id: "install", label: "설치" },
  { id: "provider", label: "모델 선택" },
  { id: "auth", label: "인증 설정" },
  { id: "test", label: "연결 확인" },
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
    if (showHermesOnboarding) {
      setStepIndex(0);
    }
  }, [showHermesOnboarding]);

  useEffect(() => {
    if (showHermesOnboarding && hermesInstallStatus !== "installing") {
      void checkHermesInstall();
    }
  }, [checkHermesInstall, showHermesOnboarding]);

  useEffect(() => {
    if (hermesInstallStatus === "installed" && stepIndex === 0) {
      setStepIndex(1);
    }
  }, [hermesInstallStatus, stepIndex]);

  const selectedProvider = useMemo(
    () => hermesProviderOptions.find((option) => option.id === hermesSetupProvider) ?? hermesProviderOptions[0],
    [hermesSetupProvider]
  );

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
            <h2 className="mt-1 text-2xl font-bold text-ink">QARKO OS에서 Hermes 설정하기</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
              터미널을 열지 않고 Hermes 설치, 모델 선택, API 키 또는 OAuth 로그인, 연결 확인을 순서대로 진행합니다.
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
              초보자 기준으로 설계했습니다. 막히면 오른쪽 Live Dock의 Hermes 버튼에서 언제든 다시 열 수 있습니다.
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
                    보안을 위해 설치 파일 단계에서 몰래 실행하지 않습니다. 아래 버튼을 누르면 검증된 Hermes 설치 스크립트와 고정된 Hermes commit으로 진행합니다.
                  </p>
                  {hermesExecutablePath ? <p className="mt-2 break-all text-xs text-stone-500">{hermesExecutablePath}</p> : null}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button onClick={installHermesDesktop} disabled={installing} className="inline-flex items-center justify-center gap-2 rounded-md bg-ink px-4 py-3 text-sm font-semibold text-white hover:bg-moss disabled:cursor-not-allowed disabled:opacity-60">
                    <PlugZap className="h-4 w-4" />
                    앱 안에서 Hermes 설치
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
                  <h3 className="text-lg font-bold text-ink">사용할 모델 환경 선택</h3>
                  <p className="mt-1 text-sm leading-6 text-stone-600">OpenAI만 고정하지 않고 사용자의 계정과 도구에 맞게 선택합니다.</p>
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
                        <p className="mt-2 break-all text-xs text-stone-500">{option.defaultModel}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {stepIndex === 2 ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-ink">{selectedProvider.label} 인증 설정</h3>
                  <p className="mt-1 text-sm leading-6 text-stone-600">{selectedProvider.setupHint}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-2 text-sm font-semibold text-ink">
                    모델명
                    <input value={hermesConnection.modelName} onChange={(event) => updateHermesConnection({ modelName: event.target.value })} placeholder={selectedProvider.defaultModel} className="rounded-md border border-line bg-white px-3 py-3 text-sm text-ink outline-none focus:border-signal" />
                  </label>
                  {selectedProvider.authType !== "oauth" ? (
                    <label className="grid gap-2 text-sm font-semibold text-ink">
                      {selectedProvider.keyLabel ?? "API Key"}
                      <div className="relative">
                        <KeyRound className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-moss" />
                        <input type="password" value={hermesConnection.apiKey} onChange={(event) => updateHermesConnection({ apiKey: event.target.value })} placeholder="필요 없으면 비워두세요" className="w-full rounded-md border border-line bg-white py-3 pl-10 pr-3 text-sm text-ink outline-none focus:border-signal" />
                      </div>
                      <span className="text-xs font-normal leading-5 text-stone-500">
                        API 키는 저장하지 않고 연결 테스트에만 임시로 사용합니다.
                      </span>
                    </label>
                  ) : (
                    <div className="rounded-md border border-line bg-panel p-4 text-sm leading-6 text-stone-700">
                      <p className="font-semibold text-ink">OAuth 로그인</p>
                      <p className="mt-1">
                        버튼을 누르면 QARKO OS가 Hermes 로그인 흐름을 시작합니다. OAuth 로그인이 완료되면 Hermes CLI 인증은 완료된 상태로 봅니다.
                        HTTP 연결 테스트는 OpenAI 호환 API 주소를 알고 있을 때만 진행하세요.
                      </p>
                      <button onClick={loginHermesOAuthProvider} disabled={!installed || loggingIn} className="mt-3 inline-flex items-center justify-center gap-2 rounded-md bg-ink px-4 py-3 text-sm font-semibold text-white hover:bg-moss disabled:cursor-not-allowed disabled:opacity-50">
                        <ExternalLink className="h-4 w-4" />
                        {loggingIn ? "로그인 진행 중" : "OAuth 로그인 시작"}
                      </button>
                      <p className="mt-3 text-xs leading-5 text-stone-600">{hermesAuthMessage}</p>
                    </div>
                  )}
                  {selectedProvider.authType === "custom-endpoint" || selectedProvider.authType === "oauth" ? (
                    <label className="grid gap-2 text-sm font-semibold text-ink sm:col-span-2">
                      API 주소
                      <div className="relative">
                        <Server className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-moss" />
                        <input value={hermesConnection.endpoint} onChange={(event) => updateHermesConnection({ endpoint: event.target.value })} placeholder={selectedProvider.defaultEndpoint || "http://localhost:11434/v1"} className="w-full rounded-md border border-line bg-white py-3 pl-10 pr-3 text-sm text-ink outline-none focus:border-signal" />
                      </div>
                      {selectedProvider.authType === "oauth" ? (
                        <span className="text-xs font-normal leading-5 text-stone-500">
                          선택 입력입니다. 주소를 모르면 비워두고 OAuth 로그인 완료 후 QARKO OS를 시작해도 됩니다.
                        </span>
                      ) : null}
                    </label>
                  ) : null}
                </div>
                <button onClick={saveHermesGuidedSetup} disabled={!canSave} className="inline-flex items-center justify-center gap-2 rounded-md bg-ink px-4 py-3 text-sm font-semibold text-white hover:bg-moss disabled:cursor-not-allowed disabled:opacity-50">
                  <ShieldCheck className="h-4 w-4" />
                  모델 설정 저장
                </button>
                {hermesSetupOutput ? <pre className="max-h-36 overflow-auto rounded-md bg-panel p-3 text-xs leading-5 text-stone-600">{hermesSetupOutput}</pre> : null}
              </div>
            ) : null}

            {stepIndex === 3 ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-ink">연결 확인</h3>
                  <p className="mt-1 text-sm leading-6 text-stone-600">설정을 저장한 뒤 연결 테스트를 누르면 현재 모델/API 주소로 응답 가능한지 확인합니다.</p>
                </div>
                <div className="rounded-md border border-line bg-panel p-4 text-sm leading-6 text-stone-700">
                  <p><span className="font-semibold text-ink">제공자:</span> {selectedProvider.label}</p>
                  <p><span className="font-semibold text-ink">모델:</span> {hermesConnection.modelName || "미입력"}</p>
                  <p><span className="font-semibold text-ink">인증:</span> {isOauth ? "OAuth" : hermesConnection.apiKey ? "API key 입력됨" : "키 없음"}</p>
                  {isOauth ? (
                    <p className="mt-2 text-xs leading-5 text-stone-600">
                      OAuth 방식은 로그인 완료가 핵심입니다. HTTP API 주소를 모르면 연결 테스트를 건너뛰고 QARKO OS를 시작하세요.
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={testHermesRuntime} className="inline-flex items-center justify-center gap-2 rounded-md bg-ink px-4 py-3 text-sm font-semibold text-white hover:bg-moss">
                    <CheckCircle2 className="h-4 w-4" />
                    {isOauth ? "HTTP 연결 테스트" : "연결 테스트"}
                  </button>
                  <button onClick={dismissHermesOnboarding} className="inline-flex items-center justify-center gap-2 rounded-md border border-line bg-white px-4 py-3 text-sm font-semibold text-ink hover:bg-panel">
                    QARKO OS 시작
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
