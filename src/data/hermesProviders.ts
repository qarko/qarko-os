export type HermesAuthType = "api-key" | "oauth" | "custom-endpoint";

export interface HermesProviderOption {
  id: string;
  label: string;
  authType: HermesAuthType;
  defaultModel: string;
  defaultEndpoint: string;
  keyLabel?: string;
  summary: string;
  setupHint: string;
}

export const hermesProviderOptions: HermesProviderOption[] = [
  {
    id: "openrouter",
    label: "OpenRouter",
    authType: "api-key",
    defaultModel: "openrouter/anthropic/claude-sonnet-4.5",
    defaultEndpoint: "https://openrouter.ai/api/v1",
    keyLabel: "OpenRouter API Key",
    summary: "여러 모델을 한 계정에서 바꿔 쓰기 좋습니다.",
    setupHint: "OpenRouter에서 발급한 sk-or- 키를 입력하세요.",
  },
  {
    id: "anthropic",
    label: "Anthropic / Claude",
    authType: "api-key",
    defaultModel: "anthropic/claude-sonnet-4.5",
    defaultEndpoint: "https://api.anthropic.com",
    keyLabel: "Anthropic API Key",
    summary: "Claude API 키를 직접 연결하는 환경에 맞습니다.",
    setupHint: "Anthropic Console에서 발급한 API 키를 입력하세요.",
  },
  {
    id: "openai",
    label: "OpenAI API",
    authType: "api-key",
    defaultModel: "openai/gpt-4.1",
    defaultEndpoint: "https://api.openai.com/v1",
    keyLabel: "OpenAI API Key",
    summary: "OpenAI API 키로 GPT 계열 모델을 사용합니다.",
    setupHint: "OpenAI Platform API 키를 입력하세요. ChatGPT 로그인과는 별도입니다.",
  },
  {
    id: "nous",
    label: "Nous Portal",
    authType: "oauth",
    defaultModel: "nous/hermes-4",
    defaultEndpoint: "",
    summary: "Nous 계정 OAuth 로그인으로 사용하는 흐름입니다.",
    setupHint: "QARKO OS가 Hermes 로그인 과정을 시작하고 완료 여부를 안내합니다.",
  },
  {
    id: "openai-codex",
    label: "OpenAI Codex OAuth",
    authType: "oauth",
    defaultModel: "openai-codex/gpt-5.1-codex",
    defaultEndpoint: "",
    summary: "Codex/ChatGPT 계정 인증을 연결하는 흐름입니다.",
    setupHint: "API 키가 아니라 브라우저 로그인 방식입니다.",
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    authType: "api-key",
    defaultModel: "deepseek/deepseek-chat",
    defaultEndpoint: "https://api.deepseek.com/v1",
    keyLabel: "DeepSeek API Key",
    summary: "DeepSeek API 키로 모델을 사용합니다.",
    setupHint: "DeepSeek에서 발급한 API 키를 입력하세요.",
  },
  {
    id: "google",
    label: "Google Gemini",
    authType: "api-key",
    defaultModel: "google/gemini-2.5-pro",
    defaultEndpoint: "https://generativelanguage.googleapis.com/v1beta/openai",
    keyLabel: "Google/Gemini API Key",
    summary: "Google AI Studio API 키를 사용하는 흐름입니다.",
    setupHint: "Google AI Studio에서 발급한 API 키를 입력하세요.",
  },
  {
    id: "custom",
    label: "Custom OpenAI-compatible",
    authType: "custom-endpoint",
    defaultModel: "local-model",
    defaultEndpoint: "http://localhost:11434/v1",
    keyLabel: "API Key",
    summary: "Ollama, LM Studio, vLLM 같은 OpenAI 호환 엔드포인트를 연결합니다.",
    setupHint: "Base URL과 모델명을 직접 입력하세요. 키가 없으면 비워둘 수 있습니다.",
  },
];

export const getHermesProviderOption = (providerId: string) =>
  hermesProviderOptions.find((option) => option.id === providerId) ?? hermesProviderOptions[0];
