import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  checkHermesAuthStatus,
  configureHermesToolPreset,
  configureHermesGuidedSetup,
  getHermesHealthReport,
  getHermesDesktopStatus,
  hasTauriRuntime,
  openHermesLoginTerminal,
  loginHermesProvider,
  openHermesSetupTerminal,
  runHermesBusinessStep,
  startHermesInstall,
  updateHermesToVerifiedVersion,
} from "../adapters/hermesDesktop";
import { testHermesConnection } from "../adapters/hermesRuntime";
import {
  getDefaultSyncEndpoint,
  isTrustedSyncEndpoint,
  loadFeedbackEntries,
  loadWorkspaceSnapshot,
  saveWorkspaceSnapshot,
  sendFeedbackEntries,
} from "../adapters/workspaceSync";
import { redactSensitiveText } from "../utils/redaction";
import {
  activeRun,
  approvals as initialApprovals,
  artifacts,
  automationPolicies,
  defaultRules,
  plugins as initialPlugins,
  projects as initialProjects,
  workspace,
} from "../data/mockData";
import { getHermesProviderOption } from "../data/hermesProviders";
import type {
  AppView,
  Approval,
  ApprovalDecision,
  Artifact,
  AutomationMode,
  FeedbackEntry,
  HermesConnection,
  HermesHealthSnapshot,
  HermesInstallStatus,
  HermesStatus,
  HermesToolPreset,
  LogEntry,
  NewFeedbackInput,
  NewProjectInput,
  NewReviewNoteInput,
  Plugin,
  Project,
  ReviewNote,
  Run,
  SyncStatus,
  WorkspaceSnapshot,
} from "../types/qarko";

interface QarkoState {
  workspace: typeof workspace;
  projects: Project[];
  selectedProjectId: string;
  view: AppView;
  approvals: Approval[];
  artifacts: Artifact[];
  plugins: Plugin[];
  feedback: FeedbackEntry[];
  reviewNotes: ReviewNote[];
  activeRun: Run;
  projectRuns: Record<string, Run>;
  projectPendingPrompts: Record<string, string>;
  pendingPrompt: string;
  actionNotice: string;
  automationPolicies: typeof automationPolicies;
  syncEndpoint: string;
  syncAccessToken: string;
  syncStatus: SyncStatus;
  syncError?: string;
  hermesConnection: HermesConnection;
  hermesStatus: HermesStatus;
  hermesMessage: string;
  hermesAvailableModels: string[];
  hermesHealth: HermesHealthSnapshot;
  hermesToolPreset: HermesToolPreset;
  hermesInstallStatus: HermesInstallStatus;
  hermesExecutablePath?: string;
  hermesInstallMessage: string;
  hermesSetupProvider: string;
  hermesSetupOutput: string;
  hermesAuthStatus: "idle" | "running" | "completed" | "error";
  hermesAuthMessage: string;
  hermesUpdateStatus: "idle" | "updating" | "completed" | "error";
  hermesUpdateMessage: string;
  showHermesOnboarding: boolean;
  selectProject: (projectId: string) => void;
  setView: (view: AppView) => void;
  createProject: (input: NewProjectInput) => void;
  setAutomationMode: (mode: AutomationMode) => void;
  resolveApproval: (approvalId: string, decision: ApprovalDecision) => void;
  togglePlugin: (pluginId: string) => void;
  runWorkbenchTask: (idea: string, mode: AutomationMode) => Promise<void>;
  runNextStep: () => Promise<void>;
  resetWorkspace: () => void;
  setSyncEndpoint: (endpoint: string) => void;
  setSyncAccessToken: (token: string) => void;
  saveToCloud: () => Promise<void>;
  loadFromCloud: () => Promise<void>;
  updateHermesConnection: (connection: Partial<HermesConnection>) => void;
  testHermesRuntime: () => Promise<void>;
  refreshHermesHealth: () => Promise<void>;
  saveHermesToolPreset: (mode: HermesToolPreset) => Promise<void>;
  checkHermesInstall: () => Promise<void>;
  installHermesDesktop: () => Promise<void>;
  updateHermesVerified: () => Promise<void>;
  updateHermesSetupProvider: (provider: string) => void;
  saveHermesGuidedSetup: () => Promise<void>;
  loginHermesOAuthProvider: () => Promise<void>;
  openHermesSetupWizard: (section?: string) => Promise<void>;
  openHermesLoginFallback: () => Promise<void>;
  openHermesOnboarding: () => void;
  dismissHermesOnboarding: () => void;
  addFeedback: (input: NewFeedbackInput) => void;
  clearFeedback: () => void;
  buildFeedbackReport: () => string;
  addReviewNote: (input: NewReviewNoteInput) => void;
  updateReviewNoteStatus: (noteId: string, status: ReviewNote["status"]) => void;
  sendFeedbackToCloud: () => Promise<void>;
  loadFeedbackFromCloud: () => Promise<void>;
}

const feedbackAreaLabel: Record<FeedbackEntry["area"], string> = {
  install: "설치",
  hermes: "Hermes 설정",
  project: "프로젝트 생성",
  approval: "승인/실행",
  sync: "동기화",
  other: "기타",
};

const feedbackEaseLabel: Record<FeedbackEntry["ease"], string> = {
  easy: "쉬웠음",
  confusing: "헷갈림",
  blocked: "막힘",
};

const makeProjectName = (idea: string) => {
  const normalized = idea.replace(/\s+/g, " ").trim();
  if (!normalized) return "새 Hermes 프로젝트";

  const lowerIdea = normalized.toLowerCase();
  if (lowerIdea.includes("newsletter") || lowerIdea.includes("뉴스레터")) return "Newsletter Growth System";
  if (lowerIdea.includes("instagram") || lowerIdea.includes("threads") || lowerIdea.includes("인스타")) return "Social Growth Sprint";
  if (lowerIdea.includes("saas") || lowerIdea.includes("서비스")) return "Digital Product";
  if (lowerIdea.includes("agency") || lowerIdea.includes("대행")) return "Service Workflow";

  return normalized.length > 28 ? `${normalized.slice(0, 28)}...` : normalized;
};

const makeProjectBlueprint = (idea: string) => {
  const lowerIdea = idea.toLowerCase();
  if (lowerIdea.includes("threads") || lowerIdea.includes("instagram") || lowerIdea.includes("인스타")) {
    return {
      goalTitle: "첫 베타 테스터 모집 흐름 만들기",
      metric: "게시글 3개, DM 응답 문구 2개, 피드백 요청 1개",
      workflowTitle: "Audience to Feedback Loop",
      stages: ["대상 정의", "메시지 초안", "게시 승인", "피드백 수집"],
      tasks: [
        ["테스터 조건 정리", "누구에게 부탁할지 한 문장으로 정리", "chief", false],
        ["Threads 게시글 초안", "초보자도 이해할 수 있는 모집 문구 작성", "marketer", false],
        ["외부 게시 전 승인", "과장 표현과 개인정보 안내를 확인", "reviewer", true],
      ] as const,
      risks: ["기술 설명이 길어지면 반응이 낮아질 수 있음", "피드백 요청 범위가 모호하면 답변 품질이 떨어질 수 있음"],
      nextAction: "테스터에게 부탁할 행동을 설치, 첫 실행, 피드백 전송 3단계로 줄이세요.",
    };
  }

  return {
    goalTitle: "Hermes로 실행 가능한 작업 흐름 만들기",
    metric: "목표, 현재 상태, 첫 작업, 승인 기준 확정",
    workflowTitle: "Hermes Work Session",
    stages: ["목표 정리", "컨텍스트 확인", "실행 계획", "승인 기준"],
    tasks: [
      ["작업 목표와 현재 상태 정리", "사용자 요청을 목표, 입력 자료, 원하는 결과 기준으로 정리", "chief", false],
      ["필요한 컨텍스트 확인", "폴더, 파일, 참고자료, 제약 조건 확인", "researcher", false],
      ["자동화 승인 범위 점검", "AI가 자동 진행할 일과 승인받을 일을 분리", "reviewer", true],
    ] as const,
    risks: ["초기 범위가 넓을 수 있음", "자동화 신뢰는 사용자가 직접 확인해야 함"],
    nextAction: "자동화 모드를 확인하고 첫 작업을 입력하세요.",
  };
};

