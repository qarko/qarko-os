import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  configureHermesGuidedSetup,
  getHermesDesktopStatus,
  loginHermesProvider,
  startHermesInstall,
} from "../adapters/hermesDesktop";
import { testHermesConnection } from "../adapters/hermesRuntime";
import {
  getDefaultSyncEndpoint,
  loadFeedbackEntries,
  loadWorkspaceSnapshot,
  saveWorkspaceSnapshot,
  sendFeedbackEntries,
} from "../adapters/workspaceSync";
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
  HermesConnection,
  HermesInstallStatus,
  HermesStatus,
  NewFeedbackInput,
  NewProjectInput,
  NewReviewNoteInput,
  FeedbackEntry,
  Plugin,
  Project,
  ReviewNote,
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
  activeRun: typeof activeRun;
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
  hermesInstallStatus: HermesInstallStatus;
  hermesExecutablePath?: string;
  hermesInstallMessage: string;
  hermesSetupProvider: string;
  hermesSetupOutput: string;
  hermesAuthStatus: "idle" | "running" | "completed" | "error";
  hermesAuthMessage: string;
  showHermesOnboarding: boolean;
  selectProject: (projectId: string) => void;
  setView: (view: AppView) => void;
  createProject: (input: NewProjectInput) => void;
  setAutomationMode: (mode: AutomationMode) => void;
  resolveApproval: (approvalId: string, decision: ApprovalDecision) => void;
  togglePlugin: (pluginId: string) => void;
  runNextStep: () => void;
  resetWorkspace: () => void;
  setSyncEndpoint: (endpoint: string) => void;
  setSyncAccessToken: (token: string) => void;
  saveToCloud: () => Promise<void>;
  loadFromCloud: () => Promise<void>;
  updateHermesConnection: (connection: Partial<HermesConnection>) => void;
  testHermesRuntime: () => Promise<void>;
  checkHermesInstall: () => Promise<void>;
  installHermesDesktop: () => Promise<void>;
  updateHermesSetupProvider: (provider: string) => void;
  saveHermesGuidedSetup: () => Promise<void>;
  loginHermesOAuthProvider: () => Promise<void>;
  dismissHermesOnboarding: () => void;
  addFeedback: (input: NewFeedbackInput) => void;
  clearFeedback: () => void;
  buildFeedbackReport: () => string;
  addReviewNote: (input: NewReviewNoteInput) => void;
  updateReviewNoteStatus: (noteId: string, status: ReviewNote["status"]) => void;
  sendFeedbackToCloud: () => Promise<void>;
  loadFeedbackFromCloud: () => Promise<void>;
}

const makeProjectName = (idea: string) => {
  const normalized = idea.replace(/\s+/g, " ").trim();
  if (!normalized) return "새 사업 프로젝트";

  const keywordMap: Array<[string[], string]> = [
    [["뉴스레터", "newsletter"], "Newsletter Growth System"],
    [["블로그", "seo", "티스토리"], "SEO Content Business"],
    [["쇼츠", "shorts", "유튜브"], "Short-form Media Studio"],
    [["인플루언서", "instagram", "인스타"], "Influencer Operating System"],
    [["saas", "앱", "서비스"], "Digital Product Launch"],
    [["대행", "agency", "마케팅"], "Service Agency System"],
  ];

  const lowerIdea = normalized.toLowerCase();
  const matched = keywordMap.find(([keywords]) => keywords.some((keyword) => lowerIdea.includes(keyword.toLowerCase())));
  if (matched) return matched[1];

  return normalized.length > 28 ? `${normalized.slice(0, 28)}...` : normalized;
};

