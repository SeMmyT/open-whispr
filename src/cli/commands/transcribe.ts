import type { Command } from "commander";
import { transcribe } from "../../core/transcription/index.js";
import { Scanner } from "../../core/scanner/index.js";
import { ok, fail, info, warn } from "../output.js";
import chalk from "chalk";
import fs from "fs";

const SUPPORTED_FORMATS = [".wav", ".mp3", ".m4a", ".ogg", ".webm", ".flac", ".aac"];

export function registerTranscribeCommand(program: Command): void {
  program
    .command("transcribe <file>")
    .description("Transcribe an audio file")
    .option("-m, --model <model>", "Whisper model to use (tiny, base, small, medium, large, turbo)")
    .option("-l, --language <lang>", "Language code (e.g. en, fr, de, auto)")
    .option("-p, --provider <provider>", "Provider: local, openai, groq")
    .addHelpText(
      "after",
      `
Examples:
  $ rw transcribe recording.wav                 Transcribe with defaults
  $ rw transcribe meeting.mp3 -m small -l en    Use small model, English
  $ rw transcribe call.m4a -p openai            Use OpenAI cloud API

Supported formats: ${SUPPORTED_FORMATS.join(", ")}`,
    )
    .action(
      async (
        file: string,
        opts: { model?: string; language?: string; provider?: string },
      ) => {
        if (!fs.existsSync(file)) {
          fail(`File not found: ${file}`);
          process.exit(1);
        }

        const ext = "." + file.split(".").pop()?.toLowerCase();
        if (!SUPPORTED_FORMATS.includes(ext)) {
          warn(`Unrecognized format: ${ext}`);
          info(`Supported: ${SUPPORTED_FORMATS.join(", ")}`);
          info("Attempting anyway — ffmpeg may handle it.");
        }

        // Pre-flight check for local mode
        if (!opts.provider || opts.provider === "local") {
          const scanner = new Scanner();
          const [ffmpeg, whisper] = await Promise.all([
            scanner.checkFfmpeg(),
            scanner.checkWhisperCpp(),
          ]);

          if (!ffmpeg.available && ext !== ".wav") {
            fail("ffmpeg required for non-WAV files but not found");
            info(`  Install: ${chalk.cyan(process.platform === "darwin" ? "brew install ffmpeg" : "sudo apt install ffmpeg")}`);
            info(`  Or use cloud: ${chalk.cyan("rw transcribe " + file + " -p openai")}`);
            process.exit(1);
          }

          if (!whisper.available && (!opts.provider || opts.provider === "local")) {
            fail("whisper-cpp not found for local transcription");
            info(`  Run ${chalk.cyan("rw scan")} to check system readiness`);
            info(`  Or use cloud: ${chalk.cyan("rw transcribe " + file + " -p openai")}`);
            process.exit(1);
          }
        }

        info(`Transcribing ${file}...`);
        try {
          const result = await transcribe(file, {
            model: opts.model,
            language: opts.language,
            provider: opts.provider as "local" | "openai" | "groq",
          });
          ok("Done");
          console.log(result.text);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          fail(message);
          if (message.includes("API key")) {
            info(`  Set your key: ${chalk.cyan("rw config set-secret openaiApiKey sk-...")}`);
          }
          process.exit(1);
        }
      },
    );
}
