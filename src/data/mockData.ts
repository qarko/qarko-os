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
  tagline: "Hermes CLI를 쉽게 쓰는 작업 공간",
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

export const sandboxModeOptions = [
  {
    id: "manual",
    label: "보기/초안 모드",
    summary: "AI가 계획, 글, 체크리스트만 만들고 파일 변경이나 외부 실행은 하지 않습니다.",
    explanation: "처음 쓰는 사용자가 가장 안심하고 시작할 수 있는 모드입니다.",
  },
  {
    id: "assisted",
    label: "샌드박스(안전 승인 모드)",
    summary: "AI가 QARKO 프로젝트 안에서 작업하고, 위험 작업은 승인 대기 목록에 올린 뒤 진행합니다.",
    explanation: "베타에서는 승인 UX와 검증된 Hermes 실행 파일을 중심으로 보호합니다. OS 수준 파일 격리는 상용화 전 추가 예정입니다.",
  },
  {
    id: "automation",
    label: "자동 실행 모드",
    summary: "반복 작업은 자동 실행하되, 게시/결제/삭제/운영 설정 변경은 승인 후 진행합니다.",
    explanation: "숙련 사용자가 베타 이후 점진적으로 켤 수 있는 고급 모드입니다.",
  },
] as const;

export const hermesStrengths = [
  {
    title: "모델 자유도",
    description: "Nous Portal, OpenRouter, OpenAI 호환 API, 로컬/커스텀 엔드포인트처럼 사용자의 환경에 맞는 모델을 선택합니다.",
  },
  {
    title: "도구와 툴셋",
    description: "Hermes의 tools/toolsets 개념을 QARKO 작업실에서 쉬운 권한 선택과 실행 로그로 보여줍니다.",
  },
  {
    title: "스킬과 메모리",
    description: "반복되는 작업은 스킬처럼 정리하고, 프로젝트 맥락은 다음 작업에서 다시 활용할 수 있게 설계합니다.",
  },
  {
    title: "에이전트 실행",
    description: "단순 채팅이 아니라 조사, 작성, 검토, 승인 요청을 단계별 실행 흐름으로 다룹니다.",
  },
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
    name: "Session Planner",
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
    id: "operator",
    name: "Tool Operator",
    mission: "파일, 브라우저, 도구 실행 흐름 설계",
    status: "planned",
    currentFocus: "필요한 툴셋과 실행 권한 정리",
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
    name: "Hermes Workbench Project",
    idea: "Hermes로 처리할 작업을 프로젝트 세션으로 만들기",
    status: "running",
    automationMode: "assisted",
    goal: {
      id: "goal-launchpad",
      title: "첫 실행 목표와 작업 계획 확정",
      metric: "오늘 실행할 작업 3개 준비",
      status: "running",
    },
    workflow: {
      id: "workflow-launchpad",
      title: "Request to Working Session",
      description: "요청을 목표, 맥락, 실행, 승인 단계로 분해",
      stages: [
        { id: "stage-1", title: "요청 정리", status: "completed", ownerRoleId: "chief" },
        { id: "stage-2", title: "자료 확인", status: "running", ownerRoleId: "researcher" },
        { id: "stage-3", title: "실행 설계", status: "planned", ownerRoleId: "operator" },
        { id: "stage-4", title: "리스크 리뷰", status: "needs_approval", ownerRoleId: "reviewer" },
      ],
    },
    tasks: [
      {
        id: "task-1",
        title: "작업 목표를 한 문장으로 정리",
        description: "목표, 입력 자료, 원하는 결과를 기준으로 압축",
        status: "completed",
        roleId: "chief",
        approvalRequired: false,
      },
      {
        id: "task-2",
        title: "현재 폴더와 참고자료 확인",
        description: "사용자가 제공한 파일, 목표, 제약 조건을 먼저 확인",
        status: "running",
        roleId: "researcher",
        approvalRequired: false,
      },
      {
        id: "task-3",
        title: "파일 변경 전 승인",
        description: "작업 폴더 밖 변경이나 위험한 명령 실행 전 승인",
        status: "needs_approval",
        roleId: "reviewer",
        approvalRequired: true,
      },
    ],
    roles: baseRoles,
    risks: ["요청 범위가 너무 넓으면 실행 품질이 낮아질 수 있음", "권한을 과하게 열면 의도치 않은 변경이 생길 수 있음"],
    nextAction: "Hermes에게 맡길 첫 작업을 입력하고, 필요한 승인 범위를 확인하세요.",
  },
  {
    id: "project-docs",
    name: "Documentation Cleanup",
    idea: "폴더 안 문서를 읽고 구조, 누락, 다음 작업을 정리하기",
    status: "planned",
    automationMode: "manual",
    goal: {
      id: "goal-docs",
      title: "문서 상태와 수정 계획 정리",
      metric: "핵심 파일 목록과 수정 우선순위 준비",
      status: "planned",
    },
    workflow: {
      id: "workflow-docs",
      title: "Read to Edit Plan",
      description: "폴더 읽기, 문제 정리, 변경 제안, 승인 흐름을 연결",
      stages: [
        { id: "stage-docs-1", title: "파일 읽기", status: "planned", ownerRoleId: "researcher" },
        { id: "stage-docs-2", title: "수정 제안", status: "planned", ownerRoleId: "operator" },
      ],
    },
    tasks: [
      {
        id: "task-docs-1",
        title: "문서 구조 읽기",
        description: "현재 폴더의 문서와 설정 파일을 안전하게 읽고 요약",
        status: "planned",
        roleId: "researcher",
        approvalRequired: false,
      },
    ],
    roles: baseRoles,
    risks: ["읽기 전용 요청인지 수정 요청인지 불명확할 수 있음"],
    nextAction: "읽을 폴더나 파일 범위를 Hermes에게 알려주세요.",
  },
];

