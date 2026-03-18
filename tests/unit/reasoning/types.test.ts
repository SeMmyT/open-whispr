import { describe, it, expect } from "vitest";
import { buildUserPrompt, SYSTEM_PROMPT } from "@core/reasoning/types";

describe("Reasoning types", () => {
  it("has a system prompt", () => {
    expect(SYSTEM_PROMPT).toContain("dictation");
    expect(SYSTEM_PROMPT.length).toBeGreaterThan(10);
  });

  it("builds user prompt without agent name", () => {
    const prompt = buildUserPrompt("hello world");
    expect(prompt).toContain("hello world");
    expect(prompt).not.toContain("agentName");
  });

  it("builds user prompt with agent name", () => {
    const prompt = buildUserPrompt("hello world", "Jarvis");
    expect(prompt).toContain("Jarvis");
    expect(prompt).toContain("hello world");
    expect(prompt).toContain("removing any reference to your name");
  });
});
