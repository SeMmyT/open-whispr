import { describe, it, expect } from "vitest";
import { ModelRegistry } from "@core/models/registry";

describe("ModelRegistry", () => {
  const registry = new ModelRegistry();

  it("lists whisper models", () => {
    const models = registry.getWhisperModels();
    expect(models.length).toBeGreaterThan(0);
    expect(models.find((m) => m.id === "base")).toBeDefined();
    expect(models.find((m) => m.id === "tiny")).toBeDefined();
  });

  it("gets a specific whisper model", () => {
    const model = registry.getWhisperModel("base");
    expect(model).toBeDefined();
    expect(model!.name).toBe("Base");
    expect(model!.sizeMb).toBe(74);
  });

  it("returns undefined for unknown whisper model", () => {
    const model = registry.getWhisperModel("nonexistent");
    expect(model).toBeUndefined();
  });

  it("lists cloud providers", () => {
    const providers = registry.getCloudProviders();
    expect(providers.length).toBeGreaterThan(0);
    const openai = providers.find((p) => p.id === "openai");
    expect(openai).toBeDefined();
    expect(openai!.models.length).toBeGreaterThan(0);
  });

  it("lists local models across all providers", () => {
    const models = registry.getLocalModels();
    expect(models.length).toBeGreaterThan(0);
    expect(models[0]).toHaveProperty("providerId");
    expect(models[0]).toHaveProperty("hfRepo");
  });

  it("finds whisper model by ID", () => {
    const found = registry.findModel("base");
    expect(found).toBeDefined();
    expect(found!.type).toBe("whisper");
  });

  it("finds local model by ID", () => {
    const localModels = registry.getLocalModels();
    if (localModels.length === 0) return;
    const found = registry.findModel(localModels[0].id);
    expect(found).toBeDefined();
    expect(found!.type).toBe("local");
  });

  it("returns undefined for unknown model", () => {
    expect(registry.findModel("does-not-exist")).toBeUndefined();
  });

  it("builds whisper download URL", () => {
    const url = registry.getWhisperDownloadUrl("base");
    expect(url).toContain("huggingface.co");
    expect(url).toContain("ggml-base.bin");
  });

  it("builds local model download URL", () => {
    const models = registry.getLocalModels();
    if (models.length === 0) return;
    const url = registry.getLocalDownloadUrl(models[0]);
    expect(url).toContain("huggingface.co");
    expect(url).toContain(models[0].fileName);
  });
});
