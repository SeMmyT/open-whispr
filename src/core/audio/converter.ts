import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import { TIMEOUTS } from "../../shared/constants.js";
import { createLogger } from "../logger/index.js";

const execFileAsync = promisify(execFile);
const log = createLogger("audio-converter", "warn");

export class AudioConverter {
  private ffmpegPath: string;

  constructor(ffmpegPath = "ffmpeg") {
    this.ffmpegPath = ffmpegPath;
  }

  async isAvailable(): Promise<boolean> {
    try {
      await execFileAsync(this.ffmpegPath, ["-version"], { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  async toWav16kMono(
    inputPath: string,
    outputPath: string,
  ): Promise<{ success: boolean; error?: string }> {
    if (!fs.existsSync(inputPath)) {
      return { success: false, error: `Input file not found: ${inputPath}` };
    }

    const args = [
      "-i",
      inputPath,
      "-ar",
      "16000",
      "-ac",
      "1",
      "-c:a",
      "pcm_s16le",
      "-y",
      outputPath,
    ];

    try {
      await execFileAsync(this.ffmpegPath, args, { timeout: TIMEOUTS.FFMPEG });
      log.debug({ inputPath, outputPath }, "Converted to 16kHz mono WAV");
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      log.error({ err, inputPath }, "FFmpeg conversion failed");
      return { success: false, error: message };
    }
  }
}
