import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
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
import type {
  AppView,
  Approval,
  ApprovalDecision,
  AutomationMode,
  NewProjectInput,
  Plugin,
  Project,
} from "../types/qarko";

interface QarkoState {
  workspace: typeof workspace;
  projects: Project[];
  selectedProjectId: string;
  view: AppView;
  approvals: Approval[];
  artifacts: typeof artifacts;
  plugins: Plugin[];
  activeRun: typeof activeRun;
  actionNotice: string;
  automationPolicies: typeof automationPolicies;
  selectProject: (projectId: string) => void;
  setView: (view: AppView) => void;
  createProject: (input: NewProjectInput) => void;
  setAutomationMode: (mode: AutomationMode) => void;
  resolveApproval: (approvalId: string, decision: ApprovalDecision) => void;
  togglePlugin: (pluginId: string) => void;
  runNextStep: () => void;
  resetWorkspace: () => void;
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

export const useQarkoStore = create<QarkoState>()(
  persist(
    (set) => ({
      workspace,
      projects: initialProjects,
      selectedProjectId: initialProjects[0].id,
      view: "workspace",
      approvals: initialApprovals,
      artifacts,
      plugins: initialPlugins,
      activeRun,
      actionNotice: "로컬 저장이 켜져 있습니다. 프로젝트, 승인, 플러그인 상태가 이 브라우저에 저장됩니다.",
      automationPolicies,
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
          return {
            activeRun: {
              ...state.activeRun,
              stepCount: nextStep,
              logs: [
                ...state.activeRun.logs,
                {
                  id: `log-${nextStep}`,
                  timestamp: "now",
                  roleName: nextStep % 2 === 0 ? "Chief of Staff" : "QA / Reviewer",
                  message:
                    nextStep % 2 === 0
                      ? "다음 실행 후보를 정리했습니다. 위험한 외부 작업은 승인 카드로 분리됩니다."
                      : "현재 단계는 mock 실행입니다. Hermes 실제 연결 전까지는 로그와 산출물 흐름을 검증합니다.",
                  status: nextStep % 2 === 0 ? "running" : "needs_approval",
                },
              ],
              outputPreview:
                nextStep % 2 === 0
                  ? "다음 단계 후보가 준비되었습니다. 승인 범위 안의 내부 작업은 자동 진행할 수 있습니다."
                  : "실제 Hermes 에이전트가 연결되면 이 영역에 실행 결과와 산출물 링크가 표시됩니다.",
            },
            actionNotice: "다음 단계 mock 실행 로그를 추가하고 로컬에 저장했습니다. 실제 에이전트 실행은 Hermes adapter 연결 후 활성화됩니다.",
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
        activeRun: state.activeRun,
        actionNotice: state.actionNotice,
      }),
    }
  )
);
