import type { FeedbackEntry, WorkspaceSnapshot } from "../types/qarko";

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");
const productionApiEndpoint = "https://qarko-os-production.up.railway.app/api";

const isRelativeApiSafe = () => {
  if (typeof window === "undefined") return true;

  const host = window.location.hostname.toLowerCase();
  return (
    host === "127.0.0.1" ||
    host === "localhost" ||
    host === "qarko-os-production.up.railway.app"
  );
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

export const isTrustedSyncEndpoint = (endpoint: string) => {
  const value = normalizeEndpoint(endpoint);
  if (value === "/api") return true;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (url.protocol === "https:" && host === "qarko-os-production.up.railway.app") return true;
    if (url.protocol === "http:" && (host === "127.0.0.1" || host === "localhost")) return true;
    return false;
  } catch {
    return false;
  }
};

const assertTrustedEndpoint = (endpoint: string) => {
  if (!isTrustedSyncEndpoint(endpoint)) {
    throw new Error("클라우드 동기화 주소는 /api, Railway HTTPS 주소, 또는 로컬 개발 주소만 사용할 수 있습니다.");
  }
};

const makeApiUrl = (endpoint: string, path: string) => {
  assertTrustedEndpoint(endpoint);
  const base = trimTrailingSlash(normalizeEndpoint(endpoint));
  return `${base}${path}`;
};

const makeJsonHeaders = (accessToken?: string) => ({
  accept: "application/json",
  ...(accessToken?.trim() ? { "x-qarko-access-token": accessToken.trim() } : {}),
});

const readJsonResponse = async <T>(response: Response): Promise<T> => {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof body.error === "string" ? body.error : `HTTP ${response.status}`;
    throw new Error(message);
  }
  return body as T;
};

export const loadWorkspaceSnapshot = async (endpoint: string, accessToken?: string): Promise<WorkspaceSnapshot> => {
  const response = await fetch(makeApiUrl(endpoint, "/workspace"), {
    method: "GET",
    headers: makeJsonHeaders(accessToken),
  });
  return readJsonResponse<WorkspaceSnapshot>(response);
};

export const saveWorkspaceSnapshot = async (
  endpoint: string,
  snapshot: WorkspaceSnapshot,
  accessToken?: string
): Promise<WorkspaceSnapshot> => {
  const response = await fetch(makeApiUrl(endpoint, "/workspace"), {
    method: "PUT",
    headers: {
      ...makeJsonHeaders(accessToken),
      "content-type": "application/json",
    },
    body: JSON.stringify(snapshot),
  });
  return readJsonResponse<WorkspaceSnapshot>(response);
};

export const loadFeedbackEntries = async (endpoint: string, accessToken?: string): Promise<FeedbackEntry[]> => {
  const response = await fetch(makeApiUrl(endpoint, "/feedback"), {
    method: "GET",
    headers: makeJsonHeaders(accessToken),
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
  await readJsonResponse<{ ok: boolean; acceptedCount: number }>(response);
  return feedback;
};
