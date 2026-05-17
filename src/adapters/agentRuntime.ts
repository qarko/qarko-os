import { activeRun, approvals } from "../data/mockData";
import type { Approval, ApprovalDecision, Run, RuntimeStatus } from "../types/qarko";

export interface AgentRuntimeAdapter {
  getStatus(): RuntimeStatus;
  startRun(projectId: string): Promise<Run>;
  requestApproval(approvalId: string, decision: ApprovalDecision): Promise<Approval>;
}

export const mockAgentRuntime: AgentRuntimeAdapter = {
  getStatus() {
    return "mock";
  },
  async startRun(projectId: string) {
    return { ...activeRun, projectId };
  },
  async requestApproval(approvalId: string, decision: ApprovalDecision) {
    const approval = approvals.find((item) => item.id === approvalId);
    if (!approval) {
      throw new Error("Approval not found");
    }
    return { ...approval, status: decision };
  },
};