const makeProjectBlueprint = (idea: string) => {
  const lowerIdea = idea.toLowerCase();
  if (lowerIdea.includes("뉴스레터")) {
    return {
      goalTitle: "첫 뉴스레터 운영 루틴과 유료 전환 가설 만들기",
      metric: "구독자 타깃, 발행 주기, 첫 3개 주제 확정",
      workflowTitle: "Idea to Newsletter System",
      stages: ["독자 정의", "콘텐츠 포지션", "발행 루틴", "유료 전환 검토"],
      tasks: [
        ["독자와 문제 정의", "누가 왜 이 뉴스레터를 기다릴지 정리", "chief", false],
        ["첫 3개 발행 주제 조사", "시장/커뮤니티에서 반복되는 관심사를 리서치", "researcher", false],
        ["유료 전환 메시지 승인", "외부에 공개할 구독 제안 문구를 검토", "reviewer", true],
      ],
      risks: ["초기 독자 타깃이 넓으면 구독 이유가 약해질 수 있음", "유료 전환은 충분한 신뢰 전까지 과하게 밀지 않아야 함"],
      nextAction: "독자 타깃과 첫 발행 주제를 확인하세요.",
    };
  }

  if (lowerIdea.includes("대행") || lowerIdea.includes("마케팅")) {
    return {
      goalTitle: "반복 판매 가능한 서비스 패키지 만들기",
      metric: "고객군, 제안서, 첫 영업 메시지 확정",
      workflowTitle: "Offer to Client Pipeline",
      stages: ["고객군 선택", "패키지 설계", "영업 메시지", "승인 리뷰"],
      tasks: [
        ["고객군 1개로 좁히기", "가장 먼저 접근할 고객 유형을 하나로 선택", "chief", false],
        ["서비스 패키지 초안", "문제, 결과물, 가격 가설을 한 장으로 정리", "marketer", false],
        ["외부 영업 메시지 승인", "잠재 고객에게 보낼 문구를 검토", "reviewer", true],
      ],
      risks: ["서비스 범위가 넓으면 운영이 흔들릴 수 있음", "초기 영업 메시지는 과장 표현을 피해야 함"],
      nextAction: "첫 고객군과 서비스 패키지 초안을 검토하세요.",
    };
  }

  return {
    goalTitle: "첫 실행 가능한 사업 운영 계획 만들기",
    metric: "핵심 고객, 첫 작업, 승인 기준 확정",
    workflowTitle: "Idea to Operating System",
    stages: ["아이디어 정리", "시장 리서치", "실행 계획", "승인 기준"],
    tasks: [
      ["사업 목표와 고객 가설 정리", "사용자 아이디어를 문제, 고객, 제안 가치 기준으로 정리", "chief", false],
      ["첫 리서치 범위 설정", "시장, 경쟁 대안, 참고자료 조사 기준 정리", "researcher", false],
      ["자동화/승인 범위 점검", "AI가 자동으로 진행할 일과 승인받을 일을 분리", "reviewer", true],
    ],
    risks: ["초기 범위가 넓을 수 있음", "자동화 수준은 사용자가 직접 확인해야 함"],
    nextAction: "자동화 모드를 확인하고 첫 리서치를 시작하세요.",
  };
};

const buildProjectFromIdea = (input: NewProjectInput, index: number): Project => {
  const trimmedIdea = input.idea.trim();
  const name = makeProjectName(trimmedIdea);
  const blueprint = makeProjectBlueprint(trimmedIdea);
  const stageOwners = ["chief", "researcher", "marketer", "reviewer"];

  return {
    id: `project-custom-${Date.now()}`,
    name,
    idea: trimmedIdea || "새로운 사업 아이디어를 운영 가능한 프로젝트로 만들기",
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
      description: "아이디어를 목표, 역할, 작업, 승인 범위로 구조화",
      stages: blueprint.stages.map((stage, stageIndex) => ({
        id: `stage-custom-${index}-${stageIndex + 1}`,
        title: stage,
        status: stageIndex === 0 ? "running" : "planned",
        ownerRoleId: stageOwners[stageIndex] ?? "chief",
      })),
    },
    tasks: blueprint.tasks.map(([title, description, roleId, approvalRequired], taskIndex) => ({
      id: `task-custom-${index}-${taskIndex + 1}`,
      title: String(title),
      description: String(description),
      status: approvalRequired ? "needs_approval" : taskIndex === 0 ? "running" : "planned",
      roleId: String(roleId),
      approvalRequired: Boolean(approvalRequired),
    })),
    roles: [
      {
        id: "chief",
        name: "Chief of Staff",
        mission: "모호한 목표를 우선순위와 실행 단계로 정리",
        status: "planned",
        currentFocus: "첫 운영 계획을 만들 준비 중",
      },
      {
        id: "researcher",
        name: "Researcher",
        mission: "시장, 도구, 경쟁사, 참고자료 조사",
        status: "planned",
        currentFocus: "리서치 범위 대기",
      },
      {
        id: "reviewer",
        name: "QA / Reviewer",
        mission: "품질, 리스크, 승인 위반 점검",
        status: "needs_approval",
        currentFocus: "승인 정책 확인 필요",
      },
    ],
    risks: blueprint.risks,
    nextAction: blueprint.nextAction,
  };
};

