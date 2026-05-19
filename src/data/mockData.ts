import type {
  AgentRole,
  Approval,
  ApprovalRule,
  Artifact,
  AutomationPolicy,
  Plugin,
  Project,
  Run,
  Workspace,
} from "../types/qarko";

export const workspace: Workspace = {
  id: "workspace-qarko",
  name: "QARKO HQ",
  tagline: "1인 AI 회사를 운영하는 실시간 작업 공간",
};

export const defaultRules: ApprovalRule[] = [
  { id: "research", label: "리서치", description: "시장, 경쟁사, 고객 문제 조사", requiresApproval: false, risk: "low" },
  { id: "drafting", label: "초안 작성", description: "문서, 콘텐츠, 메시지 초안 작성", requiresApproval: false, risk: "low" },
  { id: "file-creation", label: "파일 생성", description: "로컬 산출물과 프로젝트 파일 생성", requiresApproval: false, risk: "medium" },
  { id: "media-generation", label: "이미지/영상 생성", description: "생성 모델 또는 외부 도구 사용", requiresApproval: true, risk: "medium" },
  { id: "external-posting", label: "외부 게시", description: "SNS, 블로그, 커뮤니티에 공개 게시", requiresApproval: true, risk: "high" },
  { id: "paid-api", label: "유료 API 사용", description: "비용이 발생할 수 있는 API 호출", requiresApproval: true, risk: "high" },
  { id: "plugin-install", label: "플러그인 설치", description: "권한이 필요한 확장 설치", requiresApproval: true, risk: "medium" },
  { id: "data-delete", label: "데이터 삭제", description: "파일, 프로젝트, 기록 삭제", requiresApproval: true, risk: "critical" },
  { id: "production-settings", label: "운영 설정", description: "배포, 인증, 환경 설정 변경", requiresApproval: true, risk: "critical" },
  { id: "community-share", label: "커뮤니티 공유", description: "워크플로, 플러그인, 템플릿 공개 공유", requiresApproval: true, risk: "medium" },
];

export const automationPolicies: AutomationPolicy[] = [
  {
    mode: "manual",
    label: "수동 모드",
    description: "AI는 제안과 초안만 만들고 모든 실행은 사용자가 승인합니다.",
    allowedSummary: "리서치 정리, 초안 제안",
    approvalSummary: "대부분의 실행 작업 승인 필요",
    rules: defaultRules.map((rule) => ({ ...rule, requiresApproval: true })),
  },
  {
    mode: "assisted",
    label: "보조 모드",
    description: "안전한 내부 작업은 자동으로 진행하고, 공개/비용/삭제 작업은 승인받습니다.",
    allowedSummary: "리서치, 초안, 체크리스트 정리",
    approvalSummary: "게시, 비용, 삭제, 플러그인 설치 승인 필요",
    rules: defaultRules,
  },
  {
    mode: "automation",
    label: "자동화 모드",
    description: "낮은 위험의 반복 워크플로는 자동 실행하고 중요한 결정만 승인받습니다.",
    allowedSummary: "내부 워크플로 자동 실행",
    approvalSummary: "외부 게시, 비용, 삭제, 운영 변경 승인 필요",
    rules: defaultRules.map((rule) => ({
      ...rule,
      requiresApproval: ["external-posting", "paid-api", "data-delete", "production-settings"].includes(rule.id),
    })),
  },
  {
    mode: "custom",
    label: "사용자 지정",
    description: "작업 유형별 승인 범위를 직접 조절합니다.",
    allowedSummary: "사용자가 허용한 작업",
    approvalSummary: "사용자가 지정한 작업만 승인 필요",
    rules: defaultRules,
  },
];

const baseRoles: AgentRole[] = [
  {
    id: "chief",
    name: "Chief of Staff",
    mission: "모호한 목표를 우선순위와 실행 단계로 정리",
    status: "running",
    currentFocus: "이번 주 가장 중요한 실행 순서를 재정렬",
  },
  {
    id: "researcher",
    name: "Researcher",
    mission: "시장, 고객, 경쟁사, 참고자료 조사",
    status: "running",
    currentFocus: "검증에 필요한 참고자료 수집",
  },
  {
    id: "marketer",
    name: "Growth Marketer",
    mission: "콘텐츠, 유통, 전환 흐름 설계",
    status: "planned",
    currentFocus: "첫 고객 획득 채널 후보 정리",
  },
  {
    id: "reviewer",
    name: "QA / Reviewer",
    mission: "결과물 품질과 승인 조건 검토",
    status: "needs_approval",
    currentFocus: "공개 실행 전 승인 게이트 점검",
  },
];

