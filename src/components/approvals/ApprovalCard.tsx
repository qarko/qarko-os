import { Check, RotateCcw, X } from "lucide-react";
import { useQarkoStore } from "../../store/useQarkoStore";
import type { Approval } from "../../types/qarko";
import { StatusBadge } from "../ui/StatusBadge";

interface ApprovalCardProps {
  approval: Approval;
}

export function ApprovalCard({ approval }: ApprovalCardProps) {
  const resolveApproval = useQarkoStore((state) => state.resolveApproval);
  const isPending = approval.status === "pending";

  return (
    <article className="rounded-md border border-line bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-ink">{approval.action}</h3>
          <p className="mt-1 text-xs leading-5 text-stone-600">{approval.whatWillHappen}</p>
        </div>
        <StatusBadge tone={approval.risk} label={`위험 ${approval.risk}`} />
      </div>
      <div className="rounded-md bg-panel p-3 text-xs leading-5 text-stone-700">
        <span className="font-semibold text-ink">예상 결과: </span>
        {approval.expectedResult}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button disabled={!isPending} onClick={() => resolveApproval(approval.id, "approved")} className="inline-flex items-center gap-1 rounded-md bg-signal px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">
          <Check className="h-3.5 w-3.5" />
          승인
        </button>
        <button disabled={!isPending} onClick={() => resolveApproval(approval.id, "revise")} className="inline-flex items-center gap-1 rounded-md border border-line bg-white px-3 py-2 text-xs font-semibold text-ink disabled:opacity-40">
          <RotateCcw className="h-3.5 w-3.5" />
          수정
        </button>
        <button disabled={!isPending} onClick={() => resolveApproval(approval.id, "cancelled")} className="inline-flex items-center gap-1 rounded-md border border-line bg-white px-3 py-2 text-xs font-semibold text-danger disabled:opacity-40">
          <X className="h-3.5 w-3.5" />
          취소
        </button>
      </div>
    </article>
  );
}
