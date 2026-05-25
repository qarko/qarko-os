import { Activity, Bot, CheckCircle2, FileText, FolderOpen, MessageSquarePlus, Play, Settings2, ShieldAlert, X } from "lucide-react";
import { useState } from "react";
import { openQarkoWorkspacePath } from "../../adapters/hermesDesktop";
import { useQarkoStore } from "../../store/useQarkoStore";
import type { ExecutionPhase, ReviewNote, Run } from "../../types/qarko";
import { StatusBadge } from "../ui/StatusBadge";

type LiveTab = "log" | "artifacts" | "approval" | "feedback" | "hermes";

const tabs: Array<{ id: LiveTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: "log", label: "실행 로그", icon: Activity },
  { id: "artifacts", label: "산출물", icon: FileText },
  { id: "approval", label: "승인", icon: ShieldAlert },
  { id: "feedback", label: "피드백", icon: MessageSquarePlus },
  { id: "hermes", label: "Hermes", icon: Settings2 },
];

const noteStatusLabel: Record<ReviewNote["status"], string> = {
  open: "대기",
  in_progress: "수정 중",
  done: "완료",
};

const executionPhaseLabel: Record<ExecutionPhase, string> = {
  ready: "준비됨",
  queued: "실행 대기",
  starting: "Hermes 시작 중",
  resuming_session: "이전 세션 이어가는 중",
  running: "실행 중",
  receiving_output: "응답 수신 중",
  waiting_for_approval: "승인 대기",
  completed: "완료",
  failed: "오류",
  cancelled: "취소됨",
};