export const projects: Project[] = [
  {
    id: "project-launchpad",
    name: "AI Business Launchpad",
    idea: "새로운 사업 아이디어를 7일 안에 검증 가능한 프로젝트로 바꾸기",
    status: "running",
    automationMode: "assisted",
    goal: {
      id: "goal-launchpad",
      title: "첫 사업 가설과 실행 계획 확정",
      metric: "7일 안에 검증 실험 3개 준비",
      status: "running",
    },
    workflow: {
      id: "workflow-launchpad",
      title: "Idea to Operating Plan",
      description: "아이디어를 목표, 리서치, 작업, 승인 단계로 분해",
      stages: [
        { id: "stage-1", title: "아이디어 정리", status: "completed", ownerRoleId: "chief" },
        { id: "stage-2", title: "시장 리서치", status: "running", ownerRoleId: "researcher" },
        { id: "stage-3", title: "첫 실행 설계", status: "planned", ownerRoleId: "marketer" },
        { id: "stage-4", title: "리스크 리뷰", status: "needs_approval", ownerRoleId: "reviewer" },
      ],
    },
    tasks: [
      {
        id: "task-1",
        title: "사업 아이디어를 한 문장으로 정리",
        description: "고객, 문제, 제안 가치를 기준으로 압축",
        status: "completed",
        roleId: "chief",
        approvalRequired: false,
      },
      {
        id: "task-2",
        title: "경쟁 대안 리서치",
        description: "이미 존재하는 도구와 사용자 불만 패턴 조사",
        status: "running",
        roleId: "researcher",
        approvalRequired: false,
      },
      {
        id: "task-3",
        title: "첫 공개 테스트 승인",
        description: "Threads에 공개할 메시지를 검토하고 승인",
        status: "needs_approval",
        roleId: "reviewer",
        approvalRequired: true,
      },
    ],
    roles: baseRoles,
    risks: ["시장 범위가 너무 넓을 수 있음", "초기 자동화 범위가 과하면 신뢰가 낮아질 수 있음"],
    nextAction: "리서치 결과를 보고 첫 검증 실험을 승인하세요.",
  },
  {
    id: "project-threads",
    name: "Threads Marketing Sprint",
    idea: "QARKO OS 베타 테스터 3-5명을 찾기 위한 인스타/Threads 홍보 프로젝트",
    status: "planned",
    automationMode: "manual",
    goal: {
      id: "goal-threads",
      title: "베타 테스터 모집 메시지 완성",
      metric: "3개 게시글 초안과 DM 응답 흐름 준비",
      status: "planned",
    },
    workflow: {
      id: "workflow-threads",
      title: "Audience to Feedback Loop",
      description: "대상 정의, 콘텐츠 초안, 피드백 수집 경로를 연결",
      stages: [
        { id: "stage-threads-1", title: "대상 정의", status: "planned", ownerRoleId: "chief" },
        { id: "stage-threads-2", title: "게시글 초안", status: "planned", ownerRoleId: "marketer" },
      ],
    },
    tasks: [
      {
        id: "task-threads-1",
        title: "베타 테스터 조건 정리",
        description: "비개발자, 1인 사업자, AI 도구 사용자 중심으로 모집 조건 정리",
        status: "planned",
        roleId: "chief",
        approvalRequired: false,
      },
    ],
    roles: baseRoles,
    risks: ["초기 메시지가 기술 설명에 치우치면 반응이 낮을 수 있음"],
    nextAction: "테스터에게 부탁할 행동을 설치, 첫 실행, 피드백 3단계로 줄이세요.",
  },
];

