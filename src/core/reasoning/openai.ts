import { API_ENDPOINTS, TIMEOUTS } from "../../shared/constants.js";
import { createLogger } from "../logger/index.js";
import {
  type ReasoningConfig,
  type ReasoningResponse,
  SYSTEM_PROMPT,
  buildUserPrompt,
} from "./types.js";

const log = createLogger("reasoning-openai", "warn");

export async function reasonWithOpenAI(
  text: string,
  config: ReasoningConfig,
): Promise<ReasoningResponse> {
  const baseUrl = config.baseUrl || API_ENDPOINTS.OPENAI_BASE;
  const userPrompt = buildUserPrompt(text, config.agentName);

  // Try Responses API first, fall back to Chat Completions
  const result =
    (await tryResponsesApi(baseUrl, config, userPrompt)) ??
    (await tryChatCompletions(baseUrl, config, userPrompt));

  if (!result) {
    throw new Error("OpenAI: both Responses and Chat Completions APIs failed");
  }

  return result;
}

async function tryResponsesApi(
  baseUrl: string,
  config: ReasoningConfig,
  userPrompt: string,
): Promise<ReasoningResponse | null> {
  const url = `${baseUrl}/responses`;
  const body: Record<string, unknown> = {
    model: config.model,
    input: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
  };

  // No temperature for GPT-5/o-series
  if (
    !config.model.startsWith("gpt-5") &&
    !config.model.startsWith("o")
  ) {
    body.temperature = config.temperature ?? 0.3;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUTS.INFERENCE),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as {
      output?: Array<{ type: string; content?: Array<{ text: string }> }>;
    };
    const outputItem = data.output?.find(
      (item) => item.type === "message",
    );
    const resultText =
      outputItem?.content?.map((c) => c.text).join("") || "";

    log.debug({ model: config.model, api: "responses" }, "OpenAI response");
    return { text: resultText.trim(), provider: "openai", model: config.model };
  } catch {
    return null;
  }
}

async function tryChatCompletions(
  baseUrl: string,
  config: ReasoningConfig,
  userPrompt: string,
): Promise<ReasoningResponse | null> {
  const url = `${baseUrl}/chat/completions`;
  const body: Record<string, unknown> = {
    model: config.model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    temperature: config.temperature ?? 0.3,
    max_tokens: config.maxTokens || 2048,
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUTS.INFERENCE),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`OpenAI Chat API error ${response.status}: ${errBody}`);
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  const resultText = data.choices?.[0]?.message?.content || "";

  log.debug({ model: config.model, api: "chat" }, "OpenAI response");
  return { text: resultText.trim(), provider: "openai", model: config.model };
}
