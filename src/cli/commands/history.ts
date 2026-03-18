import type { Command } from "commander";
import { Database } from "../../core/database/index.js";
import { paths } from "../../core/config/paths.js";
import { ok, fail, info, warn } from "../output.js";
import chalk from "chalk";

function getDb(): Database {
  return new Database(paths.database);
}

export function registerHistoryCommand(program: Command): void {
  const cmd = program.command("history").description("Transcription history");

  cmd
    .command("list")
    .description("Show recent transcriptions")
    .option("-n, --limit <n>", "Number of entries", "20")
    .action((opts: { limit: string }) => {
      const db = getDb();
      try {
        const entries = db.getAll(parseInt(opts.limit, 10));
        if (entries.length === 0) {
          info("No transcription history");
          return;
        }

        console.log();
        for (const entry of entries) {
          const ts = chalk.dim(entry.timestamp);
          const method = chalk.cyan(entry.processingMethod);
          const text =
            entry.originalText.length > 80
              ? entry.originalText.slice(0, 77) + "..."
              : entry.originalText;
          console.log(`  ${chalk.dim(`#${entry.id}`)} ${ts} [${method}]`);
          console.log(`     ${text}`);
          if (entry.processedText) {
            const processed =
              entry.processedText.length > 80
                ? entry.processedText.slice(0, 77) + "..."
                : entry.processedText;
            console.log(`     ${chalk.green("→")} ${processed}`);
          }
          console.log();
        }

        info(`${entries.length} entries (${db.count()} total)`);
        console.log();
      } finally {
        db.close();
      }
    });

  cmd
    .command("clear")
    .description("Clear all transcription history")
    .action(() => {
      const db = getDb();
      try {
        const count = db.count();
        if (count === 0) {
          info("History is already empty");
          return;
        }
        const cleared = db.clear();
        ok(`Cleared ${cleared} entries`);
      } finally {
        db.close();
      }
    });

  // Default action (no subcommand) — show list
  cmd.action(() => {
    cmd.commands.find((c) => c.name() === "list")?.parse(process.argv);
  });
}
