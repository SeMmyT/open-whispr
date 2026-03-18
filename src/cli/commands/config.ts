import type { Command } from "commander";
import { ConfigStore } from "../../core/config/store.js";
import { DEFAULTS } from "../../core/config/schema.js";
import { paths } from "../../core/config/paths.js";
import { table, info, ok, fail } from "../output.js";
import chalk from "chalk";

const VALID_KEYS = Object.keys(DEFAULTS);

export function registerConfigCommand(program: Command): void {
  const cmd = program
    .command("config")
    .description("Manage configuration")
    .addHelpText(
      "after",
      `
Examples:
  $ rw config show                     Show all settings
  $ rw config get language             Get a single value
  $ rw config set language en          Set language to English
  $ rw config set whisperModel small   Use the small model
  $ rw config set-secret openaiApiKey sk-...   Store an API key

Valid keys: ${VALID_KEYS.join(", ")}`,
    );

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
      info(`Secrets file: ${paths.secretsFile}`);
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
        fail(`Unknown key: ${key}`);
        info(`Valid keys: ${chalk.cyan(VALID_KEYS.join(", "))}`);
        process.exit(1);
      }
    });

  cmd
    .command("set <key> <value>")
    .description("Set a config value")
    .action((key: string, value: string) => {
      if (!VALID_KEYS.includes(key)) {
        fail(`Unknown key: ${key}`);
        info(`Valid keys: ${chalk.cyan(VALID_KEYS.join(", "))}`);
        process.exit(1);
      }
      const store = new ConfigStore(paths.configFile);
      const coerced =
        value === "true" ? true : value === "false" ? false : value;
      try {
        store.set(key as keyof typeof store & string, coerced as never);
        ok(`${key} = ${coerced}`);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        fail(message);
        process.exit(1);
      }
    });

  cmd
    .command("set-secret <key> <value>")
    .description("Store a secret (API key)")
    .action((key: string, value: string) => {
      const store = new ConfigStore(paths.configFile);
      store.setSecret(key, value);
      ok(`Secret ${key} saved`);
    });
}
