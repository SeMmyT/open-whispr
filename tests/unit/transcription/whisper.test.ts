import { describe, it, expect } from "vitest";
import { WhisperCpp } from "@core/transcription/whisper";

describe("WhisperCpp", () => {
  const whisper = new WhisperCpp("/usr/bin/whisper-cpp");

  it("builds correct CLI arguments", () => {
    const args = whisper.buildArgs("/tmp/audio.wav", {
      model: "base",
      language: "en",
    });

    expect(args).toContain("-m");
    expect(args).toContain("-l");
    expect(args).toContain("en");
    expect(args).toContain("-oj");
    expect(args).toContain("-f");
    expect(args).toContain("/tmp/audio.wav");
  });

  it("includes translate flag when requested", () => {
    const args = whisper.buildArgs("/tmp/audio.wav", {
      model: "base",
      translate: true,
    });
    expect(args).toContain("-tr");
  });

  it("omits language flag for auto detection", () => {
    const args = whisper.buildArgs("/tmp/audio.wav", {
      model: "base",
      language: "auto",
    });
    expect(args).not.toContain("-l");
  });

  it("parses whisper JSON output", () => {
    const raw = JSON.stringify({
      transcription: [
        {
          timestamps: { from: "00:00:00", to: "00:00:05" },
          text: " Hello world",
        },
        {
          timestamps: { from: "00:00:05", to: "00:00:08" },
          text: " how are you",
        },
      ],
    });
    const result = whisper.parseOutput(raw);
    expect(result.text).toBe("Hello world how are you");
    expect(result.segments).toHaveLength(2);
    expect(result.segments![0].start).toBe(0);
    expect(result.segments![0].end).toBe(5);
    expect(result.segments![1].text).toBe("how are you");
  });

  it("handles empty transcription output", () => {
    const raw = JSON.stringify({ transcription: [] });
    const result = whisper.parseOutput(raw);
    expect(result.text).toBe("");
    expect(result.segments).toHaveLength(0);
  });
});
