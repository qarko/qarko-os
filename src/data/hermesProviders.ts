export type HermesAuthType = "api-key" | "oauth" | "custom-endpoint";

export interface HermesModelOption {
  id: string;
  label: string;
  note?: string;
  recommended?: boolean;
}

export interface HermesProviderOption {
  id: string;
  hermesProviderId: string;
  label: string;
  authType: HermesAuthType;
  defaultModel: string;
  defaultEndpoint: string;
  keyLabel?: string;
  summary: string;
  setupHint: string;
  modelOptions: HermesModelOption[];
}

const openAiModels: HermesModelOption[] = [
  { id: "gpt-5.4", label: "GPT-5.4", note: "품질 우선", recommended: true },
  { id: "gpt-5.4-mini", label: "GPT-5.4 Mini", note: "빠른 작업" },
  { id: "gpt-5-mini", label: "GPT-5 Mini", note: "저비용" },
  { id: "gpt-5.3-codex", label: "GPT-5.3 Codex", note: "개발 작업" },
  { id: "gpt-5.2-codex", label: "GPT-5.2 Codex", note: "코딩 보조" },
  { id: "gpt-4.1", label: "GPT-4.1", note: "안정형" },
  { id: "gpt-4o", label: "GPT-4o", note: "범용" },
  { id: "gpt-4o-mini", label: "GPT-4o Mini", note: "가벼운 작업" },
];

const openAiCodexModels: HermesModelOption[] = [
  { id: "gpt-5.5", label: "GPT-5.5", note: "최신 고성능", recommended: true },
  { id: "gpt-5.4", label: "GPT-5.4", note: "품질 우선" },
  { id: "gpt-5.4-mini", label: "GPT-5.4 Mini", note: "빠른 작업" },
  { id: "gpt-5.3-codex", label: "GPT-5.3 Codex", note: "개발 작업" },
  { id: "gpt-5.3-codex-spark", label: "GPT-5.3 Codex Spark", note: "빠른 코딩" },
  { id: "gpt-5.2-codex", label: "GPT-5.2 Codex", note: "안정형" },
  { id: "gpt-5.1-codex-max", label: "GPT-5.1 Codex Max", note: "대형 작업" },
  { id: "gpt-5.1-codex-mini", label: "GPT-5.1 Codex Mini", note: "저비용" },
];

