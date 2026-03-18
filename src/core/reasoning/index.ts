import { ConfigStore } from "../config/store.js";
import { paths } from "../config/paths.js";
import { reasonWithOpenAI } from "./openai.js";
import { reasonWithAnthropic } from "./anthropic.js";
import { reasonWithGemini } from "./gemini.js";
import type { ReasoningConfig, ReasoningResponse } from "./types.js";
import type { ReasoningProvider } from "../../shared/types.js";

export type { ReasoningConfig, ReasoningResponse } from "./types.js";

export async function reason(
  text: string,
  options: {
    provider?: ReasoningProvider;
    model?: string;
    agentName?: string;
    temperature?: number;
    maxTokens?: number;
  } = {},
): Promise<ReasoningResponse> {
  const configStore = new ConfigStore(paths.configFile);
  const provider =
    options.provider ||
    (configStore.get("reasoningProvider") as ReasoningProvider);
  const model = options.model || configStore.get("reasoningModel");
  const agentName = options.agentName || configStore.get("agentName") || undefined;

  const keyMap: Record<string, string> = {
    openai: "openaiApiKey",
    anthropic: "anthropicApiKey",
    gemini: "geminiApiKey",
    groq: "groqApiKey",
  };

  const secretKey = keyMap[provider];
  if (!secretKey) throw new Error(`Unsupported provider: ${provider}`);

  const apiKey = configStore.getSecret(secretKey);
  if (!apiKey) {
    throw new Error(
      `No API key for ${provider}. Run: rw config set-secret ${secretKey} <key>`,
    );
  }

  const config: ReasoningConfig = {
    apiKey,
    model,
    agentName,
    temperature: options.temperature,
    maxTokens: options.maxTokens,
  };

  switch (provider) {
    case "openai":
    case "groq":
      if (provider === "groq") {
        config.baseUrl = "https://api.groq.com/openai/v1";
      }
      return reasonWithOpenAI(text, config);
    case "anthropic":
      return reasonWithAnthropic(text, config);
    case "gemini":
      return reasonWithGemini(text, config);
    case "local":
      throw new Error("Local reasoning not yet implemented in CLI");
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}
