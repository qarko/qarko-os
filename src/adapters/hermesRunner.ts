import { runHermesWorkbenchStep } from "./hermesDesktop";

export interface HermesRunnerRequest {
  prompt: string;
  modelName: string;
  provider: string;
  apiKey: string;
  projectId: string;
  runId: string;
  sessionId?: string;
  toolsets?: string;
}

export interface HermesRunnerResult {
  ok: boolean;
  message: string;
  output: string;
  workspacePath?: string;
  sessionId?: string;
}

export const runLocalHermesTurn = async (request: HermesRunnerRequest): Promise<HermesRunnerResult> => {
  return runHermesWorkbenchStep({
    prompt: request.prompt,
    modelName: request.modelName,
    provider: request.provider,
    apiKey: request.apiKey,
    projectId: request.projectId,
    runId: request.runId,
    sessionId: request.sessionId,
    toolsets: request.toolsets,
  });
};
