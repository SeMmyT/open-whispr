export interface ReWhisperConfig {
  useLocalWhisper: boolean;
  whisperModel: string;
  language: string;
  reasoningProvider: string;
  reasoningModel: string;
  agentName: string;
  hotkey: string;
  hasCompletedOnboarding: boolean;
}

export const DEFAULTS: ReWhisperConfig = {
  useLocalWhisper: true,
  whisperModel: "base",
  language: "auto",
  reasoningProvider: "openai",
  reasoningModel: "gpt-4.1-mini",
  agentName: "",
  hotkey: "`",
  hasCompletedOnboarding: false,
};

const VALID_WHISPER_MODELS = [
  "tiny",
  "base",
  "small",
  "medium",
  "large",
  "turbo",
];
const VALID_PROVIDERS = ["openai", "anthropic", "gemini", "groq", "local"];

export function validate(key: string, value: unknown): void {
  if (
    key === "whisperModel" &&
    !VALID_WHISPER_MODELS.includes(value as string)
  ) {
    throw new Error(
      `Invalid whisper model: ${value}. Valid: ${VALID_WHISPER_MODELS.join(", ")}`,
    );
  }
  if (
    key === "reasoningProvider" &&
    !VALID_PROVIDERS.includes(value as string)
  ) {
    throw new Error(
      `Invalid provider: ${value}. Valid: ${VALID_PROVIDERS.join(", ")}`,
    );
  }
}
