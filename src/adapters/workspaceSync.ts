import type { FeedbackEntry, WorkspaceSnapshot } from "../types/qarko";

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");
const productionApiEndpoint = "https://qarko-os-production.up.railway.app/api";

const isRelativeApiSafe = () => {
  if (typeof window === "undefined") return true;

  const host = window.location.host;
  return host.startsWith("127.0.0.1") || host.startsWith("localhost") || host.endsWith(".railway.app");
};

export const getDefaultSyncEndpoint = () => {
  const envEndpoint = import.meta.env.VITE_QARKO_API_URL;
  if (typeof envEndpoint === "string" && envEndpoint.trim()) return envEndpoint.trim();

  return isRelativeApiSafe() ? "/api" : productionApiEndpoint;
};

const normalizeEndpoint = (endpoint: string) => {
  const value = endpoint.trim() || "/api";
  return value === "/api" && !isRelativeApiSafe() ? productionApiEndpoint : value;
};

const makeApiUrl = (endpoint: string, path: string) => {
  const base = trimTrailingSlash(normalizeEndpoint(endpoint));
  return `${base}${path}`;
};

const readJsonResponse = async <T>(response: Response): Promise<T> => {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof body.error === "string" ? body.error : `HTTP ${response.status}`;
    throw new Error(message);
  }
  return body as T;
};

export const loadWorkspaceSnapshot = async (endpoint: string): Promise<WorkspaceSnapshot> => {
  const response = await fetch(makeApiUrl(endpoint, "/workspace"), {
    method: "GET",
    headers: { accept: "application/json" },
  });
  return readJsonResponse<WorkspaceSnapshot>(response);
};

export const saveWorkspaceSnapshot = async (
  endpoint: string,
  snapshot: WorkspaceSnapshot
): Promise<WorkspaceSnapshot> => {
  const response = await fetch(makeApiUrl(endpoint, "/workspace"), {
    method: "PUT",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify(snapshot),
  });
  return readJsonResponse<WorkspaceSnapshot>(response);
};

export const loadFeedbackEntries = async (endpoint: string): Promise<FeedbackEntry[]> => {
  const response = await fetch(makeApiUrl(endpoint, "/feedback"), {
    method: "GET",
    headers: { accept: "application/json" },
  });
  const body = await readJsonResponse<{ feedback: FeedbackEntry[] }>(response);
  return body.feedback;
};

export const sendFeedbackEntries = async (
  endpoint: string,
  feedback: FeedbackEntry[]
): Promise<FeedbackEntry[]> => {
  const response = await fetch(makeApiUrl(endpoint, "/feedback"), {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify({ feedback }),
  });
  const body = await readJsonResponse<{ feedback: FeedbackEntry[] }>(response);
  return body.feedback;
};
