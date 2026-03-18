import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ConfigStore } from "@core/config/store";
import fs from "fs";
import path from "path";
import os from "os";

describe("ConfigStore", () => {
  let tmpDir: string;
  let store: ConfigStore;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "rw-test-"));
    store = new ConfigStore(path.join(tmpDir, "config.json"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns defaults when no config file exists", () => {
    const config = store.getAll();
    expect(config.language).toBe("auto");
    expect(config.useLocalWhisper).toBe(true);
    expect(config.whisperModel).toBe("base");
  });

  it("gets and sets individual values", () => {
    store.set("language", "en");
    expect(store.get("language")).toBe("en");
  });

  it("persists to disk", () => {
    store.set("language", "fr");
    const store2 = new ConfigStore(path.join(tmpDir, "config.json"));
    expect(store2.get("language")).toBe("fr");
  });

  it("validates known keys", () => {
    expect(() =>
      store.set("whisperModel", "invalid-model" as never),
    ).toThrow();
  });

  it("stores API keys separately from config", () => {
    store.set("language", "en"); // create config.json first
    store.setSecret("openaiApiKey", "sk-test123");
    expect(store.getSecret("openaiApiKey")).toBe("sk-test123");
    const raw = JSON.parse(
      fs.readFileSync(path.join(tmpDir, "config.json"), "utf-8"),
    );
    expect(raw.openaiApiKey).toBeUndefined();
  });
});
