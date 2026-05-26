import { Clipboard, CloudDownload, CloudUpload, Info, MessageSquareText, RotateCcw, UsersRound } from "lucide-react";
import { useRef, useState } from "react";
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

const betaTesterPost = `QARKO OS 베타 테스터 3~5명을 찾고 있습니다.

QARKO OS는 Hermes Agent와 CLI를 비개발자도 Windows 앱에서 쉽게 설치, 설정, 실행할 수 있게 만드는 작업 앱입니다.

테스트 요청:
1. Windows 설치 파일로 설치
2. 첫 실행 Hermes 설정 마법사 진행
3. 실제로 해보고 싶은 작업을 입력한 뒤 막히는 지점이나 UX 피드백 작성

개발 지식이 없어도 괜찮습니다. 초보자 관점의 막힘이 가장 중요합니다.`;

export function FeedbackPanel() {
  const {
    addFeedback,
    buildFeedbackReport,
    clearFeedback,
    feedback,
    loadFeedbackFromCloud,
    sendFeedbackToCloud,
    syncStatus,
  } = useQarkoStore();
  const [area, setArea] = useState<FeedbackEntry["area"]>("install");
  const [ease, setEase] = useState<FeedbackEntry["ease"]>("confusing");
  const [testerName, setTesterName] = useState("");
  const [testerContact, setTesterContact] = useState("");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [copiedRecruiting, setCopiedRecruiting] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [consentToSend, setConsentToSend] = useState(false);
  const savedListRef = useRef<HTMLDivElement>(null);
  const isSyncing = syncStatus === "syncing";

  const submitFeedback = () => {
    const trimmed = message.trim();
    if (!trimmed) return;
    addFeedback({
      area,
      ease,
      message: trimmed,
      testerName: testerName.trim() || undefined,
      testerContact: testerContact.trim() || undefined,
      appVersion: "0.1.0",
    });
    setMessage("");
    setCopied(false);
    setJustSaved(true);
    window.requestAnimationFrame(() => {
      savedListRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const copyReport = async () => {
    const report = buildFeedbackReport();
    await navigator.clipboard.writeText(report);
    setCopied(true);
  };

  const copyRecruitingPost = async () => {
    await navigator.clipboard.writeText(betaTesterPost);
    setCopiedRecruiting(true);
  };

  return (
    <div className="mx-auto max-w-5xl p-5 lg:p-8">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-normal text-moss">Feedback</p>
        <h1 className="mt-1 text-3xl font-bold text-ink">테스터 피드백</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
          설치와 첫 실행에서 막힌 지점을 기록합니다. 피드백은 먼저 이 PC에 저장되고, 보내기 버튼을 누르면 서버와 Discord로 전달됩니다.
        </p>
      </div>

      <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_220px]">
        <div className="rounded-md border border-line bg-white p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-4 w-4 text-signal" />
            <div>
              <p className="text-sm font-semibold text-ink">개인정보 안내</p>
              <p className="mt-1 text-sm leading-6 text-stone-600">
                이름과 연락처는 선택 입력입니다. 피드백을 보내면 서버와 운영자의 Discord 채널로 전달됩니다.
                API 키, 비밀번호, 고객 개인정보는 적지 마세요. 서버는 키와 토큰처럼 보이는 값은 Discord 전송 전 마스킹합니다.
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-md border border-line bg-panel p-4">
          <p className="text-xs font-semibold uppercase tracking-normal text-moss">Saved feedback</p>
          <p className="mt-2 text-3xl font-bold text-ink">{feedback.length}개</p>
          <p className="mt-1 text-xs leading-5 text-stone-600">저장된 피드백을 아래에서 확인합니다.</p>
        </div>
      </div>

      <section className="mb-5 rounded-md border border-line bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <SectionHeader title="무료 베타 테스터 모집" eyebrow="Beta ops" />
            <p className="max-w-2xl text-sm leading-6 text-stone-600">
              Threads나 지인에게 바로 보낼 수 있는 짧은 모집 문구입니다. 3~5명에게 설치, 첫 실행, Hermes 설정, 피드백 보내기만 부탁하면 됩니다.
            </p>
          </div>
          <button onClick={copyRecruitingPost} className="inline-flex items-center justify-center gap-2 rounded-md border border-line bg-white px-4 py-3 text-sm font-semibold text-ink hover:bg-panel">
            <UsersRound className="h-4 w-4" />
            {copiedRecruiting ? "복사됨" : "모집 문구 복사"}
          </button>
        </div>
      </section>

      <section className="rounded-md border border-line bg-white p-5 shadow-sm">
        <SectionHeader title="새 피드백 기록" eyebrow="Capture" />
        <div className="grid gap-3 lg:grid-cols-[180px_220px_1fr]">
          <label className="grid gap-2 text-sm font-semibold text-ink">
            위치
            <select value={area} onChange={(event) => setArea(event.target.value as FeedbackEntry["area"])} className="rounded-md border border-line bg-white px-3 py-3 text-sm text-ink outline-none focus:border-signal">
              {areaOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold text-ink">
            체감
            <select value={ease} onChange={(event) => setEase(event.target.value as FeedbackEntry["ease"])} className="rounded-md border border-line bg-white px-3 py-3 text-sm text-ink outline-none focus:border-signal">
              {easeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold text-ink">
            이름
            <input value={testerName} onChange={(event) => setTesterName(event.target.value)} placeholder="선택 입력" className="rounded-md border border-line bg-white px-3 py-3 text-sm text-ink outline-none focus:border-signal" />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-ink">
            연락처
            <input value={testerContact} onChange={(event) => setTesterContact(event.target.value)} placeholder="Threads, 카톡, 이메일 등 선택 입력" className="rounded-md border border-line bg-white px-3 py-3 text-sm text-ink outline-none focus:border-signal" />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-ink lg:col-span-2">
            메모
            <textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="어디서 막혔는지, 어떤 문구가 헷갈렸는지 적어주세요." className="min-h-24 rounded-md border border-line bg-white px-3 py-3 text-sm text-ink outline-none focus:border-signal lg:min-h-28" />
          </label>
        </div>
        <label className="mt-4 flex items-start gap-2 rounded-md bg-panel p-3 text-sm leading-6 text-stone-700">
          <input
            type="checkbox"
            checked={consentToSend}
            onChange={(event) => setConsentToSend(event.target.checked)}
            className="mt-1 h-4 w-4"
          />
          <span>작성한 피드백이 QARKO OS 서버와 운영자 Discord 채널로 전달되는 것에 동의합니다. 이름과 연락처는 선택 입력입니다.</span>
        </label>
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={submitFeedback} disabled={!message.trim()} className="inline-flex items-center gap-2 rounded-md bg-ink px-4 py-3 text-sm font-semibold text-white hover:bg-moss disabled:cursor-not-allowed disabled:opacity-50">
            <MessageSquareText className="h-4 w-4" />
            피드백 저장
          </button>
          <button onClick={sendFeedbackToCloud} disabled={isSyncing || feedback.length === 0 || !consentToSend} className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-4 py-3 text-sm font-semibold text-ink hover:bg-panel disabled:cursor-not-allowed disabled:opacity-50">
            <CloudUpload className="h-4 w-4" />
            작성한 피드백 보내기
          </button>
          <button onClick={loadFeedbackFromCloud} disabled={isSyncing} className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-4 py-3 text-sm font-semibold text-ink hover:bg-panel disabled:cursor-not-allowed disabled:opacity-50">
            <CloudDownload className="h-4 w-4" />
            서버 피드백 불러오기
          </button>
          <button onClick={copyReport} className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-4 py-3 text-sm font-semibold text-ink hover:bg-panel">
            <Clipboard className="h-4 w-4" />
            {copied ? "복사됨" : "전체 복사"}
          </button>
          <button onClick={clearFeedback} className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-4 py-3 text-sm font-semibold text-ink hover:bg-panel">
            <RotateCcw className="h-4 w-4" />
            비우기
          </button>
        </div>
        {!consentToSend && feedback.length > 0 ? (
          <p className="mt-2 text-xs leading-5 text-stone-500">피드백을 보내려면 먼저 위 동의 항목을 체크하세요.</p>
        ) : null}
        {justSaved ? (
          <p className="mt-3 rounded-md bg-panel p-3 text-sm leading-6 text-stone-700">
            저장됐습니다. 운영자에게 보내려면 <span className="font-semibold text-ink">작성한 피드백 보내기</span>를 눌러주세요.
          </p>
        ) : null}
      </section>

      <section ref={savedListRef} className="mt-5 rounded-md border border-line bg-white p-5 shadow-sm">
        <SectionHeader title="저장된 피드백" eyebrow={`${feedback.length} items`} />
        <div className="space-y-3">
          {feedback.length === 0 ? (
            <div className="rounded-md border border-dashed border-line bg-panel p-5 text-sm leading-6 text-stone-600">
              아직 저장된 피드백이 없습니다.
            </div>
          ) : (
            feedback.map((item) => {
              const areaLabel = areaOptions.find((option) => option.value === item.area)?.label ?? item.area;
              const easeItem = easeOptions.find((option) => option.value === item.ease);
              return (
                <article key={item.id} className="rounded-md border border-line bg-white p-4 shadow-sm">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-ink">{areaLabel}</span>
                    <StatusBadge tone={easeItem?.tone ?? "planned"} label={easeItem?.label ?? item.ease} />
                    <span className="text-xs text-moss">{item.createdAt}</span>
                    {item.testerName ? <span className="text-xs text-stone-500">테스터: {item.testerName}</span> : null}
                  </div>
                  {item.testerContact ? <p className="mb-2 text-xs text-stone-500">연락처: {item.testerContact}</p> : null}
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
