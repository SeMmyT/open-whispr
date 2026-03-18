import { describe, it, expect } from "vitest";
import { AudioConverter } from "@core/audio/converter";
import fs from "fs";
import path from "path";
import os from "os";

describe("AudioConverter", () => {
  const converter = new AudioConverter();

  it("reports ffmpeg availability", async () => {
    const available = await converter.isAvailable();
    expect(typeof available).toBe("boolean");
  });

  it("returns error for missing input file", async () => {
    const result = await converter.toWav16kMono(
      "/tmp/nonexistent.wav",
      "/tmp/out.wav",
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("not found");
  });

  it("converts a minimal WAV file", async () => {
    // Create minimal valid WAV: header + 1600 samples (0.1s at 16kHz)
    const numSamples = 1600;
    const dataSize = numSamples * 2; // 16-bit = 2 bytes per sample
    const header = Buffer.alloc(44 + dataSize);
    header.write("RIFF", 0);
    header.writeUInt32LE(36 + dataSize, 4);
    header.write("WAVE", 8);
    header.write("fmt ", 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20); // PCM
    header.writeUInt16LE(1, 22); // mono
    header.writeUInt32LE(16000, 24); // sample rate
    header.writeUInt32LE(32000, 28); // byte rate
    header.writeUInt16LE(2, 32); // block align
    header.writeUInt16LE(16, 34); // bits per sample
    header.write("data", 36);
    header.writeUInt32LE(dataSize, 40);

    const tmpIn = path.join(os.tmpdir(), `rw-test-in-${Date.now()}.wav`);
    const tmpOut = path.join(os.tmpdir(), `rw-test-out-${Date.now()}.wav`);
    fs.writeFileSync(tmpIn, header);

    try {
      const available = await converter.isAvailable();
      if (!available) return; // skip if no ffmpeg

      const result = await converter.toWav16kMono(tmpIn, tmpOut);
      expect(result.success).toBe(true);
      expect(fs.existsSync(tmpOut)).toBe(true);
    } finally {
      fs.rmSync(tmpIn, { force: true });
      fs.rmSync(tmpOut, { force: true });
    }
  });
});
