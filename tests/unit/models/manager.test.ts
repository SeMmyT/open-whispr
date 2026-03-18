import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ModelManager } from "@core/models/manager";
import fs from "fs";
import path from "path";
import os from "os";

// We can't easily mock paths module, so test what we can without downloads
describe("ModelManager", () => {
  it("lists available models from registry", () => {
    const manager = new ModelManager();
    const available = manager.listAvailable();
    expect(available.length).toBeGreaterThan(0);

    const whisperModels = available.filter((m) => m.type === "whisper");
    expect(whisperModels.length).toBe(6); // tiny, base, small, medium, large, turbo

    const base = whisperModels.find((m) => m.id === "base");
    expect(base).toBeDefined();
    expect(base!.installed).toBe(false); // not installed in test env
  });

  it("lists installed models (empty in test env)", () => {
    const manager = new ModelManager();
    const installed = manager.listInstalled();
    // May or may not have models depending on host — just check shape
    expect(Array.isArray(installed)).toBe(true);
  });

  it("throws for unknown model on pull", async () => {
    const manager = new ModelManager();
    await expect(manager.pull("nonexistent-model")).rejects.toThrow(
      "Unknown model",
    );
  });

  it("returns false when removing non-installed model", () => {
    const manager = new ModelManager();
    expect(manager.remove("nonexistent-model")).toBe(false);
  });
});
