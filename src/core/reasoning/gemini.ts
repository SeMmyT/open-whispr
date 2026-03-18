import { API_ENDPOINTS, TIMEOUTS } from "../../shared/constants.js";
import { createLogger } from "../logger/index.js";
import {
  type ReasoningConfig,
  type ReasoningResponse,
  SYSTEM_PROMPT,
  buildUserPrompt,
} from "./types.js";

const log = createLogger("reasoning-gemini", "warn");

export async function reasonWithGemini(
  text: string,
  config: ReasoningConfig,
): Promise<ReasoningResponse> {
  const baseUrl = config.baseUrl || API_ENDPOINTS.GEMINI;
  const url = `${baseUrl}/models/${config.model}:generateContent?key=${config.apiKey}`;
  const userPrompt = buildUserPrompt(text, config.agentName);

  const body = {
    system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ parts: [{ text: userPrompt }] }],
    generationConfig: {
      temperature: config.temperature ?? 0.3,
      maxOutputTokens: config.maxTokens || 8192,
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUTS.INFERENCE),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errBody}`);
  }

  const data = (await response.json()) as {
    candidates: Array<{
      content: { parts: Array<{ text: string }> };
    }>;
  };
  const resultText =
    data.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";

  log.debug({ model: config.model }, "Gemini response");
  return {
    text: resultText.trim(),
    provider: "gemini",
    model: config.model,
  };
}
