import { CheckCircle2, CloudDownload, CloudUpload, KeyRound, PlugZap, RotateCcw, Save, Server, ShieldCheck } from "lucide-react";
import { getHermesVerifiedInstallPlan } from "../../adapters/hermesDesktop";
import { hermesProviderOptions } from "../../data/hermesProviders";
import { useQarkoStore } from "../../store/useQarkoStore";
import { SectionHeader } from "../ui/SectionHeader";
import { StatusBadge } from "../ui/StatusBadge";

export function SettingsPanel() {
  const {
    actionNotice,
    hermesAvailableModels,
    hermesConnection,
    hermesExecutablePath,
    hermesInstallMessage,
    hermesInstallStatus,
    hermesMessage,
    hermesSetupOutput,
    hermesSetupProvider,
    hermesStatus,
    hermesUpdateMessage,
    hermesUpdateStatus,
    checkHermesInstall,
    installHermesDesktop,
    loadFromCloud,
    openHermesOnboarding,
    resetWorkspace,
    saveHermesGuidedSetup,
    saveToCloud,
    setSyncAccessToken,
    setSyncEndpoint,
    testHermesRuntime,
    syncAccessToken,
    syncEndpoint,
    syncError,
    syncStatus,
    updateHermesConnection,
    updateHermesVerified,
    updateHermesSetupProvider,
  } = useQarkoStore();
  const isSyncing = syncStatus === "syncing";
  const isTestingHermes = hermesStatus === "testing";
  const hermesInstalled = hermesInstallStatus === "installed";
  const hermesInstallPlan = getHermesVerifiedInstallPlan();
  const updatingHermes = hermesUpdateStatus === "updating";
  const changingHermesInstall = hermesInstallStatus === "installing" || updatingHermes;
  const updateCenterMessage =
    hermesUpdateStatus === "idle"
      ? "업데이트는 QARKO가 확인한 버전으로만 진행합니다. 새 버전 적용도 사용자가 직접 승인해야 시작됩니다."
      : hermesUpdateMessage;
  const canUseUpdateCenter = hermesInstallStatus === "installed" || hermesUpdateStatus === "completed" || hermesUpdateStatus === "error";

  return (
    <div className="mx-auto max-w-5xl p-5 lg:p-8">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-normal text-moss">Settings</p>
        <h1 className="mt-1 text-3xl font-bold text-ink">QARKO OS 설정</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
          Hermes 연결, 피드백 동기화, 로컬 저장 상태를 관리합니다.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-md border border-line bg-white p-5 shadow-sm">
          <SectionHeader title="로컬 저장" eyebrow="Storage" />
          <div className="mb-4 flex items-center gap-2">
            <Save className="h-4 w-4 text-signal" />
            <StatusBadge tone="completed" label="켜짐" />
          </div>
          <p className="text-sm leading-6 text-stone-600">
            프로젝트, 승인 상태, 플러그인, 실행 로그가 이 PC에 저장됩니다. 모델 API 키는 장기 저장하지 않습니다.
          </p>
        </section>

        <section className="rounded-md border border-line bg-white p-5 shadow-sm">
          <SectionHeader title="Hermes 연결" eyebrow="Runtime" />
          <div className="mb-4 flex items-center gap-2">
            <Server className="h-4 w-4 text-signal" />
            <StatusBadge
              tone={hermesStatus === "connected" ? "connected" : hermesStatus === "error" ? "failed" : "mock"}
              label={hermesStatus === "connected" ? "연결됨" : hermesStatus === "testing" ? "확인 중" : hermesStatus === "error" ? "오류" : "설정 필요"}
            />
          </div>
          <p className="text-sm leading-6 text-stone-600">
            Hermes 또는 OpenAI-compatible 런타임의 API 주소와 모델을 저장한 뒤 연결을 테스트합니다.
          </p>
        </section>
      </div>

      <section className="mt-5 rounded-md border border-line bg-white p-5 shadow-sm">
        <SectionHeader title="Hermes 런타임 설정" eyebrow="Agent runtime" />
        <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
          <label className="block text-sm font-semibold text-ink">
            API 주소
            <input
              value={hermesConnection.endpoint}
              onChange={(event) => updateHermesConnection({ endpoint: event.target.value })}
              placeholder="http://localhost:11434/v1"
              className="mt-2 w-full rounded-md border border-line bg-white px-3 py-3 text-sm text-ink outline-none focus:border-signal"
            />
          </label>
          <label className="block text-sm font-semibold text-ink">
            모델
            <input
              value={hermesConnection.modelName}
              onChange={(event) => updateHermesConnection({ modelName: event.target.value })}
              placeholder="hermes-3"
              className="mt-2 w-full rounded-md border border-line bg-white px-3 py-3 text-sm text-ink outline-none focus:border-signal"
            />
          </label>
        </div>
        <label className="mt-4 block text-sm font-semibold text-ink">
          API Key
          <div className="relative mt-2">
            <KeyRound className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-moss" />
            <input
              type="password"
              value={hermesConnection.apiKey}
              onChange={(event) => updateHermesConnection({ apiKey: event.target.value })}
              placeholder="로컬 Hermes가 키를 요구하지 않으면 비워두세요"
              className="w-full rounded-md border border-line bg-white py-3 pl-10 pr-3 text-sm text-ink outline-none focus:border-signal"
            />
          </div>
          <span className="mt-2 block text-xs font-normal leading-5 text-stone-500">
            API 키는 저장하지 않고 연결 테스트 요청에만 임시로 사용합니다.
          </span>
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={testHermesRuntime} disabled={isTestingHermes} className="inline-flex items-center justify-center gap-2 rounded-md bg-ink px-4 py-3 text-sm font-semibold text-white hover:bg-moss disabled:cursor-not-allowed disabled:opacity-60">
            <PlugZap className="h-4 w-4" />
            연결 테스트
          </button>
          <button onClick={openHermesOnboarding} className="inline-flex items-center justify-center gap-2 rounded-md border border-line bg-white px-4 py-3 text-sm font-semibold text-ink hover:bg-panel">
            <ShieldCheck className="h-4 w-4" />
            설정 마법사 열기
          </button>
        </div>
        <div className="mt-4 rounded-md bg-panel p-3 text-sm leading-6 text-stone-700">
          {hermesMessage}
          {hermesAvailableModels.length > 0 ? <span className="mt-2 block text-xs text-stone-500">감지된 모델: {hermesAvailableModels.slice(0, 5).join(", ")}</span> : null}
        </div>
      </section>

      <section className="mt-5 rounded-md border border-line bg-white p-5 shadow-sm">
        <SectionHeader title="Hermes 설치와 쉬운 설정" eyebrow="Desktop setup" />
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-signal" />
          <StatusBadge
            tone={hermesInstalled ? "completed" : hermesInstallStatus === "error" ? "failed" : hermesInstallStatus === "installing" ? "running" : "planned"}
            label={hermesInstalled ? "설치됨" : hermesInstallStatus === "installing" ? "설치 중" : hermesInstallStatus === "error" ? "오류" : "확인 필요"}
          />
        </div>
        <p className="text-sm leading-6 text-stone-600">{hermesInstallMessage}</p>
        <p className="mt-2 text-xs leading-5 text-stone-600">
          보안을 위해 설치 프로그램이 백그라운드에서 자동 설치하지 않습니다. 사용자가 이 버튼을 눌렀을 때만 QARKO가 확인한 설치 파일로 진행합니다.
        </p>
        {hermesExecutablePath ? <p className="mt-2 break-all text-xs text-stone-500">{hermesExecutablePath}</p> : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={checkHermesInstall} disabled={changingHermesInstall} className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-4 py-3 text-sm font-semibold text-ink hover:bg-panel disabled:cursor-not-allowed disabled:opacity-60">
            <CheckCircle2 className="h-4 w-4" />
            설치 상태 확인
          </button>
          <button onClick={installHermesDesktop} disabled={changingHermesInstall} className="inline-flex items-center gap-2 rounded-md bg-ink px-4 py-3 text-sm font-semibold text-white hover:bg-moss disabled:cursor-not-allowed disabled:opacity-60">
            <PlugZap className="h-4 w-4" />
            앱 안에서 Hermes 설치
          </button>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-[180px_1fr_1fr]">
          <label className="grid gap-2 text-sm font-semibold text-ink">
            제공자
            <select value={hermesSetupProvider} onChange={(event) => updateHermesSetupProvider(event.target.value)} className="rounded-md border border-line bg-white px-3 py-3 text-sm text-ink outline-none focus:border-signal">
              {hermesProviderOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold text-ink">
            모델명
            <input value={hermesConnection.modelName} onChange={(event) => updateHermesConnection({ modelName: event.target.value })} placeholder="openrouter/anthropic/claude-sonnet-4.5" className="rounded-md border border-line bg-white px-3 py-3 text-sm text-ink outline-none focus:border-signal" />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-ink">
            API Key
            <input type="password" value={hermesConnection.apiKey} onChange={(event) => updateHermesConnection({ apiKey: event.target.value })} placeholder="필요한 경우 입력" className="rounded-md border border-line bg-white px-3 py-3 text-sm text-ink outline-none focus:border-signal" />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={saveHermesGuidedSetup} disabled={!hermesInstalled} className="inline-flex items-center gap-2 rounded-md bg-ink px-4 py-3 text-sm font-semibold text-white hover:bg-moss disabled:cursor-not-allowed disabled:opacity-50">
            <ShieldCheck className="h-4 w-4" />
            모델 설정 저장
          </button>
        </div>
        {hermesSetupOutput ? <pre className="mt-3 max-h-32 overflow-auto rounded-md bg-panel p-3 text-xs leading-5 text-stone-600">{hermesSetupOutput}</pre> : null}
      </section>

      <section className="mt-5 rounded-md border border-line bg-white p-5 shadow-sm">
        <SectionHeader title="업데이트 센터" eyebrow="Safe updates" />
        <div className="space-y-4">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-signal" />
              <StatusBadge
                tone={hermesUpdateStatus === "error" ? "failed" : updatingHermes ? "running" : hermesUpdateStatus === "completed" ? "completed" : "planned"}
                label={updatingHermes ? "업데이트 중" : hermesUpdateStatus === "completed" ? "확인된 버전 적용됨" : hermesUpdateStatus === "error" ? "오류" : "대기"}
              />
            </div>
            <p className="text-sm leading-6 text-stone-600">
              QARKO는 확인된 Hermes 버전만 설치하거나 복구합니다. 새 버전이 필요할 때도 사용자가 이 화면에서 직접 승인한 경우에만 진행합니다.
            </p>
            <p className="mt-3 rounded-md bg-panel p-3 text-sm leading-6 text-stone-700">{updateCenterMessage}</p>
            {canUseUpdateCenter ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={updateHermesVerified} disabled={changingHermesInstall} className="inline-flex items-center gap-2 rounded-md bg-ink px-4 py-3 text-sm font-semibold text-white hover:bg-moss disabled:cursor-not-allowed disabled:opacity-60">
                  <CloudDownload className="h-4 w-4" />
                  확인된 버전으로 맞추기
                </button>
              </div>
            ) : (
              <p className="mt-4 rounded-md border border-line bg-white p-3 text-sm leading-6 text-stone-600">
                처음 설치는 위의 <span className="font-semibold text-ink">앱 안에서 Hermes 설치</span> 버튼으로 진행하세요. 설치가 끝나면 여기에서 업데이트와 복구를 관리할 수 있습니다.
              </p>
            )}
            <p className="mt-3 text-xs leading-5 text-stone-500">
              베타 기간에는 무작정 최신 버전을 따라가기보다 QARKO에서 확인한 버전으로 맞추는 방식이 더 안전합니다.
            </p>
          </div>
          <details className="rounded-md border border-line bg-panel p-4 text-xs leading-5 text-stone-700">
            <summary className="cursor-pointer text-sm font-semibold text-ink">고급 설치 정보 보기</summary>
            <p className="mt-3 text-stone-600">
              이 정보는 문제 해결이나 보안 검토 때만 확인하면 됩니다. 일반 사용자는 위 버튼만 사용해도 됩니다.
            </p>
            <p className="mt-3 break-all">Hermes commit: {hermesInstallPlan.hermesCommit}</p>
            <p className="mt-2 break-all">Installer SHA256: {hermesInstallPlan.installScriptSha256}</p>
            <div className="mt-3 grid gap-2 lg:grid-cols-3">
              {hermesInstallPlan.dependencies.map((dependency) => (
                <div key={dependency.name} className="rounded-md bg-white p-3">
                  <p className="font-semibold text-ink">{dependency.name}</p>
                  <p className="break-all text-stone-500">{dependency.version}</p>
                  <p className="mt-1 text-stone-600">{dependency.policy}</p>
                </div>
              ))}
            </div>
          </details>
        </div>
      </section>

      <section className="mt-5 rounded-md border border-line bg-white p-5 shadow-sm">
        <SectionHeader title="Railway 클라우드 동기화" eyebrow="Cloud sync" />
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Server className="h-4 w-4 text-signal" />
          <StatusBadge
            tone={syncStatus === "error" ? "failed" : syncStatus === "synced" ? "completed" : "running"}
            label={syncStatus === "syncing" ? "동기화 중" : syncStatus === "synced" ? "연결됨" : syncStatus === "error" ? "오류" : "대기"}
          />
        </div>
        <label className="block text-sm font-semibold text-ink">
          API 주소
          <input value={syncEndpoint} onChange={(event) => setSyncEndpoint(event.target.value)} placeholder="/api 또는 https://qarko-os.up.railway.app/api" className="mt-2 w-full rounded-md border border-line bg-white px-3 py-3 text-sm text-ink outline-none focus:border-signal" />
        </label>
        <label className="mt-4 block text-sm font-semibold text-ink">
          관리자 토큰
          <div className="relative mt-2">
            <KeyRound className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-moss" />
            <input type="password" value={syncAccessToken} onChange={(event) => setSyncAccessToken(event.target.value)} placeholder="서버 피드백 조회와 워크스페이스 동기화에 필요" className="w-full rounded-md border border-line bg-white py-3 pl-10 pr-3 text-sm text-ink outline-none focus:border-signal" />
          </div>
        </label>
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={saveToCloud} disabled={isSyncing} className="inline-flex items-center gap-2 rounded-md bg-ink px-4 py-3 text-sm font-semibold text-white hover:bg-moss disabled:cursor-not-allowed disabled:opacity-60">
            <CloudUpload className="h-4 w-4" />
            현재 상태 저장
          </button>
          <button onClick={loadFromCloud} disabled={isSyncing} className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-4 py-3 text-sm font-semibold text-ink hover:bg-panel disabled:cursor-not-allowed disabled:opacity-60">
            <CloudDownload className="h-4 w-4" />
            서버에서 불러오기
          </button>
        </div>
        {syncError ? <p className="mt-3 text-sm leading-6 text-red-700">{syncError}</p> : null}
      </section>

      <section className="mt-5 rounded-md border border-line bg-white p-5 shadow-sm">
        <SectionHeader title="워크스페이스 초기화" eyebrow="Reset" />
        <p className="mb-4 text-sm leading-6 text-stone-600">테스트 중 만든 프로젝트와 처리한 승인 상태를 샘플 데이터로 되돌립니다.</p>
        <button onClick={resetWorkspace} className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-4 py-3 text-sm font-semibold text-ink hover:bg-panel">
          <RotateCcw className="h-4 w-4" />
          샘플 상태로 초기화
        </button>
        <div className="mt-4 rounded-md bg-panel p-3 text-sm leading-6 text-stone-700">{actionNotice}</div>
      </section>
    </div>
  );
}
