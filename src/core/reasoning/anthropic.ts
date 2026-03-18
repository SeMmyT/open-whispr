import { API_ENDPOINTS, TIMEOUTS } from "../../shared/constants.js";
import { createLogger } from "../logger/index.js";
import {
  type ReasoningConfig,
  type ReasoningResponse,
  SYSTEM_PROMPT,
  buildUserPrompt,
} from "./types.js";

const log = createLogger("reasoning-anthropic", "warn");

export async function reasonWithAnthropic(
  text: string,
  config: ReasoningConfig,
): Promise<ReasoningResponse> {
  const url = config.baseUrl || API_ENDPOINTS.ANTHROPIC;
  const userPrompt = buildUserPrompt(text, config.agentName);

  const body = {
    model: config.model,
    max_tokens: config.maxTokens || 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUTS.INFERENCE),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${errBody}`);
  }

  const data = (await response.json()) as {
    content: Array<{ type: string; text: string }>;
  };
  const resultText =
    data.content
      ?.filter((c) => c.type === "text")
      .map((c) => c.text)
      .join("") || "";

  log.debug({ model: config.model }, "Anthropic response");
  return {
    text: resultText.trim(),
    provider: "anthropic",
    model: config.model,
  };
}
