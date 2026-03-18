export interface ReasoningConfig {
  apiKey: string;
  model: string;
  agentName?: string;
  temperature?: number;
  maxTokens?: number;
  baseUrl?: string;
}

export interface ReasoningResponse {
  text: string;
  provider: string;
  model: string;
  tokensUsed?: number;
}

export const SYSTEM_PROMPT =
  "You are a dictation assistant. Clean up text by fixing grammar and punctuation. Output ONLY the cleaned text without any explanations, options, or commentary.";

export function buildUserPrompt(
  text: string,
  agentName?: string,
): string {
  if (agentName) {
    return `You are ${agentName}, a helpful AI assistant. Process and improve the following text, removing any reference to your name from the output:\n\n${text}\n\nImproved text:`;
  }
  return `Process and improve the following text:\n\n${text}\n\nImproved text:`;
}
