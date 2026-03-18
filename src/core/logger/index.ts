import pino from "pino";

const REDACT_PATHS = [
  "apiKey",
  "openaiApiKey",
  "anthropicApiKey",
  "geminiApiKey",
  "groqApiKey",
  "*.apiKey",
  "*.authorization",
  "headers.authorization",
];

export function createLogger(name: string, level?: string) {
  const logLevel =
    level || process.env.REWHISPER_LOG_LEVEL || "info";

  return pino({
    name,
    level: logLevel,
    redact: {
      paths: REDACT_PATHS,
      censor: "[REDACTED]",
    },
    transport:
      process.stdout.isTTY
        ? { target: "pino-pretty", options: { colorize: true } }
        : undefined,
  });
}

export type Logger = ReturnType<typeof createLogger>;
