import {
  Bot,
  CheckCircle2,
  Code2,
  FolderPlus,
  Loader2,
  Play,
  Settings2,
  ShieldCheck,
  TerminalSquare,
  UserRound,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useQarkoStore } from "../../store/useQarkoStore";
import type { AutomationMode, LogEntry } from "../../types/qarko";
import { StatusBadge } from "../ui/StatusBadge";

const starterPrompts = [
  "이 프로젝트 구조를 보고 MVP로 만들 첫 기능을 추천하고 바로 작업 계획을 세워줘.",
  "현재 앱에서 사용자가 막힐 수 있는 UX를 찾아서 수정 우선순위를 정리해줘.",
  "이 아이디어를 실제 배포 가능한 작은 제품으로 만들기 위한 파일/기능 목록을 작성해줘.",
];

const modeLabels: Record<AutomationMode, string> = {
  manual: "보기/초안",
  assisted: "샌드박스",
  automation: "자동 실행",
  custom: "개발자",
};

const ChatBubble = ({ log }: { log: LogEntry }) => {
  const isUser = log.roleName === "User";
  const isHermes = log.roleName === "Hermes";
  const Icon = isUser ? UserRound : isHermes ? Bot : TerminalSquare;

  return (
    <article className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser ? (
        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-line bg-white text-moss">
          <Icon className="h-4 w-4" />
        </div>
      ) : null}
      <div
        className={`max-w-[82%] rounded-md border p-3 shadow-sm ${
          isUser ? "border-ink bg-ink text-white" : "border-line bg-white text-stone-700"
        }`}
      >
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold">
          <span className={isUser ? "text-white" : "text-ink"}>{isUser ? "나" : log.roleName}</span>
          <span className={isUser ? "text-white/65" : "text-moss"}>{log.timestamp}</span>
          <StatusBadge tone={log.status} />
        </div>
        <p className="whitespace-pre-wrap text-sm leading-6">{log.message}</p>
      </div>
      {isUser ? (
        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-ink text-white">
          <Icon className="h-4 w-4" />
        </div>
      ) : null}
    </article>
  );
};

export function WorkspaceDashboard() {
  const {
    activeRun,
    actionNotice,
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
  const canSend = prompt.trim().length > 0 && activeRun.status !== "running";
  const isConnected = hermesStatus === "connected";

  const chatLogs = useMemo(() => {
    if (activeRun.logs.length > 0) return activeRun.logs;
    return [
      {
        id: "empty-assistant",
        timestamp: "now",
        roleName: "QARKO OS",
        message:
          "프로젝트를 만들거나 바로 아래 채팅에 작업을 입력하세요. QARKO OS가 내부에서 Hermes CLI를 실행하고 결과, 로그, 산출물을 오른쪽 패널에 정리합니다.",
        status: "planned" as const,
      },
    ];
  }, [activeRun.logs]);

  const sendPrompt = (value = prompt) => {
    const trimmed = value.trim();
    if (!trimmed || activeRun.status === "running") return;
    void runWorkbenchTask(trimmed, mode);
    setPrompt("");
  };

  const changeMode = (nextMode: AutomationMode) => {
    setMode(nextMode);
    if (selectedProject) setAutomationMode(nextMode);
  };

  return (
    <div className="flex min-h-full flex-col bg-[#f7f7f4]">
      <header className="border-b border-line bg-[#fbfbf8] px-5 py-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-2.5 py-1 text-xs font-semibold text-moss">
                <Code2 className="h-3.5 w-3.5" />
                Hermes Workbench
              </span>
              <StatusBadge tone={isConnected ? "connected" : "not_connected"} label={isConnected ? "Hermes 연결됨" : "Hermes 준비 필요"} />
              <StatusBadge tone={activeRun.status} />
            </div>
            <h1 className="truncate text-xl font-bold text-ink">
              {selectedProject ? selectedProject.name : "새 Hermes 프로젝트"}
            </h1>
            <p className="mt-1 line-clamp-2 max-w-4xl text-sm leading-6 text-stone-600">
              {selectedProject
                ? selectedProject.idea
                : "Codex 앱처럼 프로젝트 안에서 Hermes와 대화하며 코드, 문서, 웹앱, 사업 작업을 진행합니다."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setView("new-project")}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-ink hover:bg-panel"
            >
              <FolderPlus className="h-4 w-4" />새 프로젝트
            </button>
            <button
              onClick={openHermesOnboarding}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-ink px-3 py-2 text-sm font-semibold text-white hover:bg-moss"
            >
              <Settings2 className="h-4 w-4" />
              Hermes 설정
            </button>
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1">
        <section className="flex h-full min-h-0 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto p-5 thin-scrollbar">
            <div className="mx-auto flex max-w-4xl flex-col gap-4">
              <div className="rounded-md border border-line bg-white p-3 text-sm leading-6 text-stone-700 shadow-sm">
                <span className="font-semibold text-ink">상태: </span>
                {actionNotice}
              </div>

              {chatLogs.map((log) => (
                <ChatBubble key={log.id} log={log} />
              ))}

              {activeRun.outputPreview ? (
                <article className="rounded-md border border-line bg-white p-4 shadow-sm">
                  <div className="mb-2 flex items-center gap-2 text-sm font-bold text-ink">
                    <CheckCircle2 className="h-4 w-4 text-signal" />
                    Hermes 결과
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-6 text-stone-700">{activeRun.outputPreview}</p>
                </article>
              ) : null}
            </div>
          </div>

          <div className="border-t border-line bg-[#fbfbf8] p-4">
            <div className="mx-auto max-w-4xl">
              {!selectedProject && projects.length === 0 ? (
                <div className="mb-3 grid gap-2 lg:grid-cols-3">
                  {starterPrompts.map((item) => (
                    <button
                      key={item}
                      onClick={() => sendPrompt(item)}
                      className="rounded-md border border-line bg-white p-3 text-left text-xs leading-5 text-stone-600 hover:bg-panel"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              ) : null}

              <div className="rounded-md border border-line bg-white p-3 shadow-sm">
                <textarea
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) sendPrompt();
                  }}
                  placeholder="Hermes에게 맡길 작업을 입력하세요. 예: 이 프로젝트를 실행 가능한 MVP로 만들고 필요한 파일을 수정해줘."
                  className="min-h-24 w-full resize-y border-0 bg-transparent text-sm leading-6 text-ink outline-none"
                />
                <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                  {(["manual", "assisted", "automation", "custom"] as AutomationMode[]).map((item) => (
                    <button
                      key={item}
                      onClick={() => changeMode(item)}
                      className={`rounded-md border px-2.5 py-1.5 text-xs font-semibold ${
                        mode === item ? "border-signal bg-panel text-ink" : "border-line bg-white text-stone-600 hover:bg-panel"
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
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-moss disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {activeRun.status === "running" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                    Hermes 실행
                  </button>
                </div>
                <div className="mt-2 flex items-start gap-2 border-t border-line pt-3 text-xs leading-5 text-stone-600">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-signal" />
                  <span>
                    안전 승인 모드: 기본 작업은 프로젝트 범위에서 실행하고, 위험한 파일 삭제/외부 전송/운영 변경은 오른쪽 실행 패널에서 확인합니다.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
