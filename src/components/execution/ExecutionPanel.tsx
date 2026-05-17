import { Bot, CheckCircle2, CircleDot, Play, ShieldAlert } from "lucide-react";
import { useQarkoStore } from "../../store/useQarkoStore";
import { StatusBadge } from "../ui/StatusBadge";

export function ExecutionPanel() {
  const { activeRun, approvals, actionNotice, hermesConnection, hermesStatus, runNextStep } = useQarkoStore();
  const pendingApproval = approvals.find((approval) => approval.status === "pending");
  const runtimeTone = hermesStatus === "connected" ? "connected" : hermesStatus === "error" ? "failed" : "mock";
  const runtimeLabel =
    hermesStatus === "connected" ? "Hermes 연결됨" : hermesStatus === "testing" ? "Hermes 확인 중" : hermesStatus === "error" ? "Hermes 오류" : "Hermes Mock";

  return (
    <aside className="flex h-full flex-col">
      <div className="border-b border-line p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-normal text-moss">Live execution</p>
            <h2 className="text-lg font-bold text-ink">{activeRun.title}</h2>
          </div>
          <StatusBadge tone={activeRun.status} />
        </div>
        <div className="grid gap-2 rounded-md bg-panel p-3 text-xs text-stone-600">
          <div className="flex items-center justify-between">
            <span>Runtime</span>
            <StatusBadge tone={runtimeTone} label={runtimeLabel} />
          </div>
          <div className="flex items-center justify-between">
            <span>Model</span>
            <span className="font-medium text-ink">{hermesStatus === "connected" ? hermesConnection.modelName : activeRun.modelName}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Agent</span>
            <span className="font-medium text-ink">{activeRun.activeRoleName}</span>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-5 thin-scrollbar">
        <div className="mb-5">
          <div className="mb-3 flex items-center gap-2">
            <Bot className="h-4 w-4 text-signal" />
            <h3 className="text-sm font-semibold text-ink">실행 로그</h3>
          </div>
          <div className="space-y-3">
            {activeRun.logs.map((log) => (
              <div key={log.id} className="rounded-md border border-line bg-white p-3 shadow-sm">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {log.status === "completed" ? (
                      <CheckCircle2 className="h-4 w-4 text-signal" />
                    ) : (
                      <CircleDot className="h-4 w-4 text-caution" />
                    )}
                    <span className="text-xs font-semibold text-ink">{log.roleName}</span>
                  </div>
                  <span className="text-xs text-moss">{log.timestamp}</span>
                </div>
                <p className="text-xs leading-5 text-stone-600">{log.message}</p>
              </div>
            ))}
          </div>
        </div>

        {pendingApproval ? (
          <div className="mb-5 rounded-md border border-amber-200 bg-amber-50 p-4">
            <div className="mb-2 flex items-center gap-2 text-caution">
              <ShieldAlert className="h-4 w-4" />
              <h3 className="text-sm font-semibold">승인 요청</h3>
            </div>
            <p className="text-sm font-semibold text-ink">{pendingApproval.action}</p>
            <p className="mt-1 text-xs leading-5 text-stone-700">{pendingApproval.whatWillHappen}</p>
          </div>
        ) : (
          <div className="mb-5 rounded-md border border-dashed border-line bg-white p-4">
            <div className="mb-2 flex items-center gap-2 text-signal">
              <ShieldAlert className="h-4 w-4" />
              <h3 className="text-sm font-semibold">승인 요청 대기</h3>
            </div>
            <p className="text-xs leading-5 text-stone-600">
              현재 즉시 승인할 작업은 없습니다. 위험 작업이 생기면 이 영역이 승인 카드로 바뀝니다.
            </p>
          </div>
        )}

        <div className="rounded-md border border-line bg-white p-4 shadow-sm">
          <p className="mb-2 text-xs font-semibold uppercase tracking-normal text-moss">Output preview</p>
          <p className="text-sm leading-6 text-stone-700">{activeRun.outputPreview}</p>
        </div>
        <div className="mt-3 rounded-md border border-line bg-panel p-3 text-xs leading-5 text-stone-600">
          {actionNotice}
        </div>
      </div>

      <div className="border-t border-line p-5">
        <button
          onClick={runNextStep}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-ink px-4 py-3 text-sm font-semibold text-white"
        >
          <Play className="h-4 w-4" />
          다음 단계 실행
        </button>
      </div>
    </aside>
  );
}