const makeWorkspaceSnapshot = (state: QarkoState): WorkspaceSnapshot => ({
  workspace: state.workspace,
  projects: state.projects,
  selectedProjectId: state.selectedProjectId,
  view: state.view,
  approvals: state.approvals,
  artifacts: state.artifacts,
  plugins: state.plugins,
  feedback: state.feedback,
  reviewNotes: state.reviewNotes,
  activeRun: state.activeRun,
  actionNotice: state.actionNotice,
});

const applyWorkspaceSnapshot = (snapshot: WorkspaceSnapshot) => ({
  workspace: snapshot.workspace,
  projects: snapshot.projects,
  selectedProjectId: snapshot.selectedProjectId,
  view: snapshot.view,
  approvals: snapshot.approvals,
  artifacts: snapshot.artifacts,
  plugins: snapshot.plugins,
  feedback: snapshot.feedback ?? [],
  reviewNotes: snapshot.reviewNotes ?? [],
  activeRun: snapshot.activeRun,
  actionNotice: snapshot.actionNotice,
});

const mergeFeedbackEntries = (local: FeedbackEntry[], remote: FeedbackEntry[]) => {
  const seen = new Set<string>();
  return [...remote, ...local].filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
};

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

export const useQarkoStore = create<QarkoState>()(
  persist(
    (set, get) => ({
      workspace,
      projects: initialProjects,
      selectedProjectId: initialProjects[0].id,
      view: "workspace",
      approvals: initialApprovals,
      artifacts,
      plugins: initialPlugins,
      feedback: [],
      reviewNotes: [],
      activeRun,
      actionNotice: "로컬 저장이 켜져 있습니다. 프로젝트, 승인, 플러그인 상태가 이 브라우저에 저장됩니다.",
      automationPolicies,
      syncEndpoint: getDefaultSyncEndpoint(),
      syncAccessToken: "",
      syncStatus: "idle",
      hermesConnection: {
        endpoint: "http://localhost:11434/v1",
        apiKey: "",
        modelName: "hermes-3",
      },
      hermesStatus: "not_configured",
      hermesMessage: "Hermes API 주소와 모델을 확인하면 실제 런타임 상태로 전환됩니다.",
      hermesAvailableModels: [],
      hermesInstallStatus: "unknown",
      hermesInstallMessage: "Hermes 설치 상태를 확인하지 않았습니다.",
      hermesSetupProvider: "openrouter",
      hermesSetupOutput: "",
      hermesAuthStatus: "idle",
      hermesAuthMessage: "OAuth 제공자를 선택하면 QARKO OS 안에서 로그인 흐름을 시작할 수 있습니다.",
      showHermesOnboarding: true,
      selectProject: (projectId) => set({ selectedProjectId: projectId, view: "project" }),
      setView: (view) => set({ view }),
      createProject: (input) =>
        set((state) => {
          const project = buildProjectFromIdea(
            { ...input, customRules: input.customRules ?? defaultRules },
            state.projects.length + 1
          );
          return {
            projects: [project, ...state.projects],
            selectedProjectId: project.id,
            view: "project",
            actionNotice: `"${project.name}" 프로젝트를 만들고 로컬에 저장했습니다.`,
          };
        }),
      setAutomationMode: (mode) =>
        set((state) => ({
          projects: state.projects.map((project) =>
            project.id === state.selectedProjectId ? { ...project, automationMode: mode } : project
          ),
          actionNotice: "프로젝트 자동화 모드를 변경하고 로컬에 저장했습니다.",
        })),
      resolveApproval: (approvalId, decision) =>
        set((state) => {
          const approval = state.approvals.find((item) => item.id === approvalId);
          const decisionLabel = decision === "approved" ? "승인" : decision === "revise" ? "수정 요청" : "취소";
          return {
            approvals: state.approvals.map((item) => (item.id === approvalId ? { ...item, status: decision } : item)),
            actionNotice: approval
              ? `"${approval.action}" 작업을 ${decisionLabel} 처리하고 로컬에 저장했습니다. 실제 외부 실행은 아직 연결되지 않은 mock 단계입니다.`
              : "승인 요청을 처리했습니다.",
          };
        }),
      togglePlugin: (pluginId) =>
        set((state) => {
          const plugin = state.plugins.find((item) => item.id === pluginId);
          const nextEnabled = !plugin?.enabled;
          return {
            plugins: state.plugins.map((item) => (item.id === pluginId ? { ...item, enabled: nextEnabled } : item)),
            actionNotice: plugin
              ? `${plugin.name} 플러그인을 ${nextEnabled ? "활성화" : "비활성화"}하고 로컬에 저장했습니다. 실제 설치/권한 연결은 다음 단계에서 붙일 예정입니다.`
              : "플러그인 상태를 변경했습니다.",
          };
        }),
      runNextStep: () =>
        set((state) => {
          const nextStep = state.activeRun.stepCount + 1;
          const hermesConnected = state.hermesStatus === "connected";
          return {
            activeRun: {
              ...state.activeRun,
              stepCount: nextStep,
              modelName: hermesConnected ? state.hermesConnection.modelName || state.activeRun.modelName : state.activeRun.modelName,
              logs: [
                ...state.activeRun.logs,
                {
                  id: `log-${nextStep}`,
                  timestamp: "now",
                  roleName: nextStep % 2 === 0 ? "Chief of Staff" : "QA / Reviewer",
                  message: hermesConnected
                    ? `${state.hermesConnection.modelName || "Hermes"} 런타임 연결 상태로 다음 실행 후보를 준비했습니다. 실제 에이전트 실행 API는 승인 정책과 연결해 확장할 수 있습니다.`
                    : nextStep % 2 === 0
                      ? "다음 실행 후보를 정리했습니다. 위험한 외부 작업은 승인 카드로 분리됩니다."
                      : "현재 단계는 mock 실행입니다. Hermes 실제 연결 전까지는 로그와 산출물 흐름을 검증합니다.",
                  status: nextStep % 2 === 0 ? "running" : "needs_approval",
                },
              ],
              outputPreview: hermesConnected
                ? "Hermes 연결이 확인되었습니다. 다음 단계에서는 실제 에이전트 실행 요청과 산출물 저장을 연결하면 됩니다."
                : nextStep % 2 === 0
                  ? "다음 단계 후보가 준비되었습니다. 승인 범위 안의 내부 작업은 자동 진행할 수 있습니다."
                  : "실제 Hermes 에이전트가 연결되면 이 영역에 실행 결과와 산출물 링크가 표시됩니다.",
            },
            actionNotice: hermesConnected
              ? "Hermes 연결 상태를 사용해 다음 단계 로그를 추가했습니다."
              : "다음 단계 mock 실행 로그를 추가하고 로컬에 저장했습니다. 실제 에이전트 실행은 Hermes adapter 연결 후 활성화됩니다.",
          };
        }),
      resetWorkspace: () =>
        set({
          projects: initialProjects,
          selectedProjectId: initialProjects[0].id,
          view: "workspace",
          approvals: initialApprovals,
          artifacts,
          plugins: initialPlugins,
          activeRun,
          actionNotice: "워크스페이스를 초기 MVP 샘플 상태로 되돌렸습니다.",
        }),
      updateHermesConnection: (connection) =>
        set((state) => ({
          hermesConnection: {
            ...state.hermesConnection,
            ...connection,
          },
          hermesStatus: "not_configured",
          hermesMessage: "Hermes 연결 정보가 변경되었습니다. 연결 테스트를 다시 실행하세요.",
          actionNotice: "Hermes 연결 정보를 로컬에 저장했습니다.",
        })),
      testHermesRuntime: async () => {
        const connection = get().hermesConnection;
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
            activeRun: {
              ...state.activeRun,
              modelName: result.modelName ?? state.hermesConnection.modelName,
            },
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
          set({
            hermesInstallStatus: status.installed ? "installed" : "missing",
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
          actionNotice: "Hermes 공식 Windows installer를 실행합니다.",
        });
        try {
          const message = await startHermesInstall();
          set({
            hermesInstallStatus: "installed",
            hermesInstallMessage: message,
            actionNotice: "Hermes 설치가 완료되었습니다. 이제 QARKO OS 안에서 모델 설정을 진행하세요.",
          });
        } catch (error) {
          set({
            hermesInstallStatus: "error",
            hermesInstallMessage: error instanceof Error ? error.message : "Hermes 설치를 시작하지 못했습니다.",
            actionNotice: "Hermes 설치를 시작하지 못했습니다.",
          });
        }
      },
      updateHermesSetupProvider: (provider) =>
        set((state) => {
          const option = getHermesProviderOption(provider);
          return {
            hermesSetupProvider: provider,
            hermesSetupOutput: "",
            hermesConnection: {
              ...state.hermesConnection,
              endpoint: option.defaultEndpoint || state.hermesConnection.endpoint,
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
          actionNotice: "Hermes 모델 설정을 앱 안에서 저장하고 있습니다.",
        });
        try {
          const result = await configureHermesGuidedSetup({
            provider: state.hermesSetupProvider,
            modelName: state.hermesConnection.modelName,
            apiKey: state.hermesConnection.apiKey,
            endpoint: state.hermesConnection.endpoint,
          });
          set({
            hermesInstallMessage: result.message,
            hermesSetupOutput: result.output,
            showHermesOnboarding: true,
            actionNotice: result.ok
              ? "Hermes 기본 설정을 저장했습니다. 연결 테스트를 눌러 확인하세요."
              : "Hermes 설정 저장에 실패했습니다. 메시지를 확인하세요.",
          });
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
          hermesAuthMessage: "브라우저 로그인 창을 여는 중입니다. 로그인 후 QARKO OS로 돌아와 완료 여부를 확인하세요.",
          hermesSetupOutput: "",
          actionNotice: "Hermes OAuth 로그인을 시작했습니다.",
        });
        try {
          const result = await loginHermesProvider(state.hermesSetupProvider);
          set({
            hermesAuthStatus: result.ok ? "completed" : "error",
            hermesAuthMessage: result.message,
            hermesSetupOutput: result.output,
            actionNotice: result.ok
              ? "Hermes OAuth 로그인이 완료되었습니다. 이제 모델 설정 저장과 연결 테스트를 진행하세요."
              : "Hermes OAuth 로그인이 완료되지 않았습니다. 메시지를 확인하고 다시 시도하세요.",
          });
        } catch (error) {
          set({
            hermesAuthStatus: "error",
            hermesAuthMessage: error instanceof Error ? error.message : "Hermes OAuth 로그인에 실패했습니다.",
            actionNotice: "Hermes OAuth 로그인에 실패했습니다.",
          });
        }
      },
      dismissHermesOnboarding: () => set({ showHermesOnboarding: false }),
      addFeedback: (input) =>
        set((state) => {
          const entry: FeedbackEntry = {
            ...input,
            id: `feedback-${Date.now()}`,
            createdAt: new Date().toLocaleString("ko-KR"),
          };
          return {
            feedback: [entry, ...state.feedback],
            actionNotice:
              "피드백을 이 PC에 저장했습니다. 지인 PC에서 작성했다면 피드백 화면의 '작성한 피드백 보내기'를 눌러야 당신이 확인할 수 있습니다.",
          };
        }),
      clearFeedback: () =>
        set({
          feedback: [],
          actionNotice: "저장된 피드백을 비웠습니다.",
        }),
      buildFeedbackReport: () => {
        const state = get();
        const lines = [
          "# QARKO OS 테스트 피드백",
          "",
          `- Hermes 설치 상태: ${state.hermesInstallStatus}`,
          `- Hermes 연결 상태: ${state.hermesStatus}`,
          `- 선택 모델: ${state.hermesConnection.modelName || "미입력"}`,
          `- 프로젝트 수: ${state.projects.length}`,
          "",
          "## 피드백",
          ...(
            state.feedback.length > 0
              ? state.feedback.flatMap((item, index) => [
                  "",
                  `${index + 1}. [${feedbackAreaLabel[item.area]} / ${feedbackEaseLabel[item.ease]}] ${item.createdAt}`,
                  item.testerName ? `- 테스터: ${item.testerName}` : "- 테스터: 미입력",
                  item.testerContact ? `- 연락처: ${item.testerContact}` : "- 연락처: 미입력",
                  item.appVersion ? `- 앱 버전: ${item.appVersion}` : "- 앱 버전: 0.1.0",
                  item.message,
                ])
              : ["", "아직 저장된 피드백이 없습니다."]
          ),
        ];
        return lines.join("\n");
      },
      addReviewNote: (input) =>
        set((state) => {
          const note: ReviewNote = {
            id: `note-${Date.now()}`,
            target: input.target.trim() || "현재 화면",
            message: input.message.trim(),
            status: "open",
            createdAt: new Date().toLocaleString("ko-KR"),
          };
          const feedbackEntry: FeedbackEntry = {
            id: `feedback-${Date.now()}-note`,
            area: "other",
            ease: "confusing",
            message: `[화면 주석] ${note.target}\n${note.message}`,
            testerName: "QARKO Owner",
            appVersion: "0.1.0",
            createdAt: note.createdAt,
          };
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

        set({
          syncStatus: "syncing",
          syncError: undefined,
          actionNotice: "작성한 피드백을 Railway 서버로 보내는 중입니다.",
        });

        try {
          const cloudFeedback = await sendFeedbackEntries(state.syncEndpoint, state.feedback);
          set({
            feedback: mergeFeedbackEntries(state.feedback, cloudFeedback),
            syncStatus: "synced",
            syncError: undefined,
            actionNotice: `피드백 ${cloudFeedback.length}개를 서버에 저장했습니다. 이제 다른 PC에서 '서버 피드백 불러오기'로 확인할 수 있습니다.`,
          });
        } catch (error) {
          set({
            syncStatus: "error",
            syncError: error instanceof Error ? error.message : "피드백 보내기에 실패했습니다.",
            actionNotice: "피드백 보내기에 실패했습니다. Railway API 주소와 인터넷 연결을 확인하세요.",
          });
        }
      },
      loadFeedbackFromCloud: async () => {
        const state = get();
        set({
          syncStatus: "syncing",
          syncError: undefined,
          actionNotice: "Railway 서버에서 피드백을 불러오는 중입니다.",
        });

        try {
          const cloudFeedback = await loadFeedbackEntries(state.syncEndpoint, state.syncAccessToken);
          const mergedFeedback = mergeFeedbackEntries(state.feedback, cloudFeedback);
          set({
            feedback: mergedFeedback,
            syncStatus: "synced",
            syncError: undefined,
            actionNotice: `서버 피드백 ${cloudFeedback.length}개를 불러왔습니다. 피드백 화면 아래 '저장된 피드백'에서 확인하세요.`,
          });
        } catch (error) {
          set({
            syncStatus: "error",
            syncError: error instanceof Error ? error.message : "피드백 불러오기에 실패했습니다.",
            actionNotice: "피드백 불러오기에 실패했습니다. Railway API 주소와 서버 상태를 확인하세요.",
          });
        }
      },
      setSyncEndpoint: (endpoint) =>
        set({
          syncEndpoint: endpoint,
          syncStatus: "idle",
          syncError: undefined,
          actionNotice: endpoint.trim()
            ? "클라우드 동기화 주소를 저장했습니다."
            : "클라우드 동기화 주소를 비웠습니다. 기본 /api 주소를 사용합니다.",
        }),
      setSyncAccessToken: (token) =>
        set({
          syncAccessToken: token,
          syncStatus: "idle",
          syncError: undefined,
          actionNotice: token.trim()
            ? "관리자 토큰을 이 PC에 저장했습니다. 서버 조회와 워크스페이스 동기화에 사용합니다."
            : "관리자 토큰을 비웠습니다. 테스터 피드백 전송은 가능하지만 서버 조회는 제한될 수 있습니다.",
        }),
      saveToCloud: async () => {
        const state = get();
        set({ syncStatus: "syncing", syncError: undefined, actionNotice: "Railway/API 서버에 워크스페이스를 저장하는 중입니다." });
        try {
          const saved = await saveWorkspaceSnapshot(state.syncEndpoint, makeWorkspaceSnapshot(state), state.syncAccessToken);
          set({
            ...applyWorkspaceSnapshot(saved),
            syncStatus: "synced",
            syncError: undefined,
            actionNotice: `클라우드 저장 완료: ${saved.updatedAt ?? "방금"}`,
          });
        } catch (error) {
          set({
            syncStatus: "error",
            syncError: error instanceof Error ? error.message : "클라우드 저장에 실패했습니다.",
            actionNotice: "클라우드 저장에 실패했습니다. API 주소와 서버 상태를 확인하세요.",
          });
        }
      },
      loadFromCloud: async () => {
        const { syncEndpoint, syncAccessToken } = get();
        set({ syncStatus: "syncing", syncError: undefined, actionNotice: "Railway/API 서버에서 워크스페이스를 불러오는 중입니다." });
        try {
          const snapshot = await loadWorkspaceSnapshot(syncEndpoint, syncAccessToken);
          set({
            ...applyWorkspaceSnapshot(snapshot),
            syncStatus: "synced",
            syncError: undefined,
            actionNotice: `클라우드 불러오기 완료: ${snapshot.updatedAt ?? "방금"}`,
          });
        } catch (error) {
          set({
            syncStatus: "error",
            syncError: error instanceof Error ? error.message : "클라우드 불러오기에 실패했습니다.",
            actionNotice: "클라우드 불러오기에 실패했습니다. API 주소와 서버 상태를 확인하세요.",
          });
        }
      },
    }),
    {
      name: "qarko-os-workspace-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        projects: state.projects,
        selectedProjectId: state.selectedProjectId,
        view: state.view,
        approvals: state.approvals,
        artifacts: state.artifacts,
        plugins: state.plugins,
        feedback: state.feedback,
        reviewNotes: state.reviewNotes,
        activeRun: state.activeRun,
        actionNotice: state.actionNotice,
        syncEndpoint: state.syncEndpoint,
        syncAccessToken: state.syncAccessToken,
        hermesConnection: {
          ...state.hermesConnection,
          apiKey: "",
        },
        hermesStatus: state.hermesStatus,
        hermesMessage: state.hermesMessage,
        hermesAvailableModels: state.hermesAvailableModels,
        hermesInstallStatus: state.hermesInstallStatus,
        hermesExecutablePath: state.hermesExecutablePath,
        hermesInstallMessage: state.hermesInstallMessage,
        hermesSetupProvider: state.hermesSetupProvider,
        hermesSetupOutput: state.hermesSetupOutput,
        hermesAuthStatus: state.hermesAuthStatus,
        hermesAuthMessage: state.hermesAuthMessage,
        showHermesOnboarding: state.showHermesOnboarding,
      }),
    }
  )
);
