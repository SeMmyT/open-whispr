import type { Command } from "commander";
import { Scanner } from "../../core/scanner/index.js";
import { ok, fail } from "../output.js";

export function registerScanCommand(program: Command): void {
  program
    .command("scan")
    .description("Check system readiness (binaries, models, permissions)")
    .action(async () => {
      const scanner = new Scanner();
      const result = await scanner.scan();

      console.log("\nSystem scan:\n");

      if (result.ffmpeg.available) ok("ffmpeg found");
      else fail("ffmpeg not found — install with: brew install ffmpeg");

      if (result.whisperCpp.available)
        ok(`whisper-cpp found at ${result.whisperCpp.path}`);
      else fail("whisper-cpp not found — run: rw models pull base");

      const models = result.models.downloaded;
      if (models.length > 0) ok(`${models.length} model(s): ${models.join(", ")}`);
      else fail("No models downloaded — run: rw models pull base");

      console.log();
    });
}
