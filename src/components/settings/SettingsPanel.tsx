import { CloudDownload, CloudUpload, KeyRound, PlugZap, RotateCcw, Save, Server } from "lucide-react";
import { useQarkoStore } from "../../store/useQarkoStore";
import { SectionHeader } from "../ui/SectionHeader";
import { StatusBadge } from "../ui/StatusBadge";

export function SettingsPanel() {
  const {
    actionNotice,
    hermesAvailableModels,
    hermesConnection,
    hermesMessage,
    hermesStatus,
    loadFromCloud,
    resetWorkspace,
    saveToCloud,
    setSyncEndpoint,
    testHermesRuntime,
    syncEndpoint,
    syncError,
    syncStatus,
    updateHermesConnection,
  } = useQarkoStore();
  const isSyncing = syncStatus === "syncing";
  const isTestingHermes = hermesStatus === "testing";

  return (
    <div className="mx-auto max-w-5xl p-5 lg:p-8">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-normal text-moss">Settings</p>
        <h1 className="mt-1 text-3xl font-bold text-ink">QARKO OS 설정</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
          MVP에서는 로컬 저장, Hermes mock 상태, 초기화 기능을 먼저 제공합니다.
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
            프로젝트, 승인 상태, 플러그인 상태, 실행 로그가 현재 브라우저에 저장됩니다. 다음 단계에서는 Tauri/SQLite 저장소로 옮길 수 있습니다.
          </p>
        </section>

        <section className="rounded-md border border-line bg-white p-5 shadow-sm">
          <SectionHeader title="Hermes 연결" eyebrow="Runtime" />
          <div className="mb-4 flex items-center gap-2">
            <Server className="h-4 w-4 text-signal" />
            <StatusBadge
              tone={hermesStatus === "connected" ? "connected" : hermesStatus === "error" ? "failed" : "mock"}
              label={
                hermesStatus === "connected"
                  ? "연결됨"
                  : hermesStatus === "testing"
                    ? "확인 중"
                    : hermesStatus === "error"
                      ? "오류"
                      : "설정 필요"
              }
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
          <div>
            <label className="block text-sm font-semibold text-ink" htmlFor="hermes-endpoint">
              API 주소
            </label>
            <input
              id="hermes-endpoint"
              value={hermesConnection.endpoint}
              onChange={(event) => updateHermesConnection({ endpoint: event.target.value })}
              placeholder="http://localhost:11434/v1"
              className="mt-2 w-full rounded-md border border-line bg-white px-3 py-3 text-sm text-ink outline-none focus:border-signal"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-ink" htmlFor="hermes-model">
              모델
            </label>
            <input
              id="hermes-model"
              value={hermesConnection.modelName}
              onChange={(event) => updateHermesConnection({ modelName: event.target.value })}
              placeholder="hermes-3"
              className="mt-2 w-full rounded-md border border-line bg-white px-3 py-3 text-sm text-ink outline-none focus:border-signal"
            />
          </div>
        </div>
        <label className="mt-4 block text-sm font-semibold text-ink" htmlFor="hermes-key">
          API Key
        </label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <KeyRound className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-moss" />
            <input
              id="hermes-key"
              type="password"
              value={hermesConnection.apiKey}
              onChange={(event) => updateHermesConnection({ apiKey: event.target.value })}
              placeholder="로컬 Hermes가 키를 요구하지 않으면 비워두세요"
              className="w-full rounded-md border border-line bg-white py-3 pl-10 pr-3 text-sm text-ink outline-none focus:border-signal"
            />
          </div>
          <button
            onClick={testHermesRuntime}
            disabled={isTestingHermes}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-ink px-4 py-3 text-sm font-semibold text-white hover:bg-moss disabled:cursor-not-allowed disabled:opacity-60"
          >
            <PlugZap className="h-4 w-4" />
            연결 테스트
          </button>
        </div>
        <div className="mt-4 rounded-md bg-panel p-3 text-sm leading-6 text-stone-700">
          {hermesMessage}
          {hermesAvailableModels.length > 0 ? (
            <span className="mt-2 block text-xs text-stone-500">
              감지된 모델: {hermesAvailableModels.slice(0, 5).join(", ")}
            </span>
          ) : null}
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
        <label className="block text-sm font-semibold text-ink" htmlFor="sync-endpoint">
          API 주소
        </label>
        <input
          id="sync-endpoint"
          value={syncEndpoint}
          onChange={(event) => setSyncEndpoint(event.target.value)}
          placeholder="/api 또는 https://qarko-os.up.railway.app/api"
          className="mt-2 w-full rounded-md border border-line bg-white px-3 py-3 text-sm text-ink outline-none focus:border-signal"
        />
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={saveToCloud}
            disabled={isSyncing}
            className="inline-flex items-center gap-2 rounded-md bg-ink px-4 py-3 text-sm font-semibold text-white hover:bg-moss disabled:cursor-not-allowed disabled:opacity-60"
          >
            <CloudUpload className="h-4 w-4" />
            현재 상태 저장
          </button>
          <button
            onClick={loadFromCloud}
            disabled={isSyncing}
            className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-4 py-3 text-sm font-semibold text-ink hover:bg-panel disabled:cursor-not-allowed disabled:opacity-60"
          >
            <CloudDownload className="h-4 w-4" />
            서버에서 불러오기
          </button>
        </div>
        {syncError ? <p className="mt-3 text-sm leading-6 text-red-700">{syncError}</p> : null}
        <p className="mt-3 text-sm leading-6 text-stone-600">
          Railway 배포 후 생성된 주소 뒤에 <span className="font-semibold text-ink">/api</span>를 붙이면 웹앱과 Windows 앱이 같은 워크스페이스를 공유할 수 있습니다.
        </p>
      </section>

      <section className="mt-5 rounded-md border border-line bg-white p-5 shadow-sm">
        <SectionHeader title="워크스페이스 초기화" eyebrow="Reset" />
        <p className="mb-4 text-sm leading-6 text-stone-600">
          테스트 중 만든 프로젝트와 처리한 승인 상태를 샘플 데이터로 되돌립니다.
        </p>
        <button
          onClick={resetWorkspace}
          className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-4 py-3 text-sm font-semibold text-ink hover:bg-panel"
        >
          <RotateCcw className="h-4 w-4" />
          샘플 상태로 초기화
        </button>
        <div className="mt-4 rounded-md bg-panel p-3 text-sm leading-6 text-stone-700">{actionNotice}</div>
      </section>
    </div>
  );
}
