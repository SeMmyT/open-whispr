import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import { paths } from "../config/paths.js";
import { createLogger } from "../logger/index.js";
import { TIMEOUTS } from "../../shared/constants.js";
import type {
  TranscriptionResult,
  TranscriptionOptions,
} from "../../shared/types.js";

const execFileAsync = promisify(execFile);
const log = createLogger("whisper-cpp", "warn");

export class WhisperCpp {
  private binaryPath: string;

  constructor(binaryPath: string) {
    this.binaryPath = binaryPath;
  }

  buildArgs(audioPath: string, options: TranscriptionOptions): string[] {
    const modelName = options.model || "base";
    const modelPath = path.join(
      paths.whisperModels,
      `ggml-${modelName}.bin`,
    );

    const args = ["-m", modelPath, "-f", audioPath, "-oj", "--no-prints"];

    if (options.language && options.language !== "auto") {
      args.push("-l", options.language);
    }

    if (options.translate) {
      args.push("-tr");
    }

    return args;
  }

  parseOutput(raw: string): TranscriptionResult {
    const data = JSON.parse(raw) as {
      transcription?: Array<{
        timestamps?: { from?: string; to?: string };
        text: string;
      }>;
    };
    const segments = data.transcription || [];
    const text = segments
      .map((s) => s.text)
      .join("")
      .trim();
    return {
      text,
      segments: segments.map((s) => ({
        start: this.parseTimestamp(s.timestamps?.from),
        end: this.parseTimestamp(s.timestamps?.to),
        text: s.text.trim(),
      })),
    };
  }

  async transcribe(
    audioPath: string,
    options: TranscriptionOptions,
  ): Promise<TranscriptionResult> {
    const args = this.buildArgs(audioPath, options);
    log.debug({ binaryPath: this.binaryPath, args }, "Running whisper-cpp");

    const { stdout } = await execFileAsync(this.binaryPath, args, {
      timeout: TIMEOUTS.TRANSCRIPTION,
      maxBuffer: 10 * 1024 * 1024,
    });

    return this.parseOutput(stdout);
  }

  private parseTimestamp(ts?: string): number {
    if (!ts) return 0;
    const parts = ts.split(":").map(Number);
    return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
  }
}