export const approvals: Approval[] = [
  {
    id: "approval-public-test",
    projectId: "project-launchpad",
    action: "첫 공개 테스트 메시지 승인",
    whatWillHappen: "Growth Marketer가 작성한 검증 메시지를 외부 채널에 게시할 준비를 합니다.",
    expectedResult: "초기 관심도와 질문 반응을 수집합니다.",
    risk: "high",
    status: "pending",
  },
  {
    id: "approval-plugin",
    projectId: "project-launchpad",
    action: "Local File Operator 활성화",
    whatWillHappen: "프로젝트 산출물을 로컬 파일로 저장할 수 있게 합니다.",
    expectedResult: "계획서와 리뷰 결과를 파일로 남길 수 있습니다.",
    risk: "medium",
    status: "pending",
  },
];

export const artifacts: Artifact[] = [
  {
    id: "artifact-plan",
    projectId: "project-launchpad",
    title: "7일 검증 운영 계획",
    type: "plan",
    summary: "아이디어 정리, 리서치, 메시지 테스트, 승인 단계가 포함된 실행 계획",
    createdAt: "2026-05-17 09:30",
  },
  {
    id: "artifact-research",
    projectId: "project-launchpad",
    title: "경쟁 대안 리서치 노트",
    type: "research",
    summary: "유사 도구와 사용자 불만, 차별화 후보를 정리한 리서치",
    createdAt: "2026-05-17 10:10",
  },
  {
    id: "artifact-review",
    projectId: "project-threads",
    title: "베타 피드백 체크리스트",
    type: "review",
    summary: "설치, 첫 실행, Hermes 설정, 피드백 전송 단계의 확인 항목",
    createdAt: "2026-05-18 15:30",
  },
];

export const activeRun: Run = {
  id: "run-001",
  projectId: "project-launchpad",
  title: "시장 검증 준비 실행",
  activeRoleName: "Researcher",
  modelName: "Hermes Mock / GPT-compatible",
  status: "running",
  stepCount: 3,
  outputPreview: "검증 메시지는 문제 인식, 빠른 제안, 승인 요청 순서로 정리하는 것이 좋습니다.",
  logs: [
    {
      id: "log-1",
      timestamp: "13:04",
      roleName: "Chief of Staff",
      message: "사업 목표를 7일 검증 단위로 압축했습니다.",
      status: "completed",
    },
    {
      id: "log-2",
      timestamp: "13:06",
      roleName: "Researcher",
      message: "경쟁 대안 5개와 사용자 불만 패턴을 정리 중입니다.",
      status: "running",
    },
    {
      id: "log-3",
      timestamp: "13:08",
      roleName: "QA / Reviewer",
      message: "외부 게시 전 승인 게이트가 필요합니다.",
      status: "needs_approval",
    },
  ],
};

export const plugins: Plugin[] = [
  {
    id: "plugin-hermes",
    name: "Hermes Agent Pack",
    category: "installed",
    capability: "Hermes 에이전트와 모델 선택을 QARKO OS 작업에 연결",
    permissions: ["모델 실행", "에이전트 상태 읽기"],
    workflows: ["AI 역할 실행", "모델 전환"],
    risk: "medium",
    enabled: true,
  },
  {
    id: "plugin-browser",
    name: "Browser Research Agent",
    category: "recommended",
    capability: "웹 리서치와 참고자료 수집 자동화",
    permissions: ["브라우저 실행", "웹페이지 읽기"],
    workflows: ["시장 조사", "경쟁사 분석"],
    risk: "medium",
    enabled: false,
  },
  {
    id: "plugin-blog",
    name: "Blog SEO Assistant",
    category: "community",
    capability: "키워드, 글 구조, SEO 리뷰 워크플로 제공",
    permissions: ["문서 생성", "SEO 체크리스트"],
    workflows: ["콘텐츠 초안", "검색 최적화"],
    risk: "low",
    enabled: false,
  },
  {
    id: "plugin-publisher",
    name: "Social Publisher",
    category: "recommended",
    capability: "승인 후 외부 채널 게시 준비",
    permissions: ["외부 게시", "계정 연결"],
    workflows: ["콘텐츠 승인", "게시 준비"],
    risk: "high",
    enabled: false,
  },
];
