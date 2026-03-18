import type { Command } from "commander";
import { Scanner } from "../../core/scanner/index.js";
import { ConfigStore } from "../../core/config/store.js";
import { paths } from "../../core/config/paths.js";
import { table, info } from "../output.js";

export function registerStatusCommand(program: Command): void {
  program
    .command("status")
    .description("Show current state")
    .action(async () => {
      const store = new ConfigStore(paths.configFile);
      const config = store.getAll();
      const scanner = new Scanner();
      const models = await scanner.checkModels();

      console.log("\nReWhisper status:\n");
      table([
        ["Mode", config.useLocalWhisper ? "local (whisper.cpp)" : "cloud"],
        ["Model", config.whisperModel],
        ["Language", config.language],
        ["Agent", config.agentName || "(none)"],
        [
          "Reasoning",
          `${config.reasoningProvider}/${config.reasoningModel}`,
        ],
        [
          "Downloaded models",
          models.downloaded.join(", ") || "(none)",
        ],
      ]);
      console.log();
      info(`Config: ${paths.configFile}`);
      info(`Models: ${paths.whisperModels}`);
      info(`Database: ${paths.database}`);
      console.log();
    });
}
