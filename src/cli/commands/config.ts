import type { Command } from "commander";
import { ConfigStore } from "../../core/config/store.js";
import { paths } from "../../core/config/paths.js";
import { table, info } from "../output.js";

export function registerConfigCommand(program: Command): void {
  const cmd = program.command("config").description("Manage configuration");

  cmd
    .command("show")
    .description("Show all configuration")
    .action(() => {
      const store = new ConfigStore(paths.configFile);
      const config = store.getAll();
      console.log("\nConfiguration:\n");
      table(
        Object.entries(config).map(([k, v]) => [k, String(v)]),
      );
      console.log();
      info(`Config file: ${paths.configFile}`);
      console.log();
    });

  cmd
    .command("get <key>")
    .description("Get a config value")
    .action((key: string) => {
      const store = new ConfigStore(paths.configFile);
      const config = store.getAll();
      if (key in config) {
        console.log(config[key as keyof typeof config]);
      } else {
        console.error(`Unknown key: ${key}`);
        process.exit(1);
      }
    });

  cmd
    .command("set <key> <value>")
    .description("Set a config value")
    .action((key: string, value: string) => {
      const store = new ConfigStore(paths.configFile);
      const coerced =
        value === "true" ? true : value === "false" ? false : value;
      store.set(key as keyof typeof store & string, coerced as never);
      console.log(`${key} = ${coerced}`);
    });
}
