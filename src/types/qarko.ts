export type Status =
  | "idle"
  | "planned"
  | "running"
  | "blocked"
  | "needs_approval"
  | "completed"
  | "failed";

export type RiskLevel = "low" | "medium" | "high" | "critical";
export type AutomationMode = "manual" | "assisted" | "automation" | "custom";
export type AppView = "workspace" | "project" | "new-project" | "plugins" | "settings";
export type ApprovalDecision = "approved" | "revise" | "cancelled";
export type RuntimeStatus = "connected" | "not_connected" | "mock";
export type SyncStatus = "idle" | "syncing" | "synced" | "error";
export type HermesStatus = "not_configured" | "testing" | "connected" | "error";

export interface Workspace {
  id: string;
  name: string;
  tagline: string;
}

export interface ApprovalRule {
  id: string;
  label: string;
  description: string;
  requiresApproval: boolean;
  risk: RiskLevel;
}

export interface AutomationPolicy {
  mode: AutomationMode;
  label: string;
  description: string;
  allowedSummary: string;
  approvalSummary: string;
  rules: ApprovalRule[];
}

export interface AgentRole {
  id: string;
  name: string;
  mission: string;
  status: Status;
  currentFocus: string;
}

export interface Goal {
  id: string;
  title: string;
  metric: string;
  status: Status;
}

export interface WorkflowStage {
  id: string;
  title: string;
  status: Status;
  ownerRoleId: string;
}

export interface Workflow {
  id: string;
  title: string;
  description: string;
  stages: WorkflowStage[];
}

export interface QarkoTask {
  id: string;
  title: string;
  description: string;
  status: Status;
  roleId: string;
  approvalRequired: boolean;
}

export interface Project {
  id: string;
  name: string;
  idea: string;
  goal: Goal;
  status: Status;
  automationMode: AutomationMode;
  workflow: Workflow;
  tasks: QarkoTask[];
  roles: AgentRole[];
  risks: string[];
  nextAction: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  roleName: string;
  message: string;
  status: Status;
}

export interface Run {
  id: string;
  projectId: string;
  title: string;
  activeRoleName: string;
  modelName: string;
  status: Status;
  logs: LogEntry[];
  outputPreview: string;
  stepCount: number;
}

export interface Approval {
  id: string;
  projectId: string;
  action: string;
  whatWillHappen: string;
  expectedResult: string;
  risk: RiskLevel;
  status: "pending" | ApprovalDecision;
}

export interface Artifact {
  id: string;
  projectId: string;
  title: string;
  type: "plan" | "research" | "draft" | "workflow" | "review";
  summary: string;
  createdAt: string;
}

export interface Plugin {
  id: string;
  name: string;
  category: "installed" | "recommended" | "community";
  capability: string;
  permissions: string[];
  workflows: string[];
  risk: RiskLevel;
  enabled: boolean;
}

export interface NewProjectInput {
  idea: string;
  mode: AutomationMode;
  customRules?: ApprovalRule[];
}

export interface HermesConnection {
  endpoint: string;
  apiKey: string;
  modelName: string;
}

export interface HermesConnectionResult {
  status: "connected" | "error";
  message: string;
  modelName?: string;
  availableModels: string[];
}

export interface WorkspaceSnapshot {
  workspace: Workspace;
  projects: Project[];
  selectedProjectId: string;
  view: AppView;
  approvals: Approval[];
  artifacts: Artifact[];
  plugins: Plugin[];
  activeRun: Run;
  actionNotice: string;
  updatedAt?: string;
}
