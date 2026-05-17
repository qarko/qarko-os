import type { WorkspaceSnapshot } from "../types/qarko";

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

export const getDefaultSyncEndpoint = () => {
  const envEndpoint = import.meta.env.VITE_QARKO_API_URL;
  return typeof envEndpoint === "string" && envEndpoint.trim() ? envEndpoint.trim() : "/api";
};

const makeApiUrl = (endpoint: string, path: string) => {
  const base = trimTrailingSlash(endpoint.trim() || "/api");
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
