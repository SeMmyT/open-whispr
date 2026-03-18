import type { Command } from "commander";
import { ModelManager } from "../../core/models/manager.js";
import { ok, fail, info, warn, table } from "../output.js";
import chalk from "chalk";

export function registerModelsCommand(program: Command): void {
  const cmd = program.command("models").description("Manage models");

  cmd
    .command("list")
    .description("List available and downloaded models")
    .option("-a, --all", "Show all models including local GGUF")
    .action((opts: { all?: boolean }) => {
      const manager = new ModelManager();
      const available = manager.listAvailable();

      const whisper = available.filter((m) => m.type === "whisper");
      const local = available.filter((m) => m.type === "local");

      console.log("\nWhisper models:\n");
      for (const m of whisper) {
        const status = m.installed
          ? chalk.green("installed")
          : chalk.dim("available");
        console.log(
          `  ${m.installed ? chalk.green("●") : chalk.dim("○")} ${m.id.padEnd(8)} ${m.size.padEnd(8)} ${status}`,
        );
      }

      if (opts.all && local.length > 0) {
        console.log("\nLocal GGUF models:\n");
        for (const m of local) {
          const status = m.installed
            ? chalk.green("installed")
            : chalk.dim("available");
          console.log(
            `  ${m.installed ? chalk.green("●") : chalk.dim("○")} ${m.id.padEnd(24)} ${m.size.padEnd(8)} ${status}`,
          );
        }
      } else if (!opts.all && local.length > 0) {
        console.log(
          chalk.dim(`\n  ${local.length} local GGUF models available (use --all to show)`),
        );
      }

      console.log();
    });

  cmd
    .command("pull <model>")
    .description("Download a model")
    .action(async (modelId: string) => {
      const manager = new ModelManager();
      info(`Downloading ${modelId}...`);

      try {
        const destPath = await manager.pull(modelId, (progress) => {
          const bar =
            "█".repeat(Math.floor(progress.percent / 5)) +
            "░".repeat(20 - Math.floor(progress.percent / 5));
          process.stdout.write(
            `\r  ${bar} ${progress.percent}%`,
          );
        });
        console.log(); // newline after progress bar
        ok(`Downloaded to ${destPath}`);
      } catch (err: unknown) {
        console.log(); // newline after potential progress bar
        const message = err instanceof Error ? err.message : String(err);
        fail(message);
        process.exit(1);
      }
    });

  cmd
    .command("rm <model>")
    .description("Delete a downloaded model")
    .action((modelId: string) => {
      const manager = new ModelManager();
      if (manager.remove(modelId)) {
        ok(`Removed ${modelId}`);
      } else {
        fail(`Model not installed: ${modelId}`);
        process.exit(1);
      }
    });
}
