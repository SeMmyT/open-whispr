import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import { paths } from "../config/paths.js";
import { createLogger } from "../logger/index.js";
import type { ScanResult } from "../../shared/types.js";

const execFileAsync = promisify(execFile);
const log = createLogger("scanner", "warn");

export class Scanner {
  async checkFfmpeg(): Promise<{ available: boolean; path?: string }> {
    try {
      const { stdout } = await execFileAsync("ffmpeg", ["-version"], {
        timeout: 5000,
      });
      const version = stdout.split("\n")[0];
      log.debug({ version }, "ffmpeg found");
      return { available: true, path: "ffmpeg" };
    } catch {
      return { available: false };
    }
  }

  async checkWhisperCpp(): Promise<{
    available: boolean;
    path?: string;
    version?: string;
  }> {
    const bundledPath = this.getBundledWhisperPath();
    if (bundledPath && fs.existsSync(bundledPath)) {
      return { available: true, path: bundledPath };
    }
    try {
      await execFileAsync("whisper-cpp", ["--help"], { timeout: 5000 });
      return { available: true, path: "whisper-cpp" };
    } catch {
      return { available: false };
    }
  }

  async checkModels(): Promise<{ downloaded: string[] }> {
    const modelDir = paths.whisperModels;
    if (!fs.existsSync(modelDir)) return { downloaded: [] };
    const files = fs.readdirSync(modelDir).filter((f) => f.endsWith(".bin"));
    const models = files.map((f) =>
      f.replace("ggml-", "").replace(".bin", ""),
    );
    return { downloaded: models };
  }

  async scan(): Promise<ScanResult> {
    const [whisperCpp, ffmpeg, models] = await Promise.all([
      this.checkWhisperCpp(),
      this.checkFfmpeg(),
      this.checkModels(),
    ]);

    return {
      whisperCpp,
      ffmpeg,
      models,
      permissions: { microphone: true },
      config: { valid: true },
    };
  }

  private getBundledWhisperPath(): string | null {
    const platform =
      process.platform === "darwin"
        ? "macos"
        : process.platform === "win32"
          ? "win"
          : "linux";
    const arch = process.arch === "arm64" ? "arm64" : "x64";
    const ext = process.platform === "win32" ? ".exe" : "";
    const binaryName = `whisper-cpp-${platform}-${arch}${ext}`;
    const bundled = `${process.cwd()}/resources/bin/${binaryName}`;
    return fs.existsSync(bundled) ? bundled : null;
  }
}
