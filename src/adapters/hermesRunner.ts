import { runHermesGatewayTurn, type HermesGatewayTurnResult } from "./hermesGateway";

// Legacy fallback path is still provided by runHermesWorkbenchStep inside hermesGateway.fallbackToOneShot.
export interface HermesWorkspaceChangeSummary {
  filesChanged: number;
  insertions: number;
  deletions: number;
  truncated?: boolean;
  filesTruncated?: boolean;
  fileLimit?: number;
  files?: Array<{
    path: string;
    status: "added" | "modified" | "deleted";
    insertions: number;
    deletions: number;
  }>;
}

export interface HermesRunnerRequest {
  prompt: string;
  modelName: string;
  provider: string;
  apiKey: string;
  projectId?: string;
  runId?: string;
  sessionId?: string;
  toolsets?: string;
}

export interface HermesRunnerResult extends Pick<HermesGatewayTurnResult, "gatewaySessionId" | "gatewayEvents" | "pendingGatewayRequest" | "fallbackToOneShot"> {
  ok: boolean;
  message: string;
  output: string;
  workspacePath?: string;
  sessionId?: string;
  changeSummary?: HermesWorkspaceChangeSummary;
}

export const runLocalHermesTurn = async (request: HermesRunnerRequest): Promise<HermesRunnerResult> => {
  return runHermesGatewayTurn({
    prompt: request.prompt,
    modelName: request.modelName,
    provider: request.provider,
    apiKey: request.apiKey,
    projectId: request.projectId,
    runId: request.runId,
    sessionId: request.sessionId,
    gatewaySessionId: request.sessionId,
    toolsets: request.toolsets,
  });
};
