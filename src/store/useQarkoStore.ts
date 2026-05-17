import { create } from "zustand";
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
  automationPolicies: typeof automationPolicies;
  selectProject: (projectId: string) => void;
  setView: (view: AppView) => void;
  createProject: (input: NewProjectInput) => void;
  setAutomationMode: (mode: AutomationMode) => void;
  resolveApproval: (approvalId: string, decision: ApprovalDecision) => void;
  togglePlugin: (pluginId: string) => void;
}

const buildProjectFromIdea = (input: NewProjectInput, index: number): Project => {
  const trimmedIdea = input.idea.trim();
  const name = trimmedIdea.length > 34 ? `${trimmedIdea.slice(0, 34)}...` : trimmedIdea || "새 사업 프로젝트";

  return {
    id: `project-custom-${Date.now()}`,
    name,
    idea: trimmedIdea || "새로운 사업 아이디어를 운영 가능한 프로젝트로 만들기",
    status: "planned",
    automationMode: input.mode,
    goal: {
      id: `goal-custom-${index}`,
      title: "첫 실행 가능한 사업 운영 계획 만들기",
      metric: "핵심 고객, 첫 작업, 승인 기준 확정",
      status: "planned",
    },
    workflow: {
      id: `workflow-custom-${index}`,
      title: "Idea to Operating System",
      description: "아이디어를 목표, 역할, 작업, 승인 범위로 구조화",
      stages: [
        { id: `stage-custom-${index}-1`, title: "아이디어 정리", status: "planned", ownerRoleId: "chief" },
        { id: `stage-custom-${index}-2`, title: "시장 리서치", status: "planned", ownerRoleId: "researcher" },
        { id: `stage-custom-${index}-3`, title: "실행 계획", status: "planned", ownerRoleId: "marketer" },
      ],
    },
    tasks: [
      {
        id: `task-custom-${index}-1`,
        title: "사업 목표와 고객 가설 정리",
        description: "사용자 아이디어를 문제, 고객, 제안 가치 기준으로 정리",
        status: "planned",
        roleId: "chief",
        approvalRequired: false,
      },
      {
        id: `task-custom-${index}-2`,
        title: "자동화/승인 범위 점검",
        description: "AI가 자동으로 진행할 일과 승인받을 일을 분리",
        status: "needs_approval",
        roleId: "reviewer",
        approvalRequired: true,
      },
    ],
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
    risks: ["초기 범위가 넓을 수 있음", "자동화 수준은 사용자가 직접 확인해야 함"],
    nextAction: "자동화 모드를 확인하고 첫 리서치를 시작하세요.",
  };
};

export const useQarkoStore = create<QarkoState>((set) => ({
  workspace,
  projects: initialProjects,
  selectedProjectId: initialProjects[0].id,
  view: "workspace",
  approvals: initialApprovals,
  artifacts,
  plugins: initialPlugins,
  activeRun,
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
      };
    }),
  setAutomationMode: (mode) =>
    set((state) => ({
      projects: state.projects.map((project) =>
        project.id === state.selectedProjectId ? { ...project, automationMode: mode } : project
      ),
    })),
  resolveApproval: (approvalId, decision) =>
    set((state) => ({
      approvals: state.approvals.map((approval) =>
        approval.id === approvalId ? { ...approval, status: decision } : approval
      ),
    })),
  togglePlugin: (pluginId) =>
    set((state) => ({
      plugins: state.plugins.map((plugin) =>
        plugin.id === pluginId ? { ...plugin, enabled: !plugin.enabled } : plugin
      ),
    })),
}));
