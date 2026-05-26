import { Code2, FolderPlus, Loader2, Play, Settings2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useQarkoStore } from "../../store/useQarkoStore";
import type { AutomationMode, TerminalLine } from "../../types/qarko";
import { StatusBadge } from "../ui/StatusBadge";

// 한 세션 안에서 Hermes와 계속 대화하되, 중앙 화면은 currentSessionLogs 카드 대신 Hermes CLI 터미널만 보여준다.
const modeLabels: Record<AutomationMode, string> = {
  manual: "보기/초안",
  assisted: "샌드박스",
  automation: "자동 실행",
  custom: "개발자",
};

const TerminalTranscript = ({ lines }: { lines: TerminalLine[] }) => (
  <div className="flex h-full min-h-0 flex-col rounded-md border border-[#30343d] bg-[#0f1115] p-3 font-mono text-xs leading-5 text-[#d7dde8] shadow-sm">
    <div className="mb-3 flex items-center justify-between gap-3 border-b border-[#272b33] pb-2">
      <span className="font-semibold text-[#f1f5f9]">Hermes CLI</span>
      <span className="text-[#8b95a7]">마지막 출력 {lines.length > 0 ? lines[lines.length - 1].timestamp : "대기 중"}</span>
    </div>
    <div className="min-h-0 flex-1 space-y-1 overflow-y-auto thin-scrollbar">
      {lines.length > 0 ? (
        lines.map((line) => (
          <div key={line.id} className="grid grid-cols-[72px_64px_1fr] gap-2">
            <span className="text-[#6f7a8d]">{line.timestamp}</span>
            <span className={line.stream === "stderr" ? "text-[#f08a8a]" : line.stream === "user" ? "text-[#9ccfd8]" : "text-[#a6e3a1]"}>
              {line.stream}
            </span>
            <span className="min-w-0 whitespace-pre-wrap break-words">{line.text}</span>
          </div>
        ))
      ) : (
        <p className="text-[#8b95a7]">Hermes CLI 출력이 이곳에 표시됩니다.</p>
      )}
    </div>
  </div>
);

export function WorkspaceDashboard() {
  const {
    activeRun,
    hermesConnection,
    hermesStatus,
    openHermesOnboarding,
    projects,
    runWorkbenchTask,
    selectedProjectId,
    setAutomationMode,
    setView,
  } = useQarkoStore();
  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState<AutomationMode>("assisted");

  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? projects[0];
  const selectedMode = selectedProject?.automationMode ?? mode;
  const canSend = prompt.trim().length > 0 && activeRun.status !== "running";
  const isConnected = hermesStatus === "connected";

  const sendPrompt = (value = prompt) => {
    const trimmed = value.trim();
    if (!trimmed || activeRun.status === "running") return;
    void runWorkbenchTask(trimmed, selectedMode);
    setPrompt("");
  };

  const changeMode = (nextMode: AutomationMode) => {
    setMode(nextMode);
    if (selectedProject) setAutomationMode(nextMode);
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#0f1115]">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-line bg-[#0f1115] px-4 py-3">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-moss">
              <Code2 className="h-3.5 w-3.5" />
              Hermes Workbench
            </span>
            <StatusBadge tone={isConnected ? "connected" : "not_connected"} label={isConnected ? "Hermes 연결됨" : "Hermes 준비 필요"} />
            <StatusBadge tone={activeRun.status} />
          </div>
          <h1 className="truncate text-base font-bold text-ink">{selectedProject ? selectedProject.name : "새 프로젝트"}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => setView("new-project")}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-semibold text-ink hover:bg-panel"
          >
            <FolderPlus className="h-4 w-4" />새 프로젝트
          </button>
          <button
            onClick={openHermesOnboarding}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-panel px-3 text-sm font-semibold text-ink hover:bg-white"
          >
            <Settings2 className="h-4 w-4" />
            Hermes 설정
          </button>
        </div>
      </header>

      <section className="chat-viewport min-h-0 flex-1 overflow-hidden bg-[#101216] px-4 py-5">
        <div className="mx-auto flex h-full max-w-5xl flex-col">
          <TerminalTranscript lines={activeRun.terminalLines} />
        </div>
      </section>

      <footer className="shrink-0 border-t border-line bg-[#0f1115] px-4 py-3">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-md border border-line bg-white p-3 shadow-sm">
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) sendPrompt();
              }}
              placeholder="Hermes에게 맡길 작업을 입력하세요. 예: 현재 폴더를 분석하고 다음 실행 단계를 제안해줘."
              className="min-h-20 w-full resize-none border-0 bg-transparent text-sm leading-6 text-ink outline-none"
            />
            <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-line pt-3">
              {(["manual", "assisted", "automation", "custom"] as AutomationMode[]).map((item) => (
                <button
                  key={item}
                  onClick={() => changeMode(item)}
                  className={`rounded-md border px-2.5 py-1.5 text-xs font-semibold ${
                    selectedMode === item ? "border-signal bg-panel text-ink" : "border-line bg-white text-stone-600 hover:bg-panel"
                  }`}
                >
                  {modeLabels[item]}
                </button>
              ))}
              <span className="ml-auto rounded-md border border-line bg-panel px-2.5 py-1.5 text-xs font-semibold text-stone-600">
                {hermesConnection.modelName || "모델 미설정"}
              </span>
              <button
                onClick={() => sendPrompt()}
                disabled={!canSend}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-panel px-4 py-2 text-sm font-semibold text-ink hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {activeRun.status === "running" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                Hermes 실행
              </button>
            </div>
            <div className="mt-2 flex items-start gap-2 border-t border-line pt-3 text-xs leading-5 text-stone-600">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-signal" />
              <span>안전 승인 모드: 위험한 파일 삭제, 외부 전송, 운영 변경은 오른쪽 실행 패널에서 확인합니다.</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
