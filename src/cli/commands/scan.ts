import type { Command } from "commander";
import { Scanner } from "../../core/scanner/index.js";
import { ok, fail, info } from "../output.js";
import chalk from "chalk";

export function registerScanCommand(program: Command): void {
  program
    .command("scan")
    .description("Check system readiness (binaries, models, permissions)")
    .addHelpText(
      "after",
      `
Examples:
  $ rw scan          Check if ffmpeg, whisper-cpp, and models are available`,
    )
    .action(async () => {
      const scanner = new Scanner();
      const result = await scanner.scan();
      let issues = 0;

      console.log("\nSystem scan:\n");

      if (result.ffmpeg.available) {
        ok("ffmpeg found");
      } else {
        issues++;
        fail("ffmpeg not found");
        const hint =
          process.platform === "darwin"
            ? "brew install ffmpeg"
            : process.platform === "win32"
              ? "winget install ffmpeg"
              : "sudo apt install ffmpeg";
        info(`  Install: ${chalk.cyan(hint)}`);
      }

      if (result.whisperCpp.available) {
        ok(`whisper-cpp found at ${result.whisperCpp.path}`);
      } else {
        issues++;
        fail("whisper-cpp not found");
        info(`  Download bundled binary: ${chalk.cyan("pnpm run download:whisper-cpp")}`);
        const hint =
          process.platform === "darwin"
            ? "brew install whisper-cpp"
            : "build from source: https://github.com/ggerganov/whisper.cpp";
        info(`  Or install system-wide: ${chalk.cyan(hint)}`);
      }

      const models = result.models.downloaded;
      if (models.length > 0) {
        ok(`${models.length} model(s): ${models.join(", ")}`);
      } else {
        issues++;
        fail("No whisper models downloaded");
        info(`  Download recommended model: ${chalk.cyan("rw models pull base")}`);
        info(`  See all models: ${chalk.cyan("rw models list")}`);
      }

      console.log();
      if (issues === 0) {
        ok("All checks passed — ready to transcribe");
      } else {
        info(`${issues} issue(s) found. Fix them to enable local transcription.`);
        info(`Cloud transcription (${chalk.cyan("rw transcribe -p openai")}) works without local deps.`);
      }
      console.log();
    });
}
