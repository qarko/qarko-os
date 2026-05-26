import { invoke } from "@tauri-apps/api/core";
import type { HermesCommandResult, HermesOneShotRequest } from "./hermesDesktop";
import { hasTauriRuntime, runHermesWorkbenchStep } from "./hermesDesktop";
import type { HermesGatewayEvent, HermesGatewayEventKind, HermesGatewayPendingRequest, Status } from "../types/qarko";
import { redactSensitiveText } from "../utils/redaction";

export interface HermesGatewayTurnRequest extends HermesOneShotRequest {
  gatewaySessionId?: string;
}

export interface HermesGatewayTurnResult extends HermesCommandResult {
  gatewaySessionId?: string;
  gatewayEvents: HermesGatewayEvent[];
  pendingGatewayRequest?: HermesGatewayPendingRequest;
  fallbackToOneShot: boolean;
}

const eventStatusForKind = (kind: HermesGatewayEventKind): Status => {
  if (kind === "error") return "failed";
  if (kind === "approval.request" || kind === "clarify.request" || kind === "sudo.request" || kind === "secret.request") {
    return "needs_approval";
  }
  if (kind === "message.complete" || kind === "tool.complete" || kind === "review.summary") return "completed";
  return "running";
};

const eventTitleForKind = (kind: HermesGatewayEventKind) => {
  if (kind.startsWith("tool.")) return "Tool activity";
  if (kind.startsWith("message.")) return "Hermes message";
  if (kind.startsWith("thinking.") || kind.startsWith("reasoning.")) return "Reasoning";
  if (kind === "approval.request") return "Approval requested";
  if (kind === "clarify.request") return "Clarification requested";
  if (kind === "session.info") return "Session";
  if (kind === "status.update") return "Status";
  return "Hermes Gateway";
};

export const mapGatewayEventToTimeline = (
  kind: HermesGatewayEventKind,
  message: string,
  payload?: unknown,
  id = `gateway-${Date.now()}-${Math.random().toString(16).slice(2)}`
): HermesGatewayEvent => ({
  id,
  kind,
  title: eventTitleForKind(kind),
  message: redactSensitiveText(message),
  status: eventStatusForKind(kind),
  timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
  payload: payload === undefined ? undefined : "[redacted_gateway_payload]",
});

const pendingRequestFromEvents = (events: HermesGatewayEvent[]): HermesGatewayPendingRequest | undefined => {
  const pending = [...events].reverse().find((event) =>
    ["approval.request", "clarify.request", "sudo.request", "secret.request"].includes(event.kind)
  );
  if (!pending) return undefined;
  return {
    id: pending.id,
    kind: pending.kind as HermesGatewayPendingRequest["kind"],
    title: pending.title,
    message: pending.message,
    payload: undefined,
  };
};

const previewGatewayTurn = async (request: HermesGatewayTurnRequest): Promise<HermesGatewayTurnResult> => {
  const events = [
    mapGatewayEventToTimeline("gateway.ready", "Hermes TUI Gateway preview channel is ready."),
    mapGatewayEventToTimeline("session.info", `session.create preview for ${request.projectId ?? "qarko-project"}`),
    mapGatewayEventToTimeline("status.update", "prompt.submit accepted by QARKO Gateway preview."),
    mapGatewayEventToTimeline("tool.progress", "tool.progress: QARKO would stream Hermes tool activity here."),
    mapGatewayEventToTimeline("message.complete", "Browser preview completed without launching Hermes."),
  ];
  return {
    ok: true,
    message: "Hermes Gateway preview completed.",
    output: "QARKO Gateway preview: real desktop builds use Hermes TUI Gateway JSON-RPC before one-shot fallback.",
    workspacePath: "browser-preview://workspace",
    sessionId: request.sessionId,
    gatewaySessionId: request.gatewaySessionId ?? request.sessionId ?? "preview-gateway-session",
    gatewayEvents: events,
    pendingGatewayRequest: pendingRequestFromEvents(events),
    fallbackToOneShot: false,
    changeSummary: { filesChanged: 0, insertions: 0, deletions: 0 },
  };
};

export const runHermesGatewayTurn = async (request: HermesGatewayTurnRequest): Promise<HermesGatewayTurnResult> => {
  if (!hasTauriRuntime()) return previewGatewayTurn(request);
  try {
    const result = await invoke<HermesGatewayTurnResult>("run_hermes_gateway_turn", { request });
    return {
      ...result,
      gatewayEvents: result.gatewayEvents ?? [],
      pendingGatewayRequest: result.pendingGatewayRequest ?? pendingRequestFromEvents(result.gatewayEvents ?? []),
      fallbackToOneShot: result.fallbackToOneShot ?? false,
    };
  } catch (error) {
    return fallbackToOneShot(request, error);
  }
};

export const fallbackToOneShot = async (
  request: HermesGatewayTurnRequest,
  cause?: unknown
): Promise<HermesGatewayTurnResult> => {
  const fallbackStart = mapGatewayEventToTimeline(
    "status.update",
    `Hermes TUI Gateway is unavailable; falling back to one-shot execution. ${cause instanceof Error ? cause.message : ""}`.trim()
  );
  const result = await runHermesWorkbenchStep(request);
  const fallbackDone = mapGatewayEventToTimeline(
    result.ok ? "message.complete" : "error",
    result.ok ? "One-shot fallback completed." : result.message
  );
  const gatewayEvents = [fallbackStart, fallbackDone];
  return {
    ...result,
    gatewaySessionId: request.gatewaySessionId ?? result.sessionId,
    gatewayEvents,
    pendingGatewayRequest: pendingRequestFromEvents(gatewayEvents),
    fallbackToOneShot: true,
  };
};

export const respondToGatewayApproval = async (sessionId: string, requestId: string, approved: boolean) => {
  // command.dispatch and approval.respond remain explicit strings so source tests and future gateway wiring track the RPC contract.
  return invoke("respond_hermes_gateway", {
    request: { sessionId, requestId, method: "approval.respond", approved },
  });
};

export const respondToGatewayClarify = async (sessionId: string, requestId: string, response: string) => {
  return invoke("respond_hermes_gateway", {
    request: { sessionId, requestId, method: "clarify.respond", response },
  });
};

export const interruptGatewaySession = async (sessionId: string) => {
  return invoke("respond_hermes_gateway", {
    request: { sessionId, method: "session.interrupt" },
  });
};

export const steerGatewaySession = async (sessionId: string, prompt: string) => {
  return invoke("respond_hermes_gateway", {
    request: { sessionId, method: "session.steer", prompt },
  });
};
