import {
  Activity,
  Bot,
  CheckCircle2,
  CircleDot,
  Code2,
  MessageSquarePlus,
  Play,
  ShieldAlert,
} from "lucide-react";
import { useState } from "react";
import { useQarkoStore } from "../../store/useQarkoStore";
import type { ReviewNote } from "../../types/qarko";
import { StatusBadge } from "../ui/StatusBadge";

type LiveTab = "progress" | "changes" | "review" | "notes";

const tabs: Array<{ id: LiveTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: "progress", label: "진행", icon: Activity },
  { id: "changes", label: "변경", icon: Code2 },
  { id: "review", label: "검토", icon: ShieldAlert },
  { id: "notes", label: "주석", icon: MessageSquarePlus },
];

const noteStatusLabel: Record<ReviewNote["status"], string> = {
  open: "대기",
  in_progress: "수정 중",
  done: "완료",
};

export function ExecutionPanel() {
  const {
    activeRun,
    approvals,
    actionNotice,
    artifacts,
    feedback,
    hermesConnection,
    hermesInstallStatus,
    hermesSetupProvider,
    hermesStatus,
    plugins,
    reviewNotes,
    runNextStep,
    addReviewNote,
    updateReviewNoteStatus,
  } = useQarkoStore();
  const [activeTab, setActiveTab] = useState<LiveTab>("progress");
  const [noteTarget, setNoteTarget] = useState("현재 화면");
  const [noteMessage, setNoteMessage] = useState("");
  const pendingApproval = approvals.find((approval) => approval.status === "pending");
  const runtimeTone = hermesStatus === "connected" ? "connected" : hermesStatus === "error" ? "failed" : "mock";
  const runtimeLabel =
    hermesStatus === "connected" ? "Hermes 연결됨" : hermesStatus === "testing" ? "Hermes 확인 중" : hermesStatus === "error" ? "Hermes 오류" : "Hermes Mock";

  const submitNote = () => {
    const trimmed = noteMessage.trim();
    if (!trimmed) return;
    addReviewNote({ target: noteTarget, message: trimmed });
    setNoteMessage("");
    setActiveTab("notes");
  };

  return (
    <aside className="flex h-full flex-col bg-[#fbfbf8]">
      <div className="border-b border-line p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-normal text-moss">Live panel</p>
            <h2 className="text-base font-bold text-ink">{activeRun.title}</h2>
          </div>
          <StatusBadge tone={activeRun.status} />
        </div>
        <div className="grid gap-2 rounded-md border border-line bg-white p-3 text-xs text-stone-600">
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
            <span className="max-w-44 truncate font-medium text-ink">{hermesStatus === "connected" ? hermesConnection.modelName : activeRun.modelName}</span>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-1 rounded-md border border-line bg-panel p-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-center gap-1 rounded px-2 py-2 text-xs font-semibold ${
                  selected ? "bg-white text-ink shadow-sm" : "text-stone-600 hover:bg-white/70"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 thin-scrollbar">
        {activeTab === "progress" ? (
          <div className="space-y-4">
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Bot className="h-4 w-4 text-signal" />
                <h3 className="text-sm font-semibold text-ink">실시간 진행 로그</h3>
              </div>
              <div className="space-y-2">
                {activeRun.logs.map((log) => (
                  <div key={log.id} className="rounded-md border border-line bg-white p-3 shadow-sm">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        {log.status === "completed" ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-signal" />
                        ) : (
                          <CircleDot className="h-4 w-4 shrink-0 text-caution" />
                        )}
                        <span className="truncate text-xs font-semibold text-ink">{log.roleName}</span>
                      </div>
                      <span className="text-xs text-moss">{log.timestamp}</span>
                    </div>
                    <p className="text-xs leading-5 text-stone-600">{log.message}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-md border border-line bg-panel p-3 text-xs leading-5 text-stone-700">{actionNotice}</div>
          </div>
        ) : null}

        {activeTab === "changes" ? (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-ink">변경 사항 요약</h3>
            <div className="grid gap-2 text-xs leading-5 text-stone-700">
              <div className="rounded-md border border-line bg-white p-3">Hermes 설치 상태: {hermesInstallStatus}</div>
              <div className="rounded-md border border-line bg-white p-3">설치된 플러그인: {plugins.filter((plugin) => plugin.enabled).length}개</div>
              <div className="rounded-md border border-line bg-white p-3">산출물: {artifacts.length}개</div>
              <div className="rounded-md border border-line bg-white p-3">테스터 피드백: {feedback.length}개</div>
              <div className="rounded-md border border-line bg-white p-3">화면 주석: {reviewNotes.length}개</div>
            </div>
          </div>
        ) : null}

        {activeTab === "review" ? (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-ink">승인과 검토</h3>
            {pendingApproval ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
                <div className="mb-2 flex items-center gap-2 text-caution">
                  <ShieldAlert className="h-4 w-4" />
                  <h4 className="text-sm font-semibold">승인 요청</h4>
                </div>
                <p className="text-sm font-semibold text-ink">{pendingApproval.action}</p>
                <p className="mt-1 text-xs leading-5 text-stone-700">{pendingApproval.whatWillHappen}</p>
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-line bg-white p-4 text-xs leading-5 text-stone-600">
                현재 즉시 승인할 작업은 없습니다.
              </div>
            )}
            <div className="rounded-md border border-line bg-white p-4 shadow-sm">
              <p className="mb-2 text-xs font-semibold uppercase tracking-normal text-moss">Output preview</p>
              <p className="text-sm leading-6 text-stone-700">{activeRun.outputPreview}</p>
            </div>
          </div>
        ) : null}

        {activeTab === "notes" ? (
          <div className="space-y-4">
            <div className="rounded-md border border-line bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-ink">화면 주석 남기기</h3>
              <label className="mt-3 grid gap-2 text-xs font-semibold text-ink">
                위치
                <input
                  value={noteTarget}
                  onChange={(event) => setNoteTarget(event.target.value)}
                  className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-signal"
                />
              </label>
              <label className="mt-3 grid gap-2 text-xs font-semibold text-ink">
                개선사항
                <textarea
                  value={noteMessage}
                  onChange={(event) => setNoteMessage(event.target.value)}
                  placeholder="이 화면에서 무엇을 바꾸면 좋을지 적어주세요."
                  className="min-h-24 rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-signal"
                />
              </label>
              <button
                onClick={submitNote}
                disabled={!noteMessage.trim()}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md bg-ink px-4 py-3 text-sm font-semibold text-white hover:bg-moss disabled:cursor-not-allowed disabled:opacity-50"
              >
                <MessageSquarePlus className="h-4 w-4" />
                주석 저장
              </button>
              <p className="mt-2 text-xs leading-5 text-stone-500">저장된 주석은 피드백 큐에 추가되며, 피드백 보내기를 누르면 Discord로 전달됩니다.</p>
            </div>
            <div className="space-y-2">
              {reviewNotes.length === 0 ? (
                <div className="rounded-md border border-dashed border-line bg-white p-4 text-xs leading-5 text-stone-600">아직 저장된 화면 주석이 없습니다.</div>
              ) : (
                reviewNotes.map((note) => (
                  <article key={note.id} className="rounded-md border border-line bg-white p-3 shadow-sm">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-semibold text-ink">{note.target}</span>
                      <select
                        value={note.status}
                        onChange={(event) => updateReviewNoteStatus(note.id, event.target.value as ReviewNote["status"])}
                        className="rounded border border-line bg-white px-2 py-1 text-xs"
                      >
                        <option value="open">{noteStatusLabel.open}</option>
                        <option value="in_progress">{noteStatusLabel.in_progress}</option>
                        <option value="done">{noteStatusLabel.done}</option>
                      </select>
                    </div>
                    <p className="text-xs leading-5 text-stone-700">{note.message}</p>
                    <p className="mt-2 text-xs text-moss">{note.createdAt}</p>
                  </article>
                ))
              )}
            </div>
          </div>
        ) : null}
      </div>

      <div className="border-t border-line p-4">
        <button
          onClick={runNextStep}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-ink px-4 py-3 text-sm font-semibold text-white hover:bg-moss"
        >
          <Play className="h-4 w-4" />
          다음 단계 실행
        </button>
      </div>
    </aside>
  );
}