const buildProjectFromIdea = (input: NewProjectInput, index: number): Project => {
  const trimmedIdea = redactSensitiveText(input.idea.trim());
  const blueprint = makeProjectBlueprint(trimmedIdea);
  const stageOwners = ["chief", "researcher", "marketer", "reviewer"];

  return {
    id: `project-custom-${Date.now()}`,
    name: makeProjectName(trimmedIdea),
    idea: trimmedIdea || "Hermes로 처리할 작업을 프로젝트로 만들기",
    status: "planned",
    automationMode: input.mode,
    goal: {
      id: `goal-custom-${index}`,
      title: blueprint.goalTitle,
      metric: blueprint.metric,
      status: "planned",
    },
    workflow: {
      id: `workflow-custom-${index}`,
      title: blueprint.workflowTitle,
      description: "아이디어를 목표, 역할, 작업, 승인 범위로 구조화합니다.",
      stages: blueprint.stages.map((stage, stageIndex) => ({
        id: `stage-custom-${index}-${stageIndex + 1}`,
        title: stage,
        status: stageIndex === 0 ? "running" : "planned",
        ownerRoleId: stageOwners[stageIndex] ?? "chief",
      })),
    },
    tasks: blueprint.tasks.map(([title, description, roleId, approvalRequired], taskIndex) => ({
      id: `task-custom-${index}-${taskIndex + 1}`,
      title,
      description,
      status: approvalRequired ? "needs_approval" : taskIndex === 0 ? "running" : "planned",
      roleId,
      approvalRequired,
    })),
    roles: [
      { id: "chief", name: "Chief of Staff", mission: "목표를 우선순위와 실행 단계로 정리", status: "planned", currentFocus: "첫 운영 계획 준비" },
      { id: "researcher", name: "Researcher", mission: "시장과 참고자료 조사", status: "planned", currentFocus: "리서치 범위 대기" },
      { id: "reviewer", name: "QA / Reviewer", mission: "품질, 리스크, 승인 여부 점검", status: "needs_approval", currentFocus: "승인 정책 확인 필요" },
    ],
    risks: blueprint.risks,
    nextAction: blueprint.nextAction,
  };
};

const makeWorkspaceSnapshot = (state: QarkoState): WorkspaceSnapshot => ({
  workspace: state.workspace,
  projects: state.projects.map(sanitizeProjectForStorage),
  selectedProjectId: state.selectedProjectId,
  view: state.view,
  approvals: state.approvals.map(sanitizeApprovalForStorage),
  artifacts: state.artifacts.map(sanitizeArtifactForCloud),
  plugins: state.plugins,
  feedback: state.feedback.map(sanitizeFeedbackForStorage),
  reviewNotes: state.reviewNotes.map(sanitizeReviewNoteForStorage),
  activeRun: sanitizeRunForStorage(state.activeRun),
  projectRuns: projectRunsWithActiveRun(state.projectRuns, state.activeRun),
  actionNotice: redactSensitiveText(state.actionNotice),
});

const applyWorkspaceSnapshot = (snapshot: WorkspaceSnapshot) => ({
  workspace: snapshot.workspace,
  projects: snapshot.projects.map(sanitizeProjectForStorage),
  selectedProjectId: snapshot.selectedProjectId,
  view: snapshot.view,
  approvals: clearPendingApprovalsAfterCloudLoad(snapshot.approvals),
  artifacts: snapshot.artifacts.map(sanitizeArtifactForCloud),
  plugins: snapshot.plugins,
  feedback: (snapshot.feedback ?? []).map(sanitizeFeedbackForStorage),
  reviewNotes: (snapshot.reviewNotes ?? []).map(sanitizeReviewNoteForStorage),
  activeRun: sanitizeRunForStorage(snapshot.activeRun),
  projectRuns: projectRunsWithActiveRun(snapshot.projectRuns ?? {}, snapshot.activeRun),
  projectPendingPrompts: {},
  pendingPrompt: "",
  actionNotice: redactSensitiveText(snapshot.actionNotice),
});

const mergeFeedbackEntries = (local: FeedbackEntry[], remote: FeedbackEntry[]) => {
  const seen = new Set<string>();
  return [...remote, ...local].filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
};

const emptyRun: Run = {
  id: "run-empty",
  projectId: "",
  title: "Hermes 실행 대기",
  activeRoleName: "QARKO OS",
  modelName: "Hermes 연결 필요",
  status: "planned",
  logs: [],
  outputPreview: "프로젝트를 만들고 Hermes를 연결하면 여기에서 실제 작업 결과를 확인할 수 있습니다.",
  stepCount: 0,
  sessionTranscript: "",
};

const buildRunForProject = (project: Project): Run => ({
  id: `run-${project.id}`,
  projectId: project.id,
  title: `${project.name} Hermes 세션`,
  activeRoleName: "Hermes",
  modelName: "Hermes 연결 필요",
  status: "planned",
  logs: [
    {
      id: `log-${project.id}-start`,
      timestamp: "now",
      roleName: "QARKO OS",
      message: "프로젝트가 생성되었습니다. 이제 채팅에 작업을 입력하면 QARKO OS가 Hermes CLI 실행 흐름으로 연결합니다.",
      status: "planned",
    },
  ],
  outputPreview: "",
  stepCount: 0,
  sessionTranscript: "",
});

const transcriptLineFromLog = (log: LogEntry) =>
  `${log.roleName} [${log.status}]: ${redactSensitiveText(log.message).slice(0, 1600)}`;

const appendSessionTranscript = (run: Run, logs: LogEntry[]) => {
  const nextTranscript = [run.sessionTranscript?.trim(), ...logs.map(transcriptLineFromLog)]
    .filter(Boolean)
    .join("\n\n");
  return nextTranscript.length > 24000 ? nextTranscript.slice(-24000) : nextTranscript;
};

const buildHermesRunContext = (run: Run) => {
  const transcript =
    run.sessionTranscript?.trim() ||
    run.logs.map(transcriptLineFromLog).join("\n\n") ||
    "No prior project messages yet.";
  const previousOutput = run.outputPreview.trim()
    ? `Previous output summary:\n${redactSensitiveText(run.outputPreview).slice(0, 1600)}`
    : "Previous output summary: none yet";

  return [previousOutput, "Project session transcript:", transcript].join("\n\n");
};

const buildHermesChatPrompt = (project: Project, run: Run, userPrompt: string) => [
  "You are Hermes running inside QARKO OS, a Windows desktop workbench inspired by Codex.",
  "Respond as an execution agent, not as a marketing dashboard.",
  "The user expects practical work: inspect, plan, edit, write, debug, and summarize the result clearly.",
  "Keep all outputs grounded in the current project and write in Korean unless the user asks otherwise.",
  "Continue the same project session. Use the recent project conversation as memory for follow-up requests.",
  "",
  `Project: ${project.name}`,
  `Project brief: ${project.idea}`,
  `Mode: ${project.automationMode}`,
  `Turn: ${run.stepCount + 1}`,
  "",
  buildHermesRunContext(run),
  "",
  "User request:",
  userPrompt,
  "",
  "Return format:",
  "## 실행 요약",
  "## 변경/작성한 내용",
  "## 확인이 필요한 부분",
  "## 다음에 입력하면 좋은 요청",
].join("\n");