export const approvals: Approval[] = [
  {
    id: "approval-file-change",
    projectId: "project-launchpad",
    action: "작업 폴더 밖 파일 변경 승인",
    whatWillHappen: "Hermes가 현재 프로젝트 폴더 밖의 파일을 변경하기 전에 사용자 확인을 기다립니다.",
    expectedResult: "의도하지 않은 파일 변경을 막고 필요한 작업만 진행합니다.",
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
    title: "Hermes 작업 계획",
    type: "plan",
    summary: "요청 정리, 자료 확인, 실행 단계, 승인 조건이 포함된 작업 계획",
    createdAt: "2026-05-17 09:30",
  },
  {
    id: "artifact-research",
    projectId: "project-launchpad",
    title: "폴더 분석 노트",
    type: "research",
    summary: "현재 폴더의 파일 구조와 다음 작업 후보를 정리한 노트",
    createdAt: "2026-05-17 10:10",
  },
  {
    id: "artifact-review",
    projectId: "project-docs",
    title: "수정 전 확인 체크리스트",
    type: "review",
    summary: "파일 변경 전 확인할 범위, 명령, 결과물 위치의 확인 항목",
    createdAt: "2026-05-18 15:30",
  },
];

export const activeRun: Run = {
  id: "run-001",
  projectId: "project-launchpad",
  title: "Hermes 작업 세션",
  activeRoleName: "Researcher",
  modelName: "Hermes Mock / GPT-compatible",
  status: "running",
  runnerTarget: "local",
  activePhase: "running",
  currentCommand: "hermes chat -q --model Hermes Mock",
  commandStatus: "running",
  progressSteps: [
    { id: "request", label: "요청 확인", status: "completed" },
    { id: "session", label: "프로젝트 세션 준비", status: "completed" },
    { id: "hermes", label: "Hermes CLI 실행", status: "running" },
    { id: "outputs", label: "출력 및 작업 폴더 정리", status: "pending" },
    { id: "review", label: "변경 사항 검토", status: "pending" },
  ],
  changeSummary: { filesChanged: 0, insertions: 0, deletions: 0 },
  agentActivities: [
    { id: "chief", name: "Chief of Staff", status: "completed", detail: "작업 목표 정리 완료" },
    { id: "researcher", name: "Researcher", status: "running", detail: "Hermes CLI 실행 중" },
    { id: "reviewer", name: "QA / Reviewer", status: "needs_approval", detail: "변경 검토 대기" },
  ],
  browserPreview: { enabled: false, label: "브라우저 미연결" },
  stepCount: 3,
  outputPreview: "Hermes가 요청을 읽고 작업 범위, 필요한 파일, 승인 조건을 정리하고 있습니다.",
  sessionTranscript:
    "Chief of Staff [completed]: 작업 목표를 실행 가능한 단위로 정리했습니다.\n\nResearcher [running]: 참고 자료와 사용자 막힘 패턴을 정리 중입니다.",
  messages: [
    {
      id: "message-1",
      role: "system",
      content: "프로젝트 세션이 시작되었습니다.",
      createdAt: "2026-05-18T13:04:00.000Z",
      status: "completed",
    },
    {
      id: "message-2",
      role: "assistant",
      content: "작업 목표를 실행 가능한 범위로 정리했습니다.",
      createdAt: "2026-05-18T13:06:00.000Z",
      status: "running",
    },
  ],
  logs: [
    {
      id: "log-1",
      timestamp: "13:04",
      roleName: "Chief of Staff",
      message: "작업 목표를 실행 가능한 단위로 압축했습니다.",
      status: "completed",
    },
    {
      id: "log-2",
      timestamp: "13:06",
      roleName: "Researcher",
      message: "현재 폴더와 참고 자료를 정리 중입니다.",
      status: "running",
    },
    {
      id: "log-3",
      timestamp: "13:08",
      roleName: "QA / Reviewer",
      message: "작업 폴더 밖 변경 전 승인 게이트가 필요합니다.",
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
    workflows: ["웹 자료 조사", "문서 요약"],
    risk: "medium",
    enabled: false,
  },
  {
    id: "plugin-files",
    name: "Workspace File Assistant",
    category: "community",
    capability: "작업 폴더 안 파일 생성, 요약, 수정 제안 제공",
    permissions: ["문서 생성", "파일 읽기"],
    workflows: ["문서 초안", "수정 계획"],
    risk: "low",
    enabled: false,
  },
  {
    id: "plugin-terminal",
    name: "Terminal Command Guard",
    category: "recommended",
    capability: "Hermes 터미널 명령을 승인 단계와 실행 로그로 연결",
    permissions: ["명령 실행", "실행 로그 읽기"],
    workflows: ["명령 승인", "실행 결과 요약"],
    risk: "high",
    enabled: false,
  },
];
