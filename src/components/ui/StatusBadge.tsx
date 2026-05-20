import type { RiskLevel, Status } from "../../types/qarko";

type Tone = Status | RiskLevel | "mock" | "connected" | "not_connected";

const toneClass: Record<Tone, string> = {
  idle: "bg-stone-100 text-stone-700 border-stone-200",
  planned: "bg-sky-50 text-skyline border-sky-200",
  running: "bg-emerald-50 text-signal border-emerald-200",
  blocked: "bg-orange-50 text-caution border-orange-200",
  needs_approval: "bg-amber-50 text-caution border-amber-200",
  completed: "bg-green-50 text-green-700 border-green-200",
  failed: "bg-red-50 text-danger border-red-200",
  low: "bg-green-50 text-green-700 border-green-200",
  medium: "bg-amber-50 text-caution border-amber-200",
  high: "bg-orange-50 text-caution border-orange-200",
  critical: "bg-red-50 text-danger border-red-200",
  mock: "bg-violet-50 text-violet-700 border-violet-200",
  connected: "bg-emerald-50 text-signal border-emerald-200",
  not_connected: "bg-stone-100 text-stone-700 border-stone-200",
};

const labelMap: Record<Tone, string> = {
  idle: "대기",
  planned: "예정",
  running: "진행 중",
  blocked: "막힘",
  needs_approval: "승인 필요",
  completed: "완료",
  failed: "실패",
  low: "낮음",
  medium: "중간",
  high: "높음",
  critical: "치명적",
  mock: "미리보기",
  connected: "연결됨",
  not_connected: "미연결",
};

interface StatusBadgeProps {
  tone: Tone;
  label?: string;
}

export function StatusBadge({ tone, label }: StatusBadgeProps) {
  return (
    <span className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium ${toneClass[tone]}`}>
      {label ?? labelMap[tone]}
    </span>
  );
}