const sanitizeRunForStorage = (run: Run): Run => ({
  ...run,
  outputPreview: redactSensitiveText(run.outputPreview),
  sessionTranscript: redactSensitiveText(run.sessionTranscript ?? ""),
  logs: run.logs.map((log) => ({ ...log, message: redactSensitiveText(log.message) })),
});

const sanitizeRunMapForStorage = (runs: Record<string, Run>) =>
  Object.fromEntries(Object.entries(runs).map(([projectId, run]) => [projectId, sanitizeRunForStorage(run)]));

const projectRunsWithActiveRun = (runs: Record<string, Run>, activeRun: Run) => {
  const sanitizedRuns = sanitizeRunMapForStorage(runs);
  if (activeRun.projectId && !sanitizedRuns[activeRun.projectId]) {
    sanitizedRuns[activeRun.projectId] = sanitizeRunForStorage(activeRun);
  }
  return sanitizedRuns;
};

const sanitizePromptMapForStorage = (prompts: Record<string, string>) =>
  Object.fromEntries(Object.entries(prompts).map(([projectId, prompt]) => [projectId, redactSensitiveText(prompt)]));

const sanitizeApprovalForStorage = (approval: Approval): Approval => ({
  ...approval,
  action: redactSensitiveText(approval.action),
  whatWillHappen: redactSensitiveText(approval.whatWillHappen),
  expectedResult: redactSensitiveText(approval.expectedResult),
});

const clearPendingApprovalsAfterCloudLoad = (approvals: Approval[]) =>
  approvals.map((approval) =>
    approval.status === "pending"
      ? sanitizeApprovalForStorage({
          ...approval,
          status: "cancelled",
          expectedResult:
            `${approval.expectedResult}\n\n클라우드에서 불러온 승인 대기 작업은 원문 프롬프트를 보관하지 않아 취소되었습니다. 같은 요청을 다시 입력해 주세요.`,
        })
      : sanitizeApprovalForStorage(approval)
  );

const sanitizeArtifactForStorage = (artifact: Artifact): Artifact => ({
  ...artifact,
  summary: redactSensitiveText(artifact.summary),
});

const sanitizeArtifactForCloud = (artifact: Artifact): Artifact => {
  const sanitized = sanitizeArtifactForStorage(artifact);
  return sanitized.path ? { ...sanitized, path: undefined } : sanitized;
};

const sanitizeProjectForStorage = (project: Project): Project => ({
  ...project,
  name: redactSensitiveText(project.name),
  idea: redactSensitiveText(project.idea),
  goal: {
    ...project.goal,
    title: redactSensitiveText(project.goal.title),
    metric: redactSensitiveText(project.goal.metric),
  },
  workflow: {
    ...project.workflow,
    title: redactSensitiveText(project.workflow.title),
    description: redactSensitiveText(project.workflow.description),
    stages: project.workflow.stages.map((stage) => ({ ...stage, title: redactSensitiveText(stage.title) })),
  },
  tasks: project.tasks.map((task) => ({
    ...task,
    title: redactSensitiveText(task.title),
    description: redactSensitiveText(task.description),
  })),
  roles: project.roles.map((role) => ({
    ...role,
    mission: redactSensitiveText(role.mission),
    currentFocus: redactSensitiveText(role.currentFocus),
  })),
  risks: project.risks.map(redactSensitiveText),
  nextAction: redactSensitiveText(project.nextAction),
});

const sanitizeFeedbackForStorage = (item: FeedbackEntry): FeedbackEntry => ({
  ...item,
  message: redactSensitiveText(item.message),
  testerName: item.testerName ? redactSensitiveText(item.testerName) : item.testerName,
  testerContact: item.testerContact ? redactSensitiveText(item.testerContact) : item.testerContact,
});

const sanitizeReviewNoteForStorage = (note: ReviewNote): ReviewNote => ({
  ...note,
  target: redactSensitiveText(note.target),
  message: redactSensitiveText(note.message),
});