const formatElapsed = (elapsedMs: number) => {
  if (elapsedMs < 1000) return `${elapsedMs}ms`;
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}시간 ${minutes}분`;
  if (minutes > 0) return `${minutes}분 ${seconds}초`;
  return `${seconds}초`;
};

const getRunTimeLabel = (run: Run) => {
  if (typeof run.elapsedMs === "number") return `경과 ${formatElapsed(run.elapsedMs)}`;
  if (run.startedAt) {
    const startedAtMs = new Date(run.startedAt).getTime();
    if (Number.isFinite(startedAtMs)) return `진행 중 (${formatElapsed(Math.max(Date.now() - startedAtMs, 0))})`;
  }
  if (run.activePhase === "ready" || run.activePhase === "queued") return "대기 중";
  if (
    run.activePhase === "starting" ||
    run.activePhase === "resuming_session" ||
    run.activePhase === "running" ||
    run.activePhase === "receiving_output"
  ) {
    return "진행 중";
  }
  if (run.activePhase === "waiting_for_approval") return "승인 대기";
  if (run.activePhase === "completed") return "완료";
  if (run.activePhase === "failed") return "오류";
  return "취소됨";
};

export function ExecutionPanel() {
  const {
    activeRun,
    addReviewNote,
    approvals,
    artifacts,
    feedback,
    hermesConnection,
    hermesInstallStatus,
    hermesSetupProvider,
    hermesStatus,
    openHermesOnboarding,
    reviewNotes,
    resolveApproval,
    runNextStep,
    selectedProjectId,
    updateReviewNoteStatus,
  } = useQarkoStore();
  const [activeTab, setActiveTab] = useState<LiveTab | null>(null);
  const [noteTarget, setNoteTarget] = useState("현재 화면");
  const [noteMessage, setNoteMessage] = useState("");
  const [workspaceOpenMessage, setWorkspaceOpenMessage] = useState("");
  const [openingWorkspacePath, setOpeningWorkspacePath] = useState<string | null>(null);

  const pendingApproval = approvals.find(
    (approval) => approval.projectId === selectedProjectId && approval.status === "pending"
  );
  const projectArtifacts = artifacts.filter((artifact) => artifact.projectId === selectedProjectId);
  const runtimeTone = hermesStatus === "connected" ? "connected" : hermesStatus === "error" ? "failed" : "not_connected";
  const runtimeLabel = hermesStatus === "connected" ? "Hermes 연결됨" : hermesStatus === "testing" ? "Hermes 확인 중" : hermesStatus === "error" ? "Hermes 오류" : "Hermes 미연결";

  const submitNote = () => {
    const trimmed = noteMessage.trim();
    if (!trimmed) return;
    addReviewNote({ target: noteTarget, message: trimmed });
    setNoteMessage("");
    setActiveTab("feedback");
  };

  const openWorkspace = async (path: string) => {
    setOpeningWorkspacePath(path);
    setWorkspaceOpenMessage("작업 폴더를 여는 중입니다.");
    try {
      const result = await openQarkoWorkspacePath(path);
      setWorkspaceOpenMessage(result.ok ? "작업 폴더를 열었습니다." : result.message);
    } catch (error) {
      setWorkspaceOpenMessage(error instanceof Error ? error.message : "작업 폴더를 열지 못했습니다.");
    } finally {
      setOpeningWorkspacePath(null);
    }
  };

  return (
    <aside className="fixed bottom-0 right-0 top-0 z-40 flex pointer-events-none">
      {activeTab ? (
        <section className="pointer-events-auto flex w-[390px] max-w-[calc(100vw-56px)] flex-col border-l border-line bg-[#fbfbf8] shadow-xl">
          <div className="border-b border-line p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-normal text-moss">실시간 패널</p>
                <h2 className="text-base font-bold text-ink">{activeRun.title}</h2>
              </div>
              <button onClick={() => setActiveTab(null)} className="rounded-md p-2 text-stone-500 hover:bg-panel hover:text-ink" aria-label="패널 닫기">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-2 rounded-md border border-line bg-white p-3 text-xs text-stone-600">
              <div className="flex items-center justify-between gap-2">
                <span>Phase</span>
                <span className="max-w-44 truncate font-medium text-ink">{executionPhaseLabel[activeRun.activePhase]}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span>Time</span>
                <span className="max-w-44 truncate font-medium text-ink">{getRunTimeLabel(activeRun)}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span>Runtime</span>
                <StatusBadge tone={runtimeTone} label={runtimeLabel} />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span>Provider</span>
                <span className="font-medium text-ink">{hermesSetupProvider}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span>Model</span>
                <span className="max-w-44 truncate font-medium text-ink">{hermesConnection.modelName || activeRun.modelName}</span>
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4 thin-scrollbar">
            {activeTab === "log" ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-signal" />
                  <h3 className="text-sm font-semibold text-ink">실행 로그</h3>
                </div>
                <div className="space-y-2">
                  {activeRun.logs.length > 0 ? (
                    activeRun.logs.map((log) => (
                      <div key={log.id} className="rounded-md border border-line bg-white p-3 shadow-sm">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <span className="truncate text-xs font-semibold text-ink">{log.roleName}</span>
                          <span className="text-xs text-moss">{log.timestamp}</span>
                        </div>
                        <p className="text-xs leading-5 text-stone-600">{log.message}</p>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-md border border-dashed border-line bg-white p-4 text-xs leading-5 text-stone-600">
                      아직 실행 로그가 없습니다. 작업실에서 Hermes 실행을 누르면 여기에 진행 상황이 표시됩니다.
                    </p>
                  )}
                </div>
              </div>
            ) : null}

            {activeTab === "artifacts" ? (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-ink">산출물</h3>
                <div className="rounded-md border border-line bg-white p-4 shadow-sm">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-normal text-moss">Output preview</p>
                  <p className="whitespace-pre-wrap text-sm leading-6 text-stone-700">{activeRun.outputPreview || "Hermes 실행 결과가 여기에 표시됩니다."}</p>
                </div>
                {workspaceOpenMessage ? (
                  <p className="rounded-md border border-line bg-panel p-3 text-xs leading-5 text-stone-700">
                    {workspaceOpenMessage}
                  </p>
                ) : null}
                {projectArtifacts.length === 0 ? (
                  <p className="rounded-md border border-dashed border-line bg-white p-4 text-xs leading-5 text-stone-600">
                    이 프로젝트에서 생성된 산출물이 아직 없습니다. Hermes 실행 후 작업 폴더와 초안이 여기에 쌓입니다.
                  </p>
                ) : null}
                {projectArtifacts.slice(0, 5).map((artifact) => (
                  <article key={artifact.id} className="rounded-md border border-line bg-white p-3 shadow-sm">
                    <p className="text-sm font-semibold text-ink">{artifact.title}</p>
                    <p className="mt-1 text-xs leading-5 text-stone-600">{artifact.summary}</p>
                    {artifact.path ? (
                      <button
                        onClick={() => openWorkspace(artifact.path as string)}
                        disabled={openingWorkspacePath === artifact.path}
                        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md border border-line bg-panel px-3 py-2 text-xs font-semibold text-ink hover:bg-white disabled:cursor-wait disabled:opacity-70"
                      >
                        <FolderOpen className="h-3.5 w-3.5" />
                        {openingWorkspacePath === artifact.path ? "여는 중" : "작업 폴더 열기"}
                      </button>
                    ) : null}
                    <p className="mt-2 text-xs text-moss">{artifact.createdAt}</p>
                  </article>
                ))}
              </div>
            ) : null}

            {activeTab === "approval" ? (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-ink">승인</h3>
                <div className="rounded-md border border-line bg-panel p-3 text-xs leading-5 text-stone-700">
                  베타의 샌드박스(안전 승인 모드)는 위험 작업을 승인 대기 목록으로 보여주는 보호 흐름입니다. OS 수준 파일 격리는
                  상용화 전 추가 예정이며, 현재는 검증된 Hermes 실행 파일과 사용자 승인 UX를 중심으로 보호합니다.
                </div>
                {pendingApproval ? (
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
                    <div className="mb-2 flex items-center gap-2 text-caution">
                      <ShieldAlert className="h-4 w-4" />
                      <h4 className="text-sm font-semibold">승인 요청</h4>
                    </div>
                    <p className="text-sm font-semibold text-ink">{pendingApproval.action}</p>
                    <p className="mt-1 text-xs leading-5 text-stone-700">{pendingApproval.whatWillHappen}</p>
                    <p className="mt-2 text-xs leading-5 text-stone-700">{pendingApproval.expectedResult}</p>
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <button
                        onClick={() => resolveApproval(pendingApproval.id, "approved")}
                        className="rounded-md bg-ink px-3 py-2 text-xs font-semibold text-white hover:bg-moss"
                      >
                        승인
                      </button>
                      <button
                        onClick={() => resolveApproval(pendingApproval.id, "revise")}
                        className="rounded-md border border-line bg-white px-3 py-2 text-xs font-semibold text-ink hover:bg-panel"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => resolveApproval(pendingApproval.id, "cancelled")}
                        className="rounded-md border border-line bg-white px-3 py-2 text-xs font-semibold text-stone-600 hover:bg-panel"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="rounded-md border border-dashed border-line bg-white p-4 text-xs leading-5 text-stone-600">
                    현재 승인 대기 작업이 없습니다.
                  </p>
                )}
              </div>
            ) : null}

            {activeTab === "feedback" ? (
              <div className="space-y-4">
                <div className="rounded-md border border-line bg-white p-4 shadow-sm">
                  <h3 className="text-sm font-semibold text-ink">피드백 / 화면 주석</h3>
                  <label className="mt-3 grid gap-2 text-xs font-semibold text-ink">
                    위치
                    <input value={noteTarget} onChange={(event) => setNoteTarget(event.target.value)} className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-signal" />
                  </label>
                  <label className="mt-3 grid gap-2 text-xs font-semibold text-ink">
                    개선사항
                    <textarea
                      value={noteMessage}
                      onChange={(event) => setNoteMessage(event.target.value)}
                      placeholder="이 화면에서 막힌 점이나 바꾸면 좋을 점을 적어주세요."
                      className="min-h-24 rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-signal"
                    />
                  </label>
                  <button onClick={submitNote} disabled={!noteMessage.trim()} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md bg-ink px-4 py-3 text-sm font-semibold text-white hover:bg-moss disabled:cursor-not-allowed disabled:opacity-50">
                    <MessageSquarePlus className="h-4 w-4" />
                    주석 저장
                  </button>
                </div>
                <div className="rounded-md border border-line bg-panel p-3 text-xs leading-5 text-stone-700">
                  저장된 피드백 {feedback.length}개, 화면 주석 {reviewNotes.length}개
                </div>
                <div className="space-y-2">
                  {reviewNotes.map((note) => (
                    <article key={note.id} className="rounded-md border border-line bg-white p-3 shadow-sm">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-semibold text-ink">{note.target}</span>
                        <select value={note.status} onChange={(event) => updateReviewNoteStatus(note.id, event.target.value as ReviewNote["status"])} className="rounded border border-line bg-white px-2 py-1 text-xs">
                          <option value="open">{noteStatusLabel.open}</option>
                          <option value="in_progress">{noteStatusLabel.in_progress}</option>
                          <option value="done">{noteStatusLabel.done}</option>
                        </select>
                      </div>
                      <p className="text-xs leading-5 text-stone-700">{note.message}</p>
                      <p className="mt-2 text-xs text-moss">{note.createdAt}</p>
                    </article>
                  ))}
                </div>
              </div>
            ) : null}

            {activeTab === "hermes" ? (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-ink">Hermes</h3>
                <div className="rounded-md border border-line bg-white p-4 text-sm leading-6 text-stone-700">
                  <p>설치 상태: {hermesInstallStatus}</p>
                  <p>연결 상태: {runtimeLabel}</p>
                  <p className="break-all">모델: {hermesConnection.modelName || "미입력"}</p>
                </div>
                <button onClick={openHermesOnboarding} className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-ink px-4 py-3 text-sm font-semibold text-white hover:bg-moss">
                  <Settings2 className="h-4 w-4" />
                  Hermes 작업실 준비 열기
                </button>
              </div>
            ) : null}
          </div>

          <div className="border-t border-line p-4">
            <button onClick={runNextStep} className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-ink px-4 py-3 text-sm font-semibold text-white hover:bg-moss">
              <Play className="h-4 w-4" />
              현재 단계 실행
            </button>
          </div>
        </section>
      ) : null}

      <nav className="pointer-events-auto flex w-14 flex-col items-center gap-2 border-l border-line bg-[#f5f7f2] py-3 shadow-lg">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const selected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(selected ? null : tab.id)}
              title={tab.label}
              className={`flex h-10 w-10 items-center justify-center rounded-md transition ${
                selected ? "bg-ink text-white shadow-sm" : "text-stone-600 hover:bg-white hover:text-ink"
              }`}
              aria-label={tab.label}
            >
              <Icon className="h-4 w-4" />
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
