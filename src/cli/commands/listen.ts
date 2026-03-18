import type { Command } from "commander";
import { info, ok, fail, warn } from "../output.js";

export function registerListenCommand(program: Command): void {
  program
    .command("listen")
    .description("Start interactive dictation session")
    .option("--no-paste", "Don't auto-paste, just print transcript")
    .option("-m, --model <model>", "Whisper model to use")
    .option("-l, --language <lang>", "Language code")
    .action(
      async (opts: { paste: boolean; model?: string; language?: string }) => {
        // Audio recording from CLI requires platform-specific native audio capture.
        // This is a placeholder that documents the interface — actual implementation
        // needs node-record-lpcm16 or similar for mic access outside Electron.
        warn(
          "Interactive dictation requires audio capture support.",
        );
        info(
          "Use `rw gui` for full interactive dictation with hotkey support.",
        );
        info(
          "For file-based transcription, use: rw transcribe <file>",
        );
        info("");
        info("Coming soon: stdin pipe mode (e.g. `arecord | rw listen --stdin`)");
        process.exit(0);
      },
    );
}