const approvalFingerprintForPrompt = (projectId: string, prompt: string) => {
  let hash = 2166136261;
  for (let index = 0; index < prompt.length; index += 1) {
    hash ^= prompt.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `approval-${projectId}-${(hash >>> 0).toString(16)}`;
};

const needsManualApprovalForPrompt = (prompt: string) =>
  /(delete|remove|rm\s+-rf|format|wipe|deploy|publish|production|upload|send\s+to|external|webhook|env|api\s*key|token|secret|password|삭제|제거|배포|운영|업로드|외부\s*전송|웹훅|환경\s*변수|비밀키|토큰|패스워드|비밀번호)/i.test(
    prompt
  );

const toolsetsForHermesPreset = (mode: HermesToolPreset) => {
  if (mode === "developer") return "web,file,terminal,browser,skills,memory,session_search,delegation,todo";
  return "web,file,skills,memory,session_search,todo";
};

export const useQarkoStore = create<QarkoState>()(
  persist(
    (set, get) => ({
      workspace,
      projects: [],
      selectedProjectId: "",
      view: "workspace",
      approvals: [],
      artifacts: [],
      plugins: initialPlugins,
      feedback: [],
      reviewNotes: [],
      activeRun: emptyRun,
      projectRuns: {},
      projectPendingPrompts: {},
      pendingPrompt: "",
      actionNotice: "작업을 시작하려면 새 프로젝트를 만들거나 Hermes에게 맡길 일을 입력하세요.",
      automationPolicies,
      syncEndpoint: getDefaultSyncEndpoint(),
      syncAccessToken: "",
      syncStatus: "idle",
      hermesConnection: {
        endpoint: "",
        apiKey: "",
        modelName: "gpt-5.5",
      },
      hermesStatus: "not_configured",
      hermesMessage: "Hermes API 주소와 모델을 확인하면 실제 런타임 상태로 전환됩니다.",
      hermesAvailableModels: [],
      hermesHealth: {
        ok: false,
        statusOutput: "",
        doctorOutput: "",
        toolsOutput: "",
        message: "Hermes 작업실 점검을 아직 실행하지 않았습니다.",
      },
      hermesToolPreset: "safe",
      hermesInstallStatus: "unknown",
      hermesInstallMessage: "Hermes 설치 상태를 아직 확인하지 않았습니다.",
      hermesSetupProvider: "openai-codex",
      hermesSetupOutput: "",
      hermesAuthStatus: "idle",
      hermesAuthMessage: "OAuth 제공자를 선택하면 QARKO OS 안에서 로그인 흐름을 시작할 수 있습니다.",
      hermesUpdateStatus: "idle",
      hermesUpdateMessage: "업데이트는 QARKO가 확인한 버전으로만 진행합니다. 새 버전 적용도 사용자가 직접 승인해야 시작됩니다.",
      showHermesOnboarding: false,
      selectProject: (projectId) =>
        set((state) => {
          const project = state.projects.find((item) => item.id === projectId);
          return {
            selectedProjectId: projectId,
            view: "workspace",
            activeRun: project
              ? state.projectRuns[projectId] ?? buildRunForProject(project)
              : state.activeRun,
            pendingPrompt: project ? state.projectPendingPrompts[projectId] ?? "" : state.pendingPrompt,
            actionNotice: project ? `"${project.name}" Hermes 채팅을 열었습니다.` : "프로젝트를 선택했습니다.",
          };
        }),
      setView: (view) => set({ view }),
      createProject: (input) =>
        set((state) => {
          const project = buildProjectFromIdea({ ...input, customRules: input.customRules ?? defaultRules }, state.projects.length + 1);
          const initialRun = buildRunForProject(project);
          return {
            projects: [project, ...state.projects],
            selectedProjectId: project.id,
            view: "workspace",
            activeRun: initialRun,
            projectRuns: { ...state.projectRuns, [project.id]: initialRun },
            projectPendingPrompts: { ...state.projectPendingPrompts },
            pendingPrompt: "",
            actionNotice: `"${project.name}" 프로젝트를 만들었습니다. 중앙 채팅창에 Hermes에게 맡길 작업을 입력하세요.`,
          };
        }),
      setAutomationMode: (mode) =>
        set((state) => ({
          projects: state.projects.map((project) =>
            project.id === state.selectedProjectId ? { ...project, automationMode: mode } : project
          ),
          actionNotice: "프로젝트 자동화 모드를 변경했습니다.",
        })),
      resolveApproval: (approvalId, decision) =>
        set((state) => {
          const approval = state.approvals.find((item) => item.id === approvalId);
          const decisionLabel = decision === "approved" ? "승인" : decision === "revise" ? "수정 요청" : "취소";
          const nextProjectPendingPrompts = { ...state.projectPendingPrompts };
          if (approval && decision !== "approved") {
            delete nextProjectPendingPrompts[approval.projectId];
          }
          return {
            approvals: state.approvals.map((item) => (item.id === approvalId ? { ...item, status: decision } : item)),
            projectPendingPrompts: nextProjectPendingPrompts,
            pendingPrompt:
              approval?.projectId === state.selectedProjectId
                ? decision === "approved"
                  ? nextProjectPendingPrompts[approval.projectId] ?? state.pendingPrompt
                  : ""
                : state.pendingPrompt,
            actionNotice: approval
              ? decision === "approved"
                ? `"${approval.action}" 작업을 ${decisionLabel} 처리했습니다. 다시 실행하면 이어서 진행합니다.`
                : `"${approval.action}" 작업을 ${decisionLabel} 처리했습니다. 채팅창에서 요청을 수정해 다시 보내세요.`
              : "승인 요청을 처리했습니다.",
          };
        }),
      togglePlugin: (pluginId) =>
        set((state) => {
          const plugin = state.plugins.find((item) => item.id === pluginId);
          const nextEnabled = !plugin?.enabled;
          return {
            plugins: state.plugins.map((item) => (item.id === pluginId ? { ...item, enabled: nextEnabled } : item)),
            actionNotice: plugin ? `${plugin.name} 플러그인을 ${nextEnabled ? "활성화" : "비활성화"}했습니다.` : "플러그인 상태를 변경했습니다.",
          };
        }),
      runWorkbenchTask: async (idea, mode) => {
        const trimmedIdea = idea.trim();
        const state = get();
        if (!state.selectedProjectId && !state.projects.length && !trimmedIdea) {
          set({ actionNotice: "Hermes에게 보낼 첫 메시지를 입력해 주세요." });
          return;
        }
        const userPrompt = trimmedIdea || "이 프로젝트에서 다음으로 해야 할 작업을 추천하고 바로 실행해줘.";
        if (trimmedIdea && (!state.selectedProjectId || !state.projects.length)) {
          const project = buildProjectFromIdea({ idea: trimmedIdea, mode, customRules: defaultRules }, state.projects.length + 1);
          const initialRun = buildRunForProject(project);
          set((current) => ({
            projects: [project, ...current.projects],
            selectedProjectId: project.id,
            view: "workspace",
            activeRun: initialRun,
            projectRuns: { ...current.projectRuns, [project.id]: initialRun },
            projectPendingPrompts: { ...current.projectPendingPrompts, [project.id]: userPrompt },
            pendingPrompt: userPrompt,
            actionNotice: `"${project.name}" 프로젝트를 만들고 Hermes 채팅 실행을 준비했습니다.`,
          }));
        } else if (!state.selectedProjectId && state.projects[0]) {
          const projectId = state.projects[0].id;
          set((current) => ({
            selectedProjectId: projectId,
            view: "workspace",
            activeRun: current.projectRuns[projectId] ?? buildRunForProject(state.projects[0]),
            projectPendingPrompts: { ...current.projectPendingPrompts, [projectId]: userPrompt },
            pendingPrompt: userPrompt,
          }));
        } else {
          set((current) => ({
            projectPendingPrompts: { ...current.projectPendingPrompts, [current.selectedProjectId]: userPrompt },
            pendingPrompt: userPrompt,
          }));
        }
        await get().runNextStep();
      },
      runNextStep: async () => {
        const state = get();
        const project = state.projects.find((item) => item.id === state.selectedProjectId);
        if (!project) {
          set({ actionNotice: "Hermes와 대화할 프로젝트나 첫 메시지가 필요합니다.", view: "workspace" });
          return;
        }
        const projectRun =
          state.activeRun.projectId === project.id
            ? state.activeRun
            : state.projectRuns[project.id] ?? buildRunForProject(project);
        if (projectRun.status === "running") {
          set({ actionNotice: "이미 Hermes 실행이 진행 중입니다. 완료 후 다시 실행하세요." });
          return;
        }
        const projectPendingPrompt =
          state.projectPendingPrompts[project.id] ?? (state.activeRun.projectId === project.id ? state.pendingPrompt : "");
        const userPrompt = projectPendingPrompt.trim() || project.nextAction || "다음 작업을 이어서 진행해줘.";
        const hasPendingApproval = state.approvals.some(
          (approval) => approval.projectId === project.id && approval.status === "pending"
        );
        if (hasPendingApproval) {
          set({
            actionNotice:
              "샌드박스(안전 승인 모드): 승인 대기 작업을 먼저 확인하세요. 베타에서는 위험 작업을 승인 목록에 세워두고 사용자가 직접 진행 여부를 정합니다.",
          });
          return;
        }
        const approvalId = approvalFingerprintForPrompt(project.id, userPrompt);
        const approvalAction = `Hermes 위험 작업 승인: ${redactSensitiveText(userPrompt).slice(0, 80)}`;
        const approvalForPrompt = state.approvals.find(
          (approval) => approval.projectId === project.id && approval.id === approvalId
        );
        if (
          needsManualApprovalForPrompt(userPrompt) &&
          approvalForPrompt?.status !== "approved"
        ) {
          set((current) => ({
            projects: current.projects.map((item) =>
              item.id === project.id ? { ...item, status: "needs_approval" } : item
            ),
            approvals: approvalForPrompt
              ? current.approvals.map((approval) =>
                  approval.id === approvalId
                    ? {
                        ...approval,
                        action: approvalAction,
                        whatWillHappen: "Hermes가 파일/외부 전송/배포/비밀값과 관련될 수 있는 요청을 실행하기 전에 사용자 승인을 기다립니다.",
                        expectedResult: "사용자가 오른쪽 승인 패널에서 작업 범위와 위험을 확인한 뒤 승인하면 같은 메시지를 실행합니다.",
                        risk: "high",
                        status: "pending",
                      }
                    : approval
                )
              : [
                  {
                    id: approvalId,
                    projectId: project.id,
                    action: approvalAction,
                    whatWillHappen: "Hermes가 파일/외부 전송/배포/비밀값과 관련될 수 있는 요청을 실행하기 전에 사용자 승인을 기다립니다.",
                    expectedResult: "사용자가 오른쪽 승인 패널에서 작업 범위와 위험을 확인한 뒤 승인하면 같은 메시지를 실행합니다.",
                    risk: "high",
                    status: "pending",
                  },
                  ...current.approvals,
                ],
            pendingPrompt: userPrompt,
            projectPendingPrompts: { ...current.projectPendingPrompts, [project.id]: userPrompt },
            actionNotice:
              "안전 승인 모드: 위험할 수 있는 요청을 감지했습니다. 오른쪽 승인 패널에서 내용을 확인하고 승인한 뒤 다시 실행하세요.",
          }));
          return;
        }
        const provider = getHermesProviderOption(state.hermesSetupProvider);
        const isBrowserPreview = !hasTauriRuntime();
        if (!isBrowserPreview && state.hermesStatus !== "connected") {
          set({
            actionNotice: "실제 작업 실행을 위해 먼저 Hermes 설치와 모델 연결을 완료하세요.",
            showHermesOnboarding: true,
          });
          return;
        }
        if (!isBrowserPreview && provider.authType === "api-key" && !state.hermesConnection.apiKey.trim()) {
          set({
            hermesStatus: "not_configured",
            actionNotice: "API 키 방식은 앱을 다시 열면 보안을 위해 키를 다시 입력해야 합니다.",
            showHermesOnboarding: true,
          });
          return;
        }

        const nextStep = projectRun.stepCount + 1;
        const runId = projectRun.id;
        const safeUserPrompt = redactSensitiveText(userPrompt);
        const userLog = {
          id: `log-${project.id}-${nextStep}-user`,
          timestamp: "now",
          roleName: "User",
          message: safeUserPrompt,
          status: "completed" as const,
        };
        const runningLog = {
          id: `log-${project.id}-${nextStep}-running`,
          timestamp: "now",
          roleName: "Hermes",
          message: `${state.hermesConnection.modelName || "Hermes"} 모델로 요청을 실행하고 있습니다.`,
          status: "running" as const,
        };
        set((current) => {
          const currentRun =
            current.activeRun.projectId === project.id
              ? current.activeRun
              : current.projectRuns[project.id] ?? projectRun;
          const runningRun: Run = {
            ...currentRun,
            projectId: project.id,
            title: `${project.name} Hermes 세션`,
            activeRoleName: "Hermes",
            modelName: current.hermesConnection.modelName || currentRun.modelName,
            status: "running",
            stepCount: nextStep,
            logs: [...currentRun.logs, userLog, runningLog],
            outputPreview: "Hermes가 요청을 처리하는 중입니다.",
            sessionTranscript: appendSessionTranscript(currentRun, [userLog]),
          };
          return {
            projects: current.projects.map((item) => (item.id === project.id ? { ...item, status: "running" } : item)),
            activeRun: runningRun,
            projectRuns: { ...current.projectRuns, [project.id]: runningRun },
            actionNotice: "Hermes CLI 실행을 시작했습니다.",
          };
        });

        try {
          const result = await runHermesBusinessStep({
            prompt: buildHermesChatPrompt(project, projectRun, userPrompt),
            modelName: state.hermesConnection.modelName,
            provider: state.hermesSetupProvider,
            apiKey: state.hermesConnection.apiKey,
            projectId: project.id,
            runId,
            toolsets: toolsetsForHermesPreset(state.hermesToolPreset),
          });
          const output = result.output.trim() || result.message;
          const safeOutput = redactSensitiveText(output);
          const safeResultMessage = redactSensitiveText(result.message);
          const artifact: Artifact | null = result.ok
            ? {
                id: `artifact-${project.id}-${Date.now()}`,
                projectId: project.id,
                title: `Hermes 응답 ${nextStep}`,
                type: "draft",
                summary: safeOutput.length > 360 ? `${safeOutput.slice(0, 360)}...` : safeOutput,
                createdAt: new Date().toLocaleString(),
                path: result.workspacePath,
              }
            : null;
          const workspaceArtifact: Artifact | null =
            result.ok && result.workspacePath
              ? {
                  id: `artifact-${project.id}-${Date.now()}-workspace`,
                  projectId: project.id,
                  title: "Hermes 작업 폴더",
                  type: "workspace",
                  summary: "이번 Hermes 실행에서 생성된 파일과 초안이 저장되는 QARKO 작업 폴더입니다.",
                  path: result.workspacePath,
                  createdAt: new Date().toLocaleString(),
                }
              : null;
          set((current) => {
            const currentRun =
              current.projectRuns[project.id] ??
              (current.activeRun.projectId === project.id ? current.activeRun : projectRun);
            if (currentRun.id !== runId) return {};
            const completedRun: Run = {
              ...currentRun,
              status: result.ok ? "completed" : "failed",
              outputPreview: safeOutput,
              sessionTranscript: appendSessionTranscript(currentRun, [
                {
                  id: `log-${project.id}-${nextStep}-transcript`,
                  timestamp: "now",
                  roleName: result.ok ? "Hermes" : "QARKO OS",
                  message: result.ok ? safeOutput : safeResultMessage,
                  status: result.ok ? "completed" : "failed",
                },
              ]),
              logs: [
                ...currentRun.logs,
                {
                  id: `log-${project.id}-${nextStep}-done`,
                  timestamp: "now",
                  roleName: result.ok ? "Hermes" : "QARKO OS",
                  message: result.ok ? safeOutput : safeResultMessage,
                  status: result.ok ? "completed" : "failed",
                },
              ],
            };
            const nextProjectPendingPrompts = { ...current.projectPendingPrompts };
            delete nextProjectPendingPrompts[project.id];
            return {
              projects: current.projects.map((item) =>
                item.id === project.id ? { ...item, status: result.ok ? "completed" : "failed" } : item
              ),
              artifacts: result.ok
                ? ([workspaceArtifact, artifact, ...current.artifacts].filter(Boolean) as Artifact[])
                : current.artifacts,
              activeRun: current.selectedProjectId === project.id ? completedRun : current.activeRun,
              projectRuns: { ...current.projectRuns, [project.id]: completedRun },
              projectPendingPrompts: nextProjectPendingPrompts,
              pendingPrompt: current.selectedProjectId === project.id ? "" : current.pendingPrompt,
              actionNotice:
                current.selectedProjectId === project.id
                  ? result.ok
                    ? "Hermes 응답을 받았습니다. 오른쪽 패널에서 로그와 산출물을 확인하세요."
                    : "Hermes 실행에 실패했습니다. 모델 인증과 설정을 확인하세요."
                  : current.actionNotice,
            };
          });
        } catch (error) {
          set((current) => {
            const currentRun =
              current.projectRuns[project.id] ??
              (current.activeRun.projectId === project.id ? current.activeRun : projectRun);
            if (currentRun.id !== runId) return {};
            const errorMessage = redactSensitiveText(error instanceof Error ? error.message : "Hermes 실행 중 오류가 발생했습니다.");
            const failedRun: Run = {
              ...currentRun,
              status: "failed",
              sessionTranscript: appendSessionTranscript(currentRun, [
                {
                  id: `log-${project.id}-${nextStep}-error-transcript`,
                  timestamp: "now",
                  roleName: "QARKO OS",
                  message: errorMessage,
                  status: "failed",
                },
              ]),
              logs: [
                ...currentRun.logs,
                {
                  id: `log-${project.id}-${nextStep}-error`,
                  timestamp: "now",
                  roleName: "QARKO OS",
                  message: errorMessage,
                  status: "failed",
                },
              ],
            };
            const nextProjectPendingPrompts = { ...current.projectPendingPrompts };
            delete nextProjectPendingPrompts[project.id];
            return {
              projects: current.projects.map((item) => (item.id === project.id ? { ...item, status: "failed" } : item)),
              activeRun: current.selectedProjectId === project.id ? failedRun : current.activeRun,
              projectRuns: { ...current.projectRuns, [project.id]: failedRun },
              projectPendingPrompts: nextProjectPendingPrompts,
              pendingPrompt: current.selectedProjectId === project.id ? "" : current.pendingPrompt,
              actionNotice: current.selectedProjectId === project.id ? errorMessage : current.actionNotice,
            };
          });
        }
      },
      resetWorkspace: () =>
        set({
          projects: [],
          selectedProjectId: "",
          view: "workspace",
          approvals: [],
          artifacts: [],
          plugins: initialPlugins,
          activeRun: emptyRun,
          projectRuns: {},
          projectPendingPrompts: {},
          actionNotice: "워크스페이스를 비웠습니다. 새 프로젝트를 만들어 베타 테스트를 시작하세요.",
        }),
      updateHermesConnection: (connection) =>
        set((state) => ({
          hermesConnection: { ...state.hermesConnection, ...connection },
          hermesStatus: "not_configured",
          hermesMessage: "Hermes 연결 정보가 변경되었습니다. 연결 테스트를 다시 실행하세요.",
          actionNotice: "Hermes 연결 정보를 로컬 상태에 반영했습니다. API 키는 장기 저장하지 않습니다.",
        })),
      refreshHermesHealth: async () => {
        set({ actionNotice: "Hermes 작업실 상태를 점검하는 중입니다." });
        try {
          const health = await getHermesHealthReport();
          set({
            hermesHealth: health,
            actionNotice: health.ok ? "Hermes 작업실 점검이 완료되었습니다." : "Hermes 점검에서 확인할 항목이 있습니다.",
          });
        } catch (error) {
          set({
            hermesHealth: {
              ok: false,
              statusOutput: "",
              doctorOutput: "",
              toolsOutput: "",
              message: error instanceof Error ? error.message : "Hermes 작업실 점검에 실패했습니다.",
            },
            actionNotice: "Hermes 작업실 점검에 실패했습니다.",
          });
        }
      },
      saveHermesToolPreset: async (mode) => {
        set({ hermesToolPreset: mode, actionNotice: "Hermes 업무 능력 프리셋을 저장하는 중입니다." });
        try {
          const result = await configureHermesToolPreset(mode);
          set({
            hermesSetupOutput: result.output,
            actionNotice: result.ok ? result.message : "Hermes 업무 능력 프리셋 저장에 실패했습니다.",
          });
        } catch (error) {
          set({
            hermesSetupOutput: error instanceof Error ? error.message : "Hermes 업무 능력 프리셋 저장에 실패했습니다.",
            actionNotice: "Hermes 업무 능력 프리셋 저장에 실패했습니다.",
          });
        }
      },
      testHermesRuntime: async () => {
        const state = get();
        const connection = state.hermesConnection;
        const provider = getHermesProviderOption(state.hermesSetupProvider);
        if (provider.authType === "oauth" && !connection.endpoint.trim()) {
          set({
            hermesStatus: "testing",
            hermesMessage: "Hermes OAuth 인증 상태를 확인하는 중입니다.",
            hermesAuthMessage: "Hermes auth status를 확인하는 중입니다.",
            actionNotice: "Hermes OAuth 상태를 확인하고 있습니다.",
          });
          const authResult = await checkHermesAuthStatus(state.hermesSetupProvider);
          if (!authResult.ok) {
            set({
              hermesStatus: "error",
              hermesAuthStatus: "error",
              hermesMessage: authResult.message,
              hermesAuthMessage: authResult.message,
              hermesSetupOutput: authResult.output,
              actionNotice: "OAuth 로그인이 아직 완료되지 않았습니다.",
            });
            return;
          }
          set((current) => ({
            hermesStatus: "connected",
            hermesAuthStatus: "completed",
            hermesAuthMessage: authResult.message,
            hermesSetupOutput: authResult.output,
            hermesMessage: `${provider.label} OAuth 인증과 모델 설정이 완료되었습니다. HTTP 주소 없이 Hermes CLI 인증으로 사용합니다.`,
            hermesAvailableModels: provider.modelOptions.map((model) => model.id),
            activeRun: { ...current.activeRun, modelName: connection.modelName },
            actionNotice: `${provider.label} OAuth 연결 상태로 전환했습니다.`,
          }));
          return;
        }
        set({
          hermesStatus: "testing",
          hermesMessage: "Hermes 연결을 확인하는 중입니다.",
          actionNotice: "Hermes 런타임 연결을 테스트하고 있습니다.",
        });
        const result = await testHermesConnection(connection);
        if (result.status === "connected") {
          set((state) => ({
            hermesStatus: "connected",
            hermesMessage: result.message,
            hermesAvailableModels: result.availableModels,
            activeRun: { ...state.activeRun, modelName: result.modelName ?? state.hermesConnection.modelName },
            actionNotice: `Hermes 연결 성공: ${result.modelName ?? state.hermesConnection.modelName}`,
          }));
          return;
        }
        set({
          hermesStatus: "error",
          hermesMessage: result.message,
          hermesAvailableModels: result.availableModels,
          actionNotice: "Hermes 연결에 실패했습니다. API 주소, 키, 모델명을 확인하세요.",
        });
      },
      checkHermesInstall: async () => {
        set({
          hermesInstallStatus: "unknown",
          hermesInstallMessage: "Hermes 설치 상태를 확인하는 중입니다.",
        });
        try {
          const status = await getHermesDesktopStatus();
          const verified = status.installed && status.verified !== false;
          set({
            hermesInstallStatus: verified ? "installed" : status.installed ? "error" : "missing",
            hermesExecutablePath: status.executablePath,
            hermesInstallMessage: status.version ? `${status.message} ${status.version}` : status.message,
          });
        } catch (error) {
          set({
            hermesInstallStatus: "error",
            hermesInstallMessage: error instanceof Error ? error.message : "Hermes 설치 상태 확인에 실패했습니다.",
          });
        }
      },
      installHermesDesktop: async () => {
        set({
          hermesInstallStatus: "installing",
          hermesInstallMessage: "QARKO OS 안에서 Hermes를 설치하는 중입니다. 몇 분 정도 걸릴 수 있습니다.",
          actionNotice: "Hermes 공식 Windows 설치 스크립트를 앱 내부에서 실행합니다.",
        });
        try {
          const message = await startHermesInstall();
          set({
            hermesInstallStatus: "installed",
            hermesInstallMessage: message,
            actionNotice: "Hermes 설치가 완료되었습니다. 이제 모델 설정을 진행하세요.",
          });
        } catch (error) {
          set({
            hermesInstallStatus: "error",
            hermesInstallMessage: error instanceof Error ? error.message : "Hermes 설치를 시작하지 못했습니다.",
            actionNotice: "Hermes 설치를 시작하지 못했습니다.",
          });
        }
      },
      updateHermesVerified: async () => {
        set({
          hermesInstallStatus: "installing",
          hermesUpdateStatus: "updating",
          hermesUpdateMessage: "QARKO 고정 버전으로 Hermes를 업데이트/복구하는 중입니다.",
          hermesInstallMessage: "검증된 Hermes 버전으로 업데이트/복구하는 중입니다.",
          actionNotice: "QARKO 고정 채널의 Hermes 버전으로 업데이트를 시작했습니다.",
        });
        try {
          const message = await updateHermesToVerifiedVersion();
          set({
            hermesInstallStatus: "installed",
            hermesUpdateStatus: "completed",
            hermesUpdateMessage: message,
            hermesInstallMessage: message,
            actionNotice: "Hermes를 QARKO 고정 버전으로 맞췄습니다.",
          });
        } catch (error) {
          set({
            hermesInstallStatus: "error",
            hermesUpdateStatus: "error",
            hermesUpdateMessage: error instanceof Error ? error.message : "Hermes 업데이트/복구에 실패했습니다.",
            hermesInstallMessage: error instanceof Error ? error.message : "Hermes 업데이트/복구에 실패했습니다.",
            actionNotice: "Hermes 업데이트/복구에 실패했습니다.",
          });
        }
      },
      updateHermesSetupProvider: (provider) =>
        set((state) => {
          const option = getHermesProviderOption(provider);
          return {
            hermesSetupProvider: provider,
            hermesSetupOutput: "",
            hermesAuthStatus: "idle",
            hermesAuthMessage: "",
            hermesConnection: {
              ...state.hermesConnection,
              endpoint: option.defaultEndpoint,
              modelName: option.defaultModel || state.hermesConnection.modelName,
              apiKey: "",
            },
            actionNotice: `${option.label} 설정 흐름을 선택했습니다.`,
          };
        }),
      saveHermesGuidedSetup: async () => {
        const state = get();
        set({
          hermesInstallMessage: "Hermes 설정을 저장하는 중입니다.",
          hermesSetupOutput: "",
          actionNotice: "Hermes 모델 설정을 저장하고 있습니다.",
        });
        try {
          const result = await configureHermesGuidedSetup({
            provider: state.hermesSetupProvider,
            modelName: state.hermesConnection.modelName,
            apiKey: "",
            endpoint: state.hermesConnection.endpoint,
          });
          const provider = getHermesProviderOption(state.hermesSetupProvider);
          const oauthReady = result.ok && provider.authType === "oauth" && state.hermesAuthStatus === "completed";
          set((current) => ({
            hermesInstallMessage: result.message,
            hermesSetupOutput: result.output,
            showHermesOnboarding: true,
            hermesStatus: oauthReady ? "connected" : current.hermesStatus,
            hermesMessage: oauthReady
              ? `${provider.label} OAuth 인증과 모델 설정이 완료되었습니다. 이제 QARKO OS에서 Hermes 작업을 시작할 수 있습니다.`
              : current.hermesMessage,
            hermesAvailableModels: oauthReady ? provider.modelOptions.map((model) => model.id) : current.hermesAvailableModels,
            activeRun: oauthReady ? { ...current.activeRun, modelName: state.hermesConnection.modelName } : current.activeRun,
            actionNotice: result.ok
              ? oauthReady
                ? "Hermes OAuth 연결을 완료했습니다."
                : "Hermes 기본 설정을 저장했습니다. 연결 테스트를 눌러 확인하세요."
              : "Hermes 설정 저장에 실패했습니다.",
          }));
        } catch (error) {
          set({
            hermesInstallStatus: "error",
            hermesInstallMessage: error instanceof Error ? error.message : "Hermes 설정 저장에 실패했습니다.",
          });
        }
      },
      loginHermesOAuthProvider: async () => {
        const state = get();
        set({
          hermesAuthStatus: "running",
          hermesAuthMessage: "Hermes guided login을 시작하는 중입니다. 브라우저 로그인이 열리면 완료한 뒤 QARKO OS에서 인증 확인을 누르세요.",
          hermesSetupOutput: "",
          actionNotice: "Hermes OAuth 로그인을 시작했습니다.",
        });
        try {
          const result = await loginHermesProvider(state.hermesSetupProvider);
          set({
            hermesAuthStatus: result.ok ? "idle" : "error",
            hermesAuthMessage: result.message,
            hermesSetupOutput: result.output,
            actionNotice: result.ok ? "브라우저에서 코드 입력을 완료한 뒤 인증 완료 확인을 누르세요." : "Hermes OAuth 로그인이 시작되지 않았습니다.",
          });
        } catch (error) {
          set({
            hermesAuthStatus: "error",
            hermesAuthMessage: error instanceof Error ? error.message : "Hermes OAuth 로그인에 실패했습니다.",
            actionNotice: "Hermes OAuth 로그인에 실패했습니다.",
          });
        }
      },
      openHermesSetupWizard: async (section) => {
        set({
          hermesSetupOutput: "",
          actionNotice: "Hermes setup 터미널을 여는 중입니다.",
        });
        try {
          const result = await openHermesSetupTerminal(section);
          set({
            hermesSetupOutput: result.output,
            actionNotice: result.message,
          });
        } catch (error) {
          set({
            hermesSetupOutput: error instanceof Error ? error.message : "Hermes setup 터미널을 열지 못했습니다.",
            actionNotice: "Hermes setup 터미널을 열지 못했습니다.",
          });
        }
      },
      openHermesLoginFallback: async () => {
        const state = get();
        set({
          hermesSetupOutput: "",
          actionNotice: "브라우저 로그인이 열리지 않아 고급 로그인 창을 여는 중입니다.",
        });
        try {
          const result = await openHermesLoginTerminal(state.hermesSetupProvider);
          set({
            hermesSetupOutput: result.output,
            actionNotice: result.message,
          });
        } catch (error) {
          set({
            hermesSetupOutput: error instanceof Error ? error.message : "Hermes 로그인 창을 열지 못했습니다.",
            actionNotice: "Hermes 로그인 창을 열지 못했습니다.",
          });
        }
      },
      openHermesOnboarding: () => set({ showHermesOnboarding: true, actionNotice: "Hermes 작업실 준비 화면을 열었습니다." }),
      dismissHermesOnboarding: () => set({ showHermesOnboarding: false }),
      addFeedback: (input) =>
        set((state) => {
          const entry = sanitizeFeedbackForStorage({
            ...input,
            id: `feedback-${Date.now()}`,
            createdAt: new Date().toLocaleString("ko-KR"),
          });
          return {
            feedback: [entry, ...state.feedback],
            actionNotice: "피드백을 이 PC에 저장했습니다. 피드백 보내기를 누르면 서버와 Discord로 전달됩니다.",
          };
        }),
      clearFeedback: () => set({ feedback: [], actionNotice: "저장된 피드백을 비웠습니다." }),
      buildFeedbackReport: () => {
        const state = get();
        const feedbackForReport = state.feedback.map(sanitizeFeedbackForStorage);
        const lines = [
          "# QARKO OS 테스트 피드백",
          "",
          `- Hermes 설치 상태: ${state.hermesInstallStatus}`,
          `- Hermes 연결 상태: ${state.hermesStatus}`,
          `- 선택 모델: ${state.hermesConnection.modelName || "미입력"}`,
          `- 프로젝트 수: ${state.projects.length}`,
          "",
          "## 피드백",
          ...(feedbackForReport.length > 0
            ? feedbackForReport.flatMap((item, index) => [
                "",
                `${index + 1}. [${feedbackAreaLabel[item.area]} / ${feedbackEaseLabel[item.ease]}] ${item.createdAt}`,
                item.testerName ? `- 테스터: ${item.testerName}` : "- 테스터: 미입력",
                item.testerContact ? `- 연락처: ${item.testerContact}` : "- 연락처: 미입력",
                item.appVersion ? `- 앱 버전: ${item.appVersion}` : "- 앱 버전: 0.1.0",
                item.message,
              ])
            : ["", "아직 저장된 피드백이 없습니다."]),
        ];
        return lines.join("\n");
      },
      addReviewNote: (input) =>
        set((state) => {
          const note = sanitizeReviewNoteForStorage({
            id: `note-${Date.now()}`,
            target: input.target.trim() || "현재 화면",
            message: input.message.trim(),
            status: "open",
            createdAt: new Date().toLocaleString("ko-KR"),
          });
          const feedbackEntry = sanitizeFeedbackForStorage({
            id: `feedback-${Date.now()}-note`,
            area: "other",
            ease: "confusing",
            message: `[화면 주석] ${note.target}\n${note.message}`,
            testerName: "QARKO Owner",
            appVersion: "0.1.0",
            createdAt: note.createdAt,
          });
          return {
            reviewNotes: [note, ...state.reviewNotes],
            feedback: [feedbackEntry, ...state.feedback],
            actionNotice: "화면 주석을 저장했습니다. 피드백 보내기를 누르면 Discord에도 전달됩니다.",
          };
        }),
      updateReviewNoteStatus: (noteId, status) =>
        set((state) => ({
          reviewNotes: state.reviewNotes.map((note) => (note.id === noteId ? { ...note, status } : note)),
          actionNotice: "주석 상태를 업데이트했습니다.",
        })),
      sendFeedbackToCloud: async () => {
        const state = get();
        if (state.feedback.length === 0) {
          set({ actionNotice: "보낼 피드백이 아직 없습니다." });
          return;
        }
        set({ syncStatus: "syncing", syncError: undefined, actionNotice: "작성한 피드백을 서버와 Discord로 보내는 중입니다." });
        try {
          const safeFeedback = state.feedback.map(sanitizeFeedbackForStorage);
          const cloudFeedback = await sendFeedbackEntries(state.syncEndpoint, safeFeedback);
          set({
            feedback: mergeFeedbackEntries(safeFeedback, cloudFeedback.map(sanitizeFeedbackForStorage)),
            syncStatus: "synced",
            syncError: undefined,
            actionNotice: `피드백 ${cloudFeedback.length}개를 서버에 저장했습니다. Discord 채널에서도 확인할 수 있습니다.`,
          });
        } catch (error) {
          set({
            syncStatus: "error",
            syncError: error instanceof Error ? error.message : "피드백 보내기에 실패했습니다.",
            actionNotice: "피드백 보내기에 실패했습니다. API 주소와 인터넷 연결을 확인하세요.",
          });
        }
      },
      loadFeedbackFromCloud: async () => {
        const state = get();
        set({ syncStatus: "syncing", syncError: undefined, actionNotice: "서버에서 피드백을 불러오는 중입니다." });
        try {
          const cloudFeedback = await loadFeedbackEntries(state.syncEndpoint, state.syncAccessToken);
          set({
            feedback: mergeFeedbackEntries(state.feedback.map(sanitizeFeedbackForStorage), cloudFeedback.map(sanitizeFeedbackForStorage)),
            syncStatus: "synced",
            syncError: undefined,
            actionNotice: `서버 피드백 ${cloudFeedback.length}개를 불러왔습니다.`,
          });
        } catch (error) {
          set({
            syncStatus: "error",
            syncError: error instanceof Error ? error.message : "피드백 불러오기에 실패했습니다.",
            actionNotice: "피드백 불러오기에 실패했습니다. 관리자 토큰과 서버 상태를 확인하세요.",
          });
        }
      },
      setSyncEndpoint: (endpoint) => set({ syncEndpoint: endpoint, syncStatus: "idle", syncError: undefined, actionNotice: "클라우드 동기화 주소를 저장했습니다." }),
      setSyncAccessToken: (token) => set({ syncAccessToken: token, syncStatus: "idle", syncError: undefined, actionNotice: "관리자 토큰을 현재 앱 세션에만 보관합니다. 앱을 다시 열면 다시 입력해야 합니다." }),
      saveToCloud: async () => {
        const state = get();
        if (!isTrustedSyncEndpoint(state.syncEndpoint)) {
          set({
            syncStatus: "error",
            syncError: "클라우드 동기화 주소는 /api, Railway HTTPS 주소, 또는 로컬 개발 주소만 사용할 수 있습니다.",
            actionNotice: "신뢰할 수 없는 동기화 주소라 저장을 중단했습니다.",
          });
          return;
        }
        const hasSensitiveWorkspaceData =
          state.projects.length > 0 || state.artifacts.length > 0 || state.activeRun.outputPreview.trim().length > 0;
        if (hasSensitiveWorkspaceData && typeof window !== "undefined") {
          const approved = window.confirm(
            "클라우드 저장에는 프로젝트 아이디어, Hermes 실행 결과, 산출물 요약, 피드백, 화면 주석이 포함될 수 있습니다. 베타 테스트 공유/백업 목적일 때만 계속하세요."
          );
          if (!approved) {
            set({ actionNotice: "클라우드 저장을 취소했습니다. 로컬 데이터는 이 PC에만 남아 있습니다." });
            return;
          }
        }
        set({ syncStatus: "syncing", syncError: undefined, actionNotice: "서버에 워크스페이스를 저장하는 중입니다." });
        try {
          const saved = await saveWorkspaceSnapshot(state.syncEndpoint, makeWorkspaceSnapshot(state), state.syncAccessToken);
          const restoredSnapshot = applyWorkspaceSnapshot(saved);
          set((current) => ({
            ...restoredSnapshot,
            approvals: current.approvals.map(sanitizeApprovalForStorage),
            projectPendingPrompts: current.projectPendingPrompts,
            pendingPrompt: restoredSnapshot.selectedProjectId
              ? current.projectPendingPrompts[restoredSnapshot.selectedProjectId] ?? current.pendingPrompt
              : current.pendingPrompt,
            syncStatus: "synced",
            syncError: undefined,
            actionNotice: `클라우드 저장 완료: ${saved.updatedAt ?? "방금"}`,
          }));
        } catch (error) {
          set({ syncStatus: "error", syncError: error instanceof Error ? error.message : "클라우드 저장에 실패했습니다.", actionNotice: "클라우드 저장에 실패했습니다." });
        }
      },
      loadFromCloud: async () => {
        const { syncEndpoint, syncAccessToken } = get();
        set({ syncStatus: "syncing", syncError: undefined, actionNotice: "서버에서 워크스페이스를 불러오는 중입니다." });
        try {
          const snapshot = await loadWorkspaceSnapshot(syncEndpoint, syncAccessToken);
          set({ ...applyWorkspaceSnapshot(snapshot), syncStatus: "synced", syncError: undefined, actionNotice: `클라우드 불러오기 완료: ${snapshot.updatedAt ?? "방금"}` });
        } catch (error) {
          set({ syncStatus: "error", syncError: error instanceof Error ? error.message : "클라우드 불러오기에 실패했습니다.", actionNotice: "클라우드 불러오기에 실패했습니다." });
        }
      },
    }),
    {
      name: "qarko-os-workspace-v4",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => {
        const provider = getHermesProviderOption(state.hermesSetupProvider);
        const persistedHermesStatus =
          state.hermesStatus === "connected" && provider.authType === "api-key"
            ? "not_configured"
            : state.hermesStatus;
        return {
          projects: state.projects.map(sanitizeProjectForStorage),
          selectedProjectId: state.selectedProjectId,
          view: state.view,
          approvals: state.approvals.map(sanitizeApprovalForStorage),
          artifacts: state.artifacts.map(sanitizeArtifactForStorage),
          plugins: state.plugins,
          feedback: state.feedback.map(sanitizeFeedbackForStorage),
          reviewNotes: state.reviewNotes.map(sanitizeReviewNoteForStorage),
          activeRun: sanitizeRunForStorage(state.activeRun),
          projectRuns: projectRunsWithActiveRun(state.projectRuns, state.activeRun),
          projectPendingPrompts: sanitizePromptMapForStorage(state.projectPendingPrompts),
          actionNotice: redactSensitiveText(state.actionNotice),
          syncEndpoint: state.syncEndpoint,
          syncAccessToken: "",
          hermesConnection: { ...state.hermesConnection, apiKey: "" },
          hermesStatus: persistedHermesStatus,
          hermesMessage: state.hermesMessage,
          hermesAvailableModels: state.hermesAvailableModels,
          hermesHealth: state.hermesHealth,
          hermesToolPreset: state.hermesToolPreset,
          hermesInstallStatus: state.hermesInstallStatus,
          hermesExecutablePath: state.hermesExecutablePath,
          hermesInstallMessage: state.hermesInstallMessage,
          hermesSetupProvider: state.hermesSetupProvider,
          hermesSetupOutput: "",
          hermesAuthStatus: state.hermesAuthStatus,
          hermesAuthMessage: state.hermesAuthMessage,
          hermesUpdateStatus: state.hermesUpdateStatus,
          hermesUpdateMessage: state.hermesUpdateMessage,
        };
      },
      merge: (persistedState, currentState) => {
        const restored = persistedState as Partial<QarkoState>;
        const restoredRuns = restored.projectRuns ?? (restored.activeRun?.projectId ? { [restored.activeRun.projectId]: restored.activeRun } : {});
        const restoredPendingPrompts = restored.projectPendingPrompts ?? {};
        return {
          ...currentState,
          ...restored,
          projectRuns: restoredRuns,
          projectPendingPrompts: restoredPendingPrompts,
          showHermesOnboarding: false,
        };
      },
    }
  )
);
