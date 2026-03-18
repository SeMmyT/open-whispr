export const API_ENDPOINTS = {
  OPENAI_BASE: "https://api.openai.com/v1",
  OPENAI_RESPONSES: "https://api.openai.com/v1/responses",
  OPENAI_TRANSCRIPTION: "https://api.openai.com/v1/audio/transcriptions",
  ANTHROPIC: "https://api.anthropic.com/v1/messages",
  GEMINI: "https://generativelanguage.googleapis.com/v1beta",
  GROQ_BASE: "https://api.groq.com/openai/v1",
} as const;

export const TIMEOUTS = {
  TRANSCRIPTION: 300_000,
  FFMPEG: 30_000,
  QUICK_CHECK: 5_000,
  MODEL_TEST: 5_000,
  INFERENCE: 30_000,
} as const;

export const CACHE_CONFIG = {
  API_KEY_TTL: 3_600_000,
  AVAILABILITY_TTL: 30_000,
} as const;

export const TOKEN_LIMITS = {
  MIN: 100,
  MAX_OPENAI: 2048,
  MAX_ANTHROPIC: 4096,
  MAX_GEMINI: 8192,
  CONTEXT_SIZE: 4096,
} as const;