export const hermesProviderOptions: HermesProviderOption[] = [
  {
    id: "openai-codex",
    hermesProviderId: "openai-codex",
    label: "OpenAI Codex OAuth",
    authType: "oauth",
    defaultModel: "gpt-5.5",
    defaultEndpoint: "",
    summary: "ChatGPT/Codex 계정으로 브라우저 인증 후 Hermes를 사용합니다.",
    setupHint: "API 키를 붙여넣지 않습니다. 로그인 버튼을 누르면 브라우저 인증이 열리고, 완료 후 사용할 모델을 선택합니다.",
    modelOptions: openAiCodexModels,
  },
  {
    id: "openai",
    hermesProviderId: "openai",
    label: "OpenAI API",
    authType: "api-key",
    defaultModel: "gpt-5.4",
    defaultEndpoint: "https://api.openai.com/v1",
    keyLabel: "OpenAI API Key",
    summary: "OpenAI Platform API 키로 GPT 계열 모델을 사용합니다.",
    setupHint: "OpenAI Platform에서 발급한 API 키를 입력합니다. ChatGPT 로그인과는 별도입니다.",
    modelOptions: openAiModels,
  },
  {
    id: "openrouter",
    hermesProviderId: "openrouter",
    label: "OpenRouter",
    authType: "api-key",
    defaultModel: "openrouter/anthropic/claude-sonnet-4.5",
    defaultEndpoint: "https://openrouter.ai/api/v1",
    keyLabel: "OpenRouter API Key",
    summary: "여러 모델을 한 계정에서 바꿔 쓰기 좋습니다.",
    setupHint: "OpenRouter에서 발급한 sk-or- 키를 입력합니다.",
    modelOptions: [
      { id: "openrouter/anthropic/claude-sonnet-4.5", label: "Claude Sonnet 4.5", note: "기획/문서", recommended: true },
      { id: "openrouter/openai/gpt-5.4", label: "OpenAI GPT-5.4", note: "범용" },
      { id: "openrouter/openai/gpt-5.4-mini", label: "OpenAI GPT-5.4 Mini", note: "빠른 작업" },
      { id: "openrouter/google/gemini-3-pro-preview", label: "Gemini 3 Pro", note: "리서치" },
    ],
  },
  {
    id: "anthropic",
    hermesProviderId: "anthropic",
    label: "Anthropic / Claude",
    authType: "api-key",
    defaultModel: "anthropic/claude-sonnet-4.5",
    defaultEndpoint: "https://api.anthropic.com",
    keyLabel: "Anthropic API Key",
    summary: "Claude API 키를 직접 연결하는 환경에 맞습니다.",
    setupHint: "Anthropic Console에서 발급한 API 키를 입력합니다.",
    modelOptions: [
      { id: "anthropic/claude-sonnet-4.5", label: "Claude Sonnet 4.5", note: "균형형", recommended: true },
      { id: "anthropic/claude-opus-4.1", label: "Claude Opus 4.1", note: "고난도 작업" },
      { id: "anthropic/claude-haiku-4.5", label: "Claude Haiku 4.5", note: "빠른 작업" },
    ],
  },
  {
    id: "nous",
    hermesProviderId: "nous",
    label: "Nous Portal",
    authType: "oauth",
    defaultModel: "nous/hermes-4",
    defaultEndpoint: "",
    summary: "Nous 계정 OAuth 로그인으로 사용하는 흐름입니다.",
    setupHint: "QARKO OS가 Hermes 인증 과정을 시작하고 완료 여부를 안내합니다.",
    modelOptions: [
      { id: "nous/hermes-4", label: "Hermes 4", note: "Nous 기본", recommended: true },
      { id: "nous/hermes-3", label: "Hermes 3", note: "호환성" },
    ],
  },
  {
    id: "deepseek",
    hermesProviderId: "deepseek",
    label: "DeepSeek",
    authType: "api-key",
    defaultModel: "deepseek/deepseek-chat",
    defaultEndpoint: "https://api.deepseek.com/v1",
    keyLabel: "DeepSeek API Key",
    summary: "DeepSeek API 키로 모델을 사용합니다.",
    setupHint: "DeepSeek에서 발급한 API 키를 입력합니다.",
    modelOptions: [
      { id: "deepseek/deepseek-chat", label: "DeepSeek Chat", note: "범용", recommended: true },
      { id: "deepseek/deepseek-reasoner", label: "DeepSeek Reasoner", note: "추론" },
    ],
  },
  {
    id: "google",
    hermesProviderId: "gemini",
    label: "Google Gemini",
    authType: "api-key",
    defaultModel: "google/gemini-2.5-pro",
    defaultEndpoint: "https://generativelanguage.googleapis.com/v1beta/openai",
    keyLabel: "Google/Gemini API Key",
    summary: "Google AI Studio API 키를 사용하는 흐름입니다.",
    setupHint: "Google AI Studio에서 발급한 API 키를 입력합니다.",
    modelOptions: [
      { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro", note: "고품질", recommended: true },
      { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash", note: "빠른 작업" },
      { id: "google/gemini-2.0-flash", label: "Gemini 2.0 Flash", note: "저비용" },
    ],
  },
  {
    id: "custom",
    hermesProviderId: "custom",
    label: "Custom OpenAI-compatible",
    authType: "custom-endpoint",
    defaultModel: "local-model",
    defaultEndpoint: "http://localhost:11434/v1",
    keyLabel: "API Key",
    summary: "Ollama, LM Studio, vLLM 같은 OpenAI 호환 엔드포인트를 연결합니다.",
    setupHint: "Base URL과 모델명을 직접 입력합니다. API 키가 없으면 비워둘 수 있습니다.",
    modelOptions: [
      { id: "local-model", label: "local-model", note: "직접 수정", recommended: true },
      { id: "llama3.1", label: "llama3.1", note: "Ollama 예시" },
      { id: "qwen2.5-coder", label: "qwen2.5-coder", note: "로컬 코딩 모델" },
    ],
  },
];

export const getHermesProviderOption = (providerId: string) =>
  hermesProviderOptions.find((option) => option.id === providerId) ?? hermesProviderOptions[0];

export const getHermesModelOptions = (providerId: string) => getHermesProviderOption(providerId).modelOptions;
