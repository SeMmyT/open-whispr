import { describe, it, expect } from "vitest";
import { Scanner } from "@core/scanner";

describe("Scanner", () => {
  it("checks ffmpeg availability", async () => {
    const scanner = new Scanner();
    const result = await scanner.checkFfmpeg();
    expect(result).toHaveProperty("available");
    expect(typeof result.available).toBe("boolean");
  });

  it("checks whisper-cpp availability", async () => {
    const scanner = new Scanner();
    const result = await scanner.checkWhisperCpp();
    expect(result).toHaveProperty("available");
    expect(typeof result.available).toBe("boolean");
  });

  it("returns full scan result", async () => {
    const scanner = new Scanner();
    const result = await scanner.scan();
    expect(result).toHaveProperty("whisperCpp");
    expect(result).toHaveProperty("ffmpeg");
    expect(result).toHaveProperty("models");
    expect(result).toHaveProperty("config");
  });
});
