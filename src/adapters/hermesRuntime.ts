import type { HermesConnection, HermesConnectionResult } from "../types/qarko";

type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

const normalizeEndpoint = (endpoint: string) => {
  const trimmed = endpoint.trim();
  if (!trimmed) return "";
  return trimmed.replace(/\/+$/, "");
};

const readResponseMessage = async (response: Response) => {
  const text = await response.text();
  if (!text) return response.statusText || "요청에 실패했습니다.";

  try {
    const body = JSON.parse(text);
    if (typeof body.error?.message === "string") return body.error.message;
    if (typeof body.message === "string") return body.message;
    if (typeof body.error === "string") return body.error;
  } catch {
    return text;
  }

  return text;
};

export const testHermesConnection = async (
  connection: HermesConnection,
  fetcher: FetchLike = fetch
): Promise<HermesConnectionResult> => {
  const endpoint = normalizeEndpoint(connection.endpoint);
  if (!endpoint) {
    return {
      status: "error",
      message: "Hermes API 주소를 입력하세요.",
      availableModels: [],
    };
  }

  try {
    const headers: Record<string, string> = {
      accept: "application/json",
    };
    if (connection.apiKey.trim()) {
      headers.authorization = `Bearer ${connection.apiKey.trim()}`;
    }

    const response = await fetcher(`${endpoint}/models`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const message = await readResponseMessage(response);
      return {
        status: "error",
        message: `Hermes 연결 실패 (${response.status}): ${message}`,
        availableModels: [],
      };
    }

    const body = await response.json();
    const availableModels = Array.isArray(body.data)
      ? body.data.map((model: { id?: unknown }) => model.id).filter((id: unknown): id is string => typeof id === "string")
      : [];
    const configuredModel = connection.modelName.trim();

    if (configuredModel && availableModels.length > 0 && !availableModels.includes(configuredModel)) {
      return {
        status: "error",
        message: `설정한 모델 "${configuredModel}"을 Hermes 모델 목록에서 찾지 못했습니다.`,
        availableModels,
      };
    }

    return {
      status: "connected",
      message: availableModels.length > 0 ? "Hermes 연결이 확인되었습니다." : "Hermes 응답은 받았지만 모델 목록이 비어 있습니다.",
      modelName: configuredModel || availableModels[0] || "Hermes",
      availableModels,
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Hermes 연결 중 알 수 없는 오류가 발생했습니다.",
      availableModels: [],
    };
  }
};
