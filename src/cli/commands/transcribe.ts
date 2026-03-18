import type { Command } from "commander";
import { transcribe } from "../../core/transcription/index.js";
import { ok, fail, info } from "../output.js";
import fs from "fs";

export function registerTranscribeCommand(program: Command): void {
  program
    .command("transcribe <file>")
    .description("Transcribe an audio file")
    .option("-m, --model <model>", "Whisper model to use")
    .option("-l, --language <lang>", "Language code (e.g. en, fr, auto)")
    .option("-p, --provider <provider>", "Provider: local, openai, groq")
    .action(
      async (
        file: string,
        opts: { model?: string; language?: string; provider?: string },
      ) => {
        if (!fs.existsSync(file)) {
          fail(`File not found: ${file}`);
          process.exit(1);
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
          process.exit(1);
        }
      },
    );
}
