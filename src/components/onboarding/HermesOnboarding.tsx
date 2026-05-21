import { CheckCircle2, ExternalLink, KeyRound, PlugZap, Server, ShieldCheck, Wrench, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getHermesVerifiedInstallPlan } from "../../adapters/hermesDesktop";
import { hermesProviderOptions } from "../../data/hermesProviders";
import { useQarkoStore } from "../../store/useQarkoStore";
import { StatusBadge } from "../ui/StatusBadge";

const steps = [
  { id: "install", label: "Hermes 설치" },
  { id: "provider", label: "모델 제공자" },
  { id: "auth", label: "인증 / 모델" },
  { id: "test", label: "연결 확인" },
];

export function HermesOnboarding() {
  const {
    checkHermesInstall,
    dismissHermesOnboarding,
    hermesAuthMessage,
    hermesAuthStatus,
    hermesConnection,
    hermesExecutablePath,
    hermesHealth,
    hermesInstallMessage,
    hermesInstallStatus,
    hermesSetupOutput,
    hermesSetupProvider,
    hermesToolPreset,
    installHermesDesktop,
    loginHermesOAuthProvider,
    openHermesLoginFallback,
    openHermesSetupWizard,
    refreshHermesHealth,
    saveHermesGuidedSetup,
    saveHermesToolPreset,
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
    if (showHermesOnboarding) void checkHermesInstall();
  }, [checkHermesInstall, showHermesOnboarding]);

  const selectedProvider = useMemo(
    () => hermesProviderOptions.find((option) => option.id === hermesSetupProvider) ?? hermesProviderOptions[0],
    [hermesSetupProvider]
  );
  const hermesInstallPlan = getHermesVerifiedInstallPlan();

  if (!showHermesOnboarding) return null;

  const installed = hermesInstallStatus === "installed";
  const needsRepair = hermesInstallStatus === "error";
  const installing = hermesInstallStatus === "installing";
  const isOauth = selectedProvider.authType === "oauth";
  const loggingIn = hermesAuthStatus === "running";
  const canSave = installed && hermesConnection.modelName.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4">
      <section className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-md border border-line bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-line p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-normal text-moss">Hermes 작업실 준비</p>
            <h2 className="mt-1 text-2xl font-bold text-ink">터미널 없이 Hermes를 작업 엔진으로 연결하기</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
              QARKO OS가 모델, 인증, 업무 능력, 시스템 점검을 UI로 처리합니다. 원본 Hermes setup은 문제가 생긴 경우에만 고급 fallback으로 엽니다.
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
                return (
                  <button
                    key={step.id}
                    onClick={() => setStepIndex(index)}
                    className={`flex w-full items-center gap-3 rounded-md px-3 py-3 text-left text-sm font-semibold ${
                      active ? "bg-white text-ink shadow-sm" : "text-stone-600 hover:bg-white/70"
                    }`}
                  >
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${active ? "bg-ink text-white" : "bg-white text-moss"}`}>
                      {index + 1}
                    </span>
                    {step.label}
                  </button>
                );
              })}
            </div>
            <div className="mt-5 rounded-md bg-white p-3 text-xs leading-5 text-stone-600">
              완료 후에는 작업실에서 바로 “오늘 할 작업”을 입력하고 Hermes 실행 결과를 확인할 수 있습니다.
            </div>
          </aside>

          <div className="min-h-0 overflow-y-auto p-5 thin-scrollbar">
            {stepIndex === 0 ? (
              <div className="space-y-4">
                <div className="rounded-md bg-panel p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <StatusBadge tone={installed ? "completed" : needsRepair ? "failed" : installing ? "running" : "planned"} label={installed ? "설치 완료" : installing ? "설치 중" : needsRepair ? "복구 필요" : "확인 필요"} />
                    <span className="text-sm font-semibold text-ink">Hermes 설치 상태</span>
                  </div>
                  <p className="text-sm leading-6 text-stone-700">{hermesInstallMessage}</p>
                  <p className="mt-2 text-xs leading-5 text-stone-600">
                    검증 채널: {hermesInstallPlan.label}. QARKO가 확인한 Hermes만 작업 실행에 사용합니다.
                  </p>
                  {hermesExecutablePath ? <p className="mt-2 break-all text-xs text-stone-500">{hermesExecutablePath}</p> : null}
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <button onClick={installHermesDesktop} disabled={installing} className="inline-flex items-center justify-center gap-2 rounded-md bg-ink px-4 py-3 text-sm font-semibold text-white hover:bg-moss disabled:cursor-not-allowed disabled:opacity-60">
                    <PlugZap className="h-4 w-4" />
                    {needsRepair ? "Hermes 복구" : "Hermes 설치"}
                  </button>
                  <button onClick={checkHermesInstall} className="inline-flex items-center justify-center gap-2 rounded-md border border-line bg-white px-4 py-3 text-sm font-semibold text-ink hover:bg-panel">
                    <CheckCircle2 className="h-4 w-4" />
                    설치 확인
                  </button>
                  <button onClick={() => openHermesSetupWizard()} disabled={!installed} className="inline-flex items-center justify-center gap-2 rounded-md border border-line bg-white px-4 py-3 text-sm font-semibold text-ink hover:bg-panel disabled:cursor-not-allowed disabled:opacity-50">
                    <ExternalLink className="h-4 w-4" />
                    고급 setup 열기
                  </button>
                </div>
                <p className="text-xs leading-5 text-stone-500">
                  고급 setup은 자동 복구가 실패했거나 원본 Hermes 설정을 직접 확인해야 할 때만 사용합니다.
                </p>
                <div className="rounded-md border border-line bg-white p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-ink">시스템 점검</p>
                      <p className="mt-1 text-xs leading-5 text-stone-600">config, env, doctor, status, tools 상태를 QARKO가 확인합니다.</p>
                    </div>
                    <StatusBadge tone={hermesHealth.ok ? "completed" : "planned"} label={hermesHealth.ok ? "정상" : "대기"} />
                  </div>
                  <button onClick={refreshHermesHealth} disabled={!installed} className="inline-flex items-center justify-center gap-2 rounded-md border border-line bg-panel px-4 py-2 text-sm font-semibold text-ink hover:bg-white disabled:cursor-not-allowed disabled:opacity-50">
                    <CheckCircle2 className="h-4 w-4" />
                    전체 점검 실행
                  </button>
                  <p className="mt-3 text-xs leading-5 text-stone-600">{hermesHealth.message}</p>
                  {hermesHealth.configPath ? <p className="mt-2 break-all text-xs text-stone-500">config: {hermesHealth.configPath}</p> : null}
                  {hermesHealth.envPath ? <p className="break-all text-xs text-stone-500">env: {hermesHealth.envPath}</p> : null}
                </div>
              </div>
            ) : null}

            {stepIndex === 1 ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-ink">모델 제공자 선택</h3>
                  <p className="mt-1 text-sm leading-6 text-stone-600">사용자의 계정과 예산에 맞는 Hermes 모델 제공자를 선택합니다.</p>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {hermesProviderOptions.map((option) => {
                    const active = option.id === hermesSetupProvider;
                    return (
                      <button key={option.id} onClick={() => updateHermesSetupProvider(option.id)} className={`rounded-md border p-4 text-left transition ${active ? "border-signal bg-panel shadow-sm" : "border-line bg-white hover:bg-panel"}`}>
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <span className="text-sm font-bold text-ink">{option.label}</span>
                          <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-moss">{option.authType === "oauth" ? "OAuth" : "API 키"}</span>
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
                  <h3 className="text-lg font-bold text-ink">{selectedProvider.label}</h3>
                  <p className="mt-1 text-sm leading-6 text-stone-600">{selectedProvider.setupHint}</p>
                </div>

                {isOauth ? (
                  <div className="rounded-md border border-line bg-panel p-4 text-sm leading-6 text-stone-700">
                    <p className="font-semibold text-ink">OAuth 인증</p>
                    <p className="mt-1">QARKO가 Hermes guided login을 시작합니다. 브라우저에서 로그인을 완료한 뒤 이 화면에서 인증 상태를 확인하세요.</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button onClick={loginHermesOAuthProvider} disabled={!installed || loggingIn} className="inline-flex items-center justify-center gap-2 rounded-md bg-ink px-4 py-3 text-sm font-semibold text-white hover:bg-moss disabled:cursor-not-allowed disabled:opacity-50">
                        <ExternalLink className="h-4 w-4" />
                        {loggingIn ? "시작 중..." : "브라우저 로그인 시작"}
                      </button>
                      <button onClick={openHermesLoginFallback} disabled={!installed} className="inline-flex items-center justify-center gap-2 rounded-md border border-line bg-white px-4 py-3 text-sm font-semibold text-ink hover:bg-panel disabled:cursor-not-allowed disabled:opacity-50">
                        로그인 창으로 열기
                      </button>
                    </div>
                    <p className="mt-3 text-xs leading-5 text-stone-600">{hermesAuthMessage}</p>
                  </div>
                ) : null}

                <div className="grid gap-4">
                  <div>
                    <p className="text-sm font-semibold text-ink">모델 선택</p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {selectedProvider.modelOptions.map((model) => {
                        const active = hermesConnection.modelName === model.id;
                        return (
                          <button key={model.id} onClick={() => updateHermesConnection({ modelName: model.id })} className={`rounded-md border p-3 text-left text-sm ${active ? "border-signal bg-panel" : "border-line bg-white hover:bg-panel"}`}>
                            <span className="block font-semibold text-ink">{model.label}</span>
                            <span className="mt-1 block text-xs text-stone-500">{model.id}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <label className="grid gap-2 text-sm font-semibold text-ink">
                    직접 모델명 입력
                    <input value={hermesConnection.modelName} onChange={(event) => updateHermesConnection({ modelName: event.target.value })} placeholder={selectedProvider.defaultModel} className="rounded-md border border-line bg-white px-3 py-3 text-sm text-ink outline-none focus:border-signal" />
                  </label>

                  {selectedProvider.authType !== "oauth" ? (
                    <label className="grid gap-2 text-sm font-semibold text-ink">
                      {selectedProvider.keyLabel ?? "API 키"}
                      <div className="relative">
                        <KeyRound className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-moss" />
                        <input type="password" value={hermesConnection.apiKey} onChange={(event) => updateHermesConnection({ apiKey: event.target.value })} placeholder="API 키 입력" className="w-full rounded-md border border-line bg-white py-3 pl-10 pr-3 text-sm text-ink outline-none focus:border-signal" />
                      </div>
                      <span className="text-xs font-normal leading-5 text-stone-500">API 키는 현재 앱 세션에서만 사용합니다. 앱을 다시 열면 다시 입력해야 합니다.</span>
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

                <div className="flex flex-wrap gap-2">
                  <button onClick={saveHermesGuidedSetup} disabled={!canSave} className="inline-flex items-center justify-center gap-2 rounded-md bg-ink px-4 py-3 text-sm font-semibold text-white hover:bg-moss disabled:cursor-not-allowed disabled:opacity-50">
                    <ShieldCheck className="h-4 w-4" />
                    모델 설정 저장
                  </button>
                  <button onClick={() => openHermesSetupWizard("model")} disabled={!installed} className="inline-flex items-center justify-center gap-2 rounded-md border border-line bg-white px-4 py-3 text-sm font-semibold text-ink hover:bg-panel disabled:cursor-not-allowed disabled:opacity-50">
                    <ExternalLink className="h-4 w-4" />
                    고급 모델 setup 열기
                  </button>
                </div>
                <div className="rounded-md border border-line bg-white p-4">
                  <p className="text-sm font-semibold text-ink">업무 능력 프리셋</p>
                  <p className="mt-1 text-xs leading-5 text-stone-600">Hermes toolsets를 초보자용 이름으로 묶습니다. 새 작업부터 적용됩니다.</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    {[
                      ["safe", "안전 모드", "웹 조사, 파일 작성, 스킬, 기억"],
                      ["work", "작업 모드", "웹 조사, 파일 작성, 반복 작업 기억"],
                      ["developer", "개발자 모드", "코드, 브라우저, 하위 에이전트"],
                    ].map(([mode, label, description]) => (
                      <button
                        key={mode}
                        onClick={() => saveHermesToolPreset(mode as "safe" | "work" | "developer")}
                        className={`rounded-md border p-3 text-left text-xs leading-5 ${hermesToolPreset === mode ? "border-signal bg-panel" : "border-line bg-white hover:bg-panel"}`}
                      >
                        <Wrench className="mb-2 h-4 w-4 text-signal" />
                        <span className="block font-bold text-ink">{label}</span>
                        <span className="mt-1 block text-stone-600">{description}</span>
                      </button>
                    ))}
                  </div>
                </div>
                {hermesSetupOutput ? <pre className="max-h-36 overflow-auto rounded-md bg-panel p-3 text-xs leading-5 text-stone-600">{hermesSetupOutput}</pre> : null}
              </div>
            ) : null}

            {stepIndex === 3 ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-ink">연결 확인</h3>
                  <p className="mt-1 text-sm leading-6 text-stone-600">설치와 인증이 끝났다면 실제 작업 전에 현재 제공자와 모델을 확인합니다.</p>
                </div>
                <div className="rounded-md border border-line bg-panel p-4 text-sm leading-6 text-stone-700">
                  <p><span className="font-semibold text-ink">제공자:</span> {selectedProvider.label}</p>
                  <p><span className="font-semibold text-ink">모델:</span> {hermesConnection.modelName || "미입력"}</p>
                  <p><span className="font-semibold text-ink">인증:</span> {isOauth ? "OAuth" : hermesConnection.apiKey ? "API 키 입력됨" : "API 키 없음"}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={testHermesRuntime} className="inline-flex items-center justify-center gap-2 rounded-md bg-ink px-4 py-3 text-sm font-semibold text-white hover:bg-moss">
                    <CheckCircle2 className="h-4 w-4" />
                    {isOauth ? "인증 상태 확인" : "연결 테스트"}
                  </button>
                  <button onClick={dismissHermesOnboarding} className="inline-flex items-center justify-center gap-2 rounded-md border border-line bg-white px-4 py-3 text-sm font-semibold text-ink hover:bg-panel">
                    작업실 시작
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
