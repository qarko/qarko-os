import { Clipboard, MessageSquareText, RotateCcw } from "lucide-react";
import { useState } from "react";
import { useQarkoStore } from "../../store/useQarkoStore";
import type { FeedbackEntry } from "../../types/qarko";
import { SectionHeader } from "../ui/SectionHeader";
import { StatusBadge } from "../ui/StatusBadge";

const areaOptions: Array<{ value: FeedbackEntry["area"]; label: string }> = [
  { value: "install", label: "설치" },
  { value: "hermes", label: "Hermes 설정" },
  { value: "project", label: "프로젝트 생성" },
  { value: "approval", label: "승인/실행" },
  { value: "sync", label: "동기화" },
  { value: "other", label: "기타" },
];

const easeOptions: Array<{ value: FeedbackEntry["ease"]; label: string; tone: "completed" | "needs_approval" | "failed" }> = [
  { value: "easy", label: "쉬웠음", tone: "completed" },
  { value: "confusing", label: "헷갈림", tone: "needs_approval" },
  { value: "blocked", label: "막힘", tone: "failed" },
];

export function FeedbackPanel() {
  const { addFeedback, buildFeedbackReport, clearFeedback, feedback } = useQarkoStore();
  const [area, setArea] = useState<FeedbackEntry["area"]>("install");
  const [ease, setEase] = useState<FeedbackEntry["ease"]>("confusing");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);

  const submitFeedback = () => {
    const trimmed = message.trim();
    if (!trimmed) return;
    addFeedback({ area, ease, message: trimmed });
    setMessage("");
    setCopied(false);
  };

  const copyReport = async () => {
    const report = buildFeedbackReport();
    await navigator.clipboard.writeText(report);
    setCopied(true);
  };

  return (
    <div className="mx-auto max-w-5xl p-5 lg:p-8">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-normal text-moss">Feedback</p>
        <h1 className="mt-1 text-3xl font-bold text-ink">테스트 피드백</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
          지인이 설치하고 사용하면서 막힌 지점을 바로 적어둘 수 있습니다. 저장된 내용은 복사해서 전달받으면 됩니다.
        </p>
      </div>

      <section className="rounded-md border border-line bg-white p-5 shadow-sm">
        <SectionHeader title="새 피드백 기록" eyebrow="Capture" />
        <div className="grid gap-3 lg:grid-cols-[180px_220px_1fr]">
          <label className="grid gap-2 text-sm font-semibold text-ink">
            위치
            <select
              value={area}
              onChange={(event) => setArea(event.target.value as FeedbackEntry["area"])}
              className="rounded-md border border-line bg-white px-3 py-3 text-sm text-ink outline-none focus:border-signal"
            >
              {areaOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold text-ink">
            느낌
            <select
              value={ease}
              onChange={(event) => setEase(event.target.value as FeedbackEntry["ease"])}
              className="rounded-md border border-line bg-white px-3 py-3 text-sm text-ink outline-none focus:border-signal"
            >
              {easeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold text-ink">
            메모
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="어디서 막혔는지, 어떤 문구가 헷갈렸는지 적어주세요."
              className="min-h-24 rounded-md border border-line bg-white px-3 py-3 text-sm text-ink outline-none focus:border-signal"
            />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={submitFeedback}
            className="inline-flex items-center gap-2 rounded-md bg-ink px-4 py-3 text-sm font-semibold text-white hover:bg-moss"
          >
            <MessageSquareText className="h-4 w-4" />
            피드백 저장
          </button>
          <button
            onClick={copyReport}
            className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-4 py-3 text-sm font-semibold text-ink hover:bg-panel"
          >
            <Clipboard className="h-4 w-4" />
            {copied ? "복사됨" : "리포트 복사"}
          </button>
          <button
            onClick={clearFeedback}
            className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-4 py-3 text-sm font-semibold text-ink hover:bg-panel"
          >
            <RotateCcw className="h-4 w-4" />
            비우기
          </button>
        </div>
      </section>

      <section className="mt-5 rounded-md border border-line bg-white p-5 shadow-sm">
        <SectionHeader title="저장된 피드백" eyebrow={`${feedback.length} items`} />
        <div className="space-y-3">
          {feedback.length === 0 ? (
            <div className="rounded-md border border-dashed border-line bg-panel p-5 text-sm leading-6 text-stone-600">
              아직 저장된 피드백이 없습니다.
            </div>
          ) : (
            feedback.map((item) => {
              const areaLabel = areaOptions.find((option) => option.value === item.area)?.label ?? item.area;
              const ease = easeOptions.find((option) => option.value === item.ease);
              return (
                <article key={item.id} className="rounded-md border border-line bg-white p-4 shadow-sm">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-ink">{areaLabel}</span>
                    <StatusBadge tone={ease?.tone ?? "planned"} label={ease?.label ?? item.ease} />
                    <span className="text-xs text-moss">{item.createdAt}</span>
                  </div>
                  <p className="text-sm leading-6 text-stone-700">{item.message}</p>
                </article>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
