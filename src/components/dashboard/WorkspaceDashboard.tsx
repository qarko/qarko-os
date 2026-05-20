import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  FolderKanban,
  LockKeyhole,
  Play,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";
import { useState } from "react";
import { hermesStrengths, sandboxModeOptions } from "../../data/mockData";
import { useQarkoStore } from "../../store/useQarkoStore";
import type { AutomationMode } from "../../types/qarko";
import { StatusBadge } from "../ui/StatusBadge";

const modeToPolicy = {
  manual: sandboxModeOptions[0],
  assisted: sandboxModeOptions[1],
  automation: sandboxModeOptions[2],
  custom: sandboxModeOptions[1],
};

export function WorkspaceDashboard() {
  const {
    activeRun,
    actionNotice,
    approvals,
    artifacts,
    hermesConnection,
    hermesInstallStatus,
    hermesStatus,
    projects,
    runWorkbenchTask,
    selectProject,
    selectedProjectId,
    setAutomationMode,
    setView,
  } = useQarkoStore();
  const [quickTask, setQuickTask] = useState("");
  const [quickMode, setQuickMode] = useState<AutomationMode>("assisted");

  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? projects[0];
  const activeMode = selectedProject?.automationMode ?? quickMode;
  const selectedMode = modeToPolicy[activeMode];
  const pendingApprovals = approvals.filter((approval) => approval.status === "pending");
  const hermesReady = hermesStatus === "connected";
  const canRun = Boolean(selectedProject) || quickTask.trim().length > 0;
  const suggestedTask =
    selectedProject?.nextAction ??
    "예: Threads에서 QARKO OS 베타 테스터 5명을 모집하기 위한 7일 실행 계획과 첫 게시글 초안을 만들어줘.";

  const changeMode = (mode: AutomationMode) => {
    setQuickMode(mode);
    if (selectedProject) setAutomationMode(mode);
  };

  const runTask = () => {
    void runWorkbenchTask(quickTask || suggestedTask, activeMode);
    setQuickTask("");
  };

  return (
    <div className="mx-auto max-w-6xl p-5 lg:p-8">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-normal text-moss">QARKO 작업실</p>
          <h1 className="mt-1 text-3xl font-bold text-ink">오늘 할 일을 Hermes로 바로 실행하세요</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">
            모델 선택, 도구 실행, 승인 대기, 산출물 확인을 한 화면에서 처리합니다. 터미널을 몰라도 Hermes의 강점을
            사업 실행 흐름으로 사용할 수 있게 만드는 것이 QARKO OS의 역할입니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge tone={hermesReady ? "connected" : "not_connected"} label={hermesReady ? "Hermes 연결됨" : "Hermes 준비 필요"} />
          <StatusBadge tone={activeRun.status} />
        </div>
      </div>

      <div className="mb-5 rounded-md border border-line bg-white p-4 text-sm leading-6 text-stone-700 shadow-sm">
        <span className="font-semibold text-ink">현재 상태: </span>
        {actionNotice}
      </div>

      <section className="mb-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="rounded-md border border-line bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-normal text-moss">
                <FolderKanban className="h-4 w-4" />
                현재 작업실
              </div>
              <h2 className="mt-2 text-2xl font-bold text-ink">{selectedProject?.name ?? "아직 프로젝트가 없습니다"}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
                {selectedProject?.idea ?? "첫 작업을 입력하면 QARKO가 자동으로 프로젝트를 만들고 Hermes 실행 흐름에 연결합니다."}
              </p>
            </div>
            <button
              onClick={() => setView("new-project")}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-line bg-panel px-4 py-2 text-sm font-semibold text-ink hover:bg-white"
            >
              <Sparkles className="h-4 w-4" />새 프로젝트
            </button>
          </div>

          <div className="rounded-md border border-line bg-panel p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
              <Play className="h-4 w-4 text-signal" />
              오늘 할 작업
            </div>
            <textarea
              value={quickTask}
              onChange={(event) => setQuickTask(event.target.value)}
              placeholder={suggestedTask}
              className="min-h-28 w-full resize-y rounded-md border border-line bg-white p-4 text-sm leading-6 text-stone-700 outline-none focus:border-signal"
            />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-md border border-line bg-white px-3 py-2 text-xs font-semibold text-ink">
                모델: {hermesConnection.modelName || "미선택"}
              </span>
              <span className="rounded-md border border-line bg-white px-3 py-2 text-xs font-semibold text-ink">권한: {selectedMode.label}</span>
              <span className="rounded-md border border-line bg-white px-3 py-2 text-xs font-semibold text-ink">설치: {hermesInstallStatus}</span>
              <button
                onClick={runTask}
                disabled={!canRun || activeRun.status === "running"}
                className="ml-auto inline-flex items-center justify-center gap-2 rounded-md bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:bg-moss disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Play className="h-4 w-4" />
                Hermes 실행
              </button>
            </div>
          </div>
        </div>

        <aside className="rounded-md border border-line bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-signal" />
            <h3 className="text-sm font-bold text-ink">샌드박스(안전 승인 모드)</h3>
          </div>
          <p className="text-sm leading-6 text-stone-600">
            베타에서는 작업 범위를 사용자가 먼저 고르고, 위험 작업은 승인 대기 항목으로 보여줍니다. OS 수준 파일 격리는
            상용화 전 추가 예정이며 현재는 검증된 Hermes 실행 파일과 승인 UX를 중심으로 보호합니다.
          </p>
          <div className="mt-3 space-y-2">
            {sandboxModeOptions.map((mode) => (
              <button
                key={mode.id}
                onClick={() => changeMode(mode.id)}
                className={`w-full rounded-md border p-3 text-left text-xs leading-5 transition ${
                  selectedMode.id === mode.id ? "border-signal bg-panel" : "border-line bg-white hover:bg-panel"
                }`}
              >
                <span className="font-bold text-ink">{mode.label}</span>
                <span className="mt-1 block text-stone-600">{mode.summary}</span>
              </button>
            ))}
          </div>
        </aside>
      </section>

      <section className="mb-5 grid gap-4 lg:grid-cols-4">
        {hermesStrengths.map((item, index) => {
          const Icon = [BrainCircuit, Wrench, LockKeyhole, CheckCircle2][index] ?? BrainCircuit;
          return (
            <div key={item.title} className="rounded-md border border-line bg-white p-4 shadow-sm">
              <Icon className="mb-3 h-5 w-5 text-signal" />
              <h3 className="text-sm font-bold text-ink">{item.title}</h3>
              <p className="mt-2 text-xs leading-5 text-stone-600">{item.description}</p>
            </div>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr_1fr]">
        <div className="rounded-md border border-line bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-bold text-ink">작업 단계</h3>
          <div className="space-y-2">
            {(selectedProject?.tasks ?? []).slice(0, 4).map((task) => (
              <div key={task.id} className="rounded-md border border-line bg-panel p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-ink">{task.title}</p>
                  <StatusBadge tone={task.status} />
                </div>
                <p className="mt-1 text-xs leading-5 text-stone-600">{task.description}</p>
              </div>
            ))}
            {!selectedProject ? (
              <p className="rounded-md border border-dashed border-line bg-panel p-4 text-sm leading-6 text-stone-600">
                첫 작업을 실행하면 QARKO가 단계와 역할을 자동으로 정리합니다.
              </p>
            ) : null}
          </div>
        </div>

        <div className="rounded-md border border-line bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-bold text-ink">승인 대기</h3>
          <div className="space-y-2">
            {pendingApprovals.length > 0 ? (
              pendingApprovals.slice(0, 3).map((approval) => (
                <div key={approval.id} className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-stone-700">
                  <p className="font-bold text-ink">{approval.action}</p>
                  <p className="mt-1">{approval.whatWillHappen}</p>
                </div>
              ))
            ) : (
              <p className="rounded-md border border-dashed border-line bg-panel p-4 text-sm leading-6 text-stone-600">
                현재 승인 대기 작업이 없습니다.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-md border border-line bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-bold text-ink">최근 산출물</h3>
          <div className="space-y-2">
            {artifacts.slice(0, 3).map((artifact) => (
              <button key={artifact.id} className="w-full rounded-md border border-line bg-panel p-3 text-left hover:bg-white">
                <p className="text-sm font-semibold text-ink">{artifact.title}</p>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-stone-600">{artifact.summary}</p>
              </button>
            ))}
            {artifacts.length === 0 ? (
              <p className="rounded-md border border-dashed border-line bg-panel p-4 text-sm leading-6 text-stone-600">
                Hermes 실행 결과가 여기에 저장됩니다.
              </p>
            ) : null}
          </div>
        </div>
      </section>

      {projects.length > 0 ? (
        <section className="mt-5 rounded-md border border-line bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-ink">프로젝트 전환</h3>
            <ArrowRight className="h-4 w-4 text-moss" />
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {projects.map((project) => (
              <button key={project.id} onClick={() => selectProject(project.id)} className="rounded-md border border-line bg-panel p-3 text-left hover:bg-white">
                <p className="text-sm font-semibold text-ink">{project.name}</p>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-stone-600">{project.idea}</p>
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
