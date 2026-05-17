import { RotateCcw, Save, Server } from "lucide-react";
import { useQarkoStore } from "../../store/useQarkoStore";
import { SectionHeader } from "../ui/SectionHeader";
import { StatusBadge } from "../ui/StatusBadge";

export function SettingsPanel() {
  const { actionNotice, resetWorkspace } = useQarkoStore();

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
            <StatusBadge tone="mock" label="Mock 모드" />
          </div>
          <p className="text-sm leading-6 text-stone-600">
            현재는 실제 Hermes API 호출 없이 실행 로그와 UX를 검증합니다. 실제 연결은 adapter 경계에 붙이면 됩니다.
          </p>
        </section>
      </div>

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
