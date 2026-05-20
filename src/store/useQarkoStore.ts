import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  configureHermesGuidedSetup,
  getHermesDesktopStatus,
  loginHermesProvider,
  startHermesInstall,
  updateHermesToVerifiedVersion,
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
  FeedbackEntry,
  HermesConnection,
  HermesInstallStatus,
  HermesStatus,
  NewFeedbackInput,
  NewProjectInput,
  NewReviewNoteInput,
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
  hermesUpdateStatus: "idle" | "updating" | "completed" | "error";
  hermesUpdateMessage: string;
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
  updateHermesVerified: () => Promise<void>;
  updateHermesSetupProvider: (provider: string) => void;
  saveHermesGuidedSetup: () => Promise<void>;
  loginHermesOAuthProvider: () => Promise<void>;
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
  if (!normalized) return "새 사업 프로젝트";

  const lowerIdea = normalized.toLowerCase();
  if (lowerIdea.includes("newsletter") || lowerIdea.includes("뉴스레터")) return "Newsletter Growth System";
  if (lowerIdea.includes("instagram") || lowerIdea.includes("threads") || lowerIdea.includes("인스타")) return "Social Growth Sprint";
  if (lowerIdea.includes("saas") || lowerIdea.includes("서비스")) return "Digital Product Launch";
  if (lowerIdea.includes("agency") || lowerIdea.includes("대행")) return "Service Agency System";

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
    goalTitle: "첫 실행 가능한 사업 운영 계획 만들기",
    metric: "고객, 문제, 첫 작업, 승인 기준 확정",
    workflowTitle: "Idea to Operating System",
    stages: ["아이디어 정리", "시장 리서치", "실행 계획", "승인 기준"],
    tasks: [
      ["사업 목표와 고객 가치 정리", "아이디어를 문제, 고객, 제안 가치 기준으로 정리", "chief", false],
      ["첫 리서치 범위 설정", "시장과 경쟁 대안 조사 기준 정리", "researcher", false],
      ["자동화 승인 범위 점검", "AI가 자동 진행할 일과 승인받을 일을 분리", "reviewer", true],
    ] as const,
    risks: ["초기 범위가 넓을 수 있음", "자동화 신뢰는 사용자가 직접 확인해야 함"],
    nextAction: "자동화 모드를 확인하고 첫 리서치를 시작하세요.",
  };
};

