import fs from "fs";
import path from "path";
import { type ReWhisperConfig, DEFAULTS, validate } from "./schema.js";

export class ConfigStore {
  private configPath: string;
  private secretsPath: string;

  constructor(configPath: string) {
    this.configPath = configPath;
    this.secretsPath = path.join(path.dirname(configPath), "secrets.json");
  }

  getAll(): ReWhisperConfig {
    const saved = this.readJson(this.configPath);
    return { ...DEFAULTS, ...saved };
  }

  get<K extends keyof ReWhisperConfig>(key: K): ReWhisperConfig[K] {
    return this.getAll()[key];
  }

  set<K extends keyof ReWhisperConfig>(
    key: K,
    value: ReWhisperConfig[K],
  ): void {
    validate(key, value);
    const current = this.readJson(this.configPath);
    current[key] = value;
    this.writeJson(this.configPath, current);
  }

  getSecret(key: string): string | undefined {
    const secrets = this.readJson(this.secretsPath);
    return secrets[key] as string | undefined;
  }

  setSecret(key: string, value: string): void {
    const secrets = this.readJson(this.secretsPath);
    secrets[key] = value;
    this.writeJson(this.secretsPath, secrets);
  }

  private readJson(filePath: string): Record<string, unknown> {
    try {
      return JSON.parse(fs.readFileSync(filePath, "utf-8")) as Record<
        string,
        unknown
      >;
    } catch {
      return {};
    }
  }

  private writeJson(filePath: string, data: Record<string, unknown>): void {
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n");
  }
}