const buildProjectFromIdea = (input: NewProjectInput, index: number): Project => {
  const trimmedIdea = input.idea.trim();
  const blueprint = makeProjectBlueprint(trimmedIdea);
  const stageOwners = ["chief", "researcher", "marketer", "reviewer"];

  return {
    id: `project-custom-${Date.now()}`,
    name: makeProjectName(trimmedIdea),
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
      actionNotice: "로컬 저장이 켜져 있습니다. 프로젝트, 승인, 플러그인, 피드백 상태가 이 PC에 저장됩니다.",
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
      hermesInstallStatus: "unknown",
      hermesInstallMessage: "Hermes 설치 상태를 아직 확인하지 않았습니다.",
      hermesSetupProvider: "openai-codex",
      hermesSetupOutput: "",
      hermesAuthStatus: "idle",
      hermesAuthMessage: "OAuth 제공자를 선택하면 QARKO OS 안에서 로그인 흐름을 시작할 수 있습니다.",
      hermesUpdateStatus: "idle",
      hermesUpdateMessage: "업데이트는 QARKO가 확인한 버전으로만 진행합니다. 새 버전 적용도 사용자가 직접 승인해야 시작됩니다.",
      showHermesOnboarding: true,
      selectProject: (projectId) => set({ selectedProjectId: projectId, view: "project" }),
      setView: (view) => set({ view }),
      createProject: (input) =>
        set((state) => {
          const project = buildProjectFromIdea({ ...input, customRules: input.customRules ?? defaultRules }, state.projects.length + 1);
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
          actionNotice: "프로젝트 자동화 모드를 변경했습니다.",
        })),
      resolveApproval: (approvalId, decision) =>
        set((state) => {
          const approval = state.approvals.find((item) => item.id === approvalId);
          const decisionLabel = decision === "approved" ? "승인" : decision === "revise" ? "수정 요청" : "취소";
          return {
            approvals: state.approvals.map((item) => (item.id === approvalId ? { ...item, status: decision } : item)),
            actionNotice: approval ? `"${approval.action}" 작업을 ${decisionLabel} 처리했습니다.` : "승인 요청을 처리했습니다.",
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
                    ? `${state.hermesConnection.modelName || "Hermes"} 연결 상태로 다음 실행 후보를 준비했습니다.`
                    : nextStep % 2 === 0
                      ? "다음 실행 후보를 정리했습니다. 위험한 외부 작업은 승인 카드로 분리됩니다."
                      : "현재는 mock 실행입니다. Hermes 연결 후 실제 에이전트 실행으로 확장됩니다.",
                  status: nextStep % 2 === 0 ? "running" : "needs_approval",
                },
              ],
              outputPreview: hermesConnected
                ? "Hermes 연결이 확인되었습니다. 다음 단계에서는 실제 에이전트 실행 요청과 산출물 저장을 연결하면 됩니다."
                : "다음 단계 후보가 준비되었습니다. 승인 범위 안의 내부 작업은 자동 진행할 수 있습니다.",
            },
            actionNotice: hermesConnected ? "Hermes 연결 상태로 다음 단계 로그를 추가했습니다." : "다음 단계 mock 실행 로그를 추가했습니다.",
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
          actionNotice: "워크스페이스를 초기 샘플 상태로 되돌렸습니다.",
        }),
      updateHermesConnection: (connection) =>
        set((state) => ({
          hermesConnection: { ...state.hermesConnection, ...connection },
          hermesStatus: "not_configured",
          hermesMessage: "Hermes 연결 정보가 변경되었습니다. 연결 테스트를 다시 실행하세요.",
          actionNotice: "Hermes 연결 정보를 로컬 상태에 반영했습니다. API 키는 장기 저장하지 않습니다.",
        })),
      testHermesRuntime: async () => {
        const state = get();
        const connection = state.hermesConnection;
        const provider = getHermesProviderOption(state.hermesSetupProvider);
        if (provider.authType === "oauth" && !connection.endpoint.trim()) {
          if (state.hermesAuthStatus !== "completed") {
            set({
              hermesStatus: "error",
              hermesMessage: "먼저 OAuth 로그인을 완료하세요. 로그인 후에는 모델 저장을 누르면 Hermes 설정이 완료됩니다.",
              actionNotice: "OAuth 로그인이 아직 완료되지 않았습니다.",
            });
            return;
          }
          set((current) => ({
            hermesStatus: "connected",
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
          hermesAuthMessage: "브라우저 로그인 창을 여는 중입니다. 완료 후 QARKO OS로 돌아와 상태를 확인하세요.",
          hermesSetupOutput: "",
          actionNotice: "Hermes OAuth 로그인을 시작했습니다.",
        });
        try {
          const result = await loginHermesProvider(state.hermesSetupProvider);
          set({
            hermesAuthStatus: result.ok ? "completed" : "error",
            hermesAuthMessage: result.message,
            hermesSetupOutput: result.output,
            actionNotice: result.ok ? "Hermes OAuth 로그인이 완료되었습니다." : "Hermes OAuth 로그인이 완료되지 않았습니다.",
          });
        } catch (error) {
          set({
            hermesAuthStatus: "error",
            hermesAuthMessage: error instanceof Error ? error.message : "Hermes OAuth 로그인에 실패했습니다.",
            actionNotice: "Hermes OAuth 로그인에 실패했습니다.",
          });
        }
      },
      openHermesOnboarding: () => set({ showHermesOnboarding: true, actionNotice: "Hermes 설정 마법사를 열었습니다." }),
      dismissHermesOnboarding: () => set({ showHermesOnboarding: false }),
      addFeedback: (input) =>
        set((state) => {
          const entry: FeedbackEntry = { ...input, id: `feedback-${Date.now()}`, createdAt: new Date().toLocaleString("ko-KR") };
          return {
            feedback: [entry, ...state.feedback],
            actionNotice: "피드백을 이 PC에 저장했습니다. 피드백 보내기를 누르면 서버와 Discord로 전달됩니다.",
          };
        }),
      clearFeedback: () => set({ feedback: [], actionNotice: "저장된 피드백을 비웠습니다." }),
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
          ...(state.feedback.length > 0
            ? state.feedback.flatMap((item, index) => [
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
        set({ syncStatus: "syncing", syncError: undefined, actionNotice: "작성한 피드백을 서버와 Discord로 보내는 중입니다." });
        try {
          const cloudFeedback = await sendFeedbackEntries(state.syncEndpoint, state.feedback);
          set({
            feedback: mergeFeedbackEntries(state.feedback, cloudFeedback),
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
            feedback: mergeFeedbackEntries(state.feedback, cloudFeedback),
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
        set({ syncStatus: "syncing", syncError: undefined, actionNotice: "서버에 워크스페이스를 저장하는 중입니다." });
        try {
          const saved = await saveWorkspaceSnapshot(state.syncEndpoint, makeWorkspaceSnapshot(state), state.syncAccessToken);
          set({ ...applyWorkspaceSnapshot(saved), syncStatus: "synced", syncError: undefined, actionNotice: `클라우드 저장 완료: ${saved.updatedAt ?? "방금"}` });
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
      name: "qarko-os-workspace-v3",
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
        syncAccessToken: "",
        hermesConnection: { ...state.hermesConnection, apiKey: "" },
        hermesStatus: state.hermesStatus,
        hermesMessage: state.hermesMessage,
        hermesAvailableModels: state.hermesAvailableModels,
        hermesInstallStatus: state.hermesInstallStatus,
        hermesExecutablePath: state.hermesExecutablePath,
        hermesInstallMessage: state.hermesInstallMessage,
        hermesSetupProvider: state.hermesSetupProvider,
        hermesSetupOutput: "",
        hermesAuthStatus: state.hermesAuthStatus,
        hermesAuthMessage: state.hermesAuthMessage,
        hermesUpdateStatus: state.hermesUpdateStatus,
        hermesUpdateMessage: state.hermesUpdateMessage,
        showHermesOnboarding: state.showHermesOnboarding,
      }),
    }
  )
);
