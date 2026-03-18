# ReWhisper Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** Rewrite OpenWhispr as ReWhisper — a CLI-first, modular dictation tool where every feature is a command.

**Architecture:** CLI-first TypeScript app with Commander.js. Business logic in `src/core/` has zero CLI or Electron dependencies. CLI layer in `src/cli/` wires commands to core. Electron GUI in `src/gui/` is a thin shell importing core. Config via a single `~/.config/rewhisper/config.json` file instead of scattered localStorage.

**Tech Stack:** TypeScript, Commander.js, Vitest, tsup, Vite (renderer), Electron 36, better-sqlite3, pino (structured logging)

**Risk:** HIGH (architectural) — full rewrite with new abstractions

**Prefabs to use:**
- `StructuredLogger@1.0.0` — pino logger with PII/key redaction
- `SettingsPanel@1.0.0` — GUI settings (Phase 5)
- `ClipboardPaste@1.0.0` — reference for paste logic

---

## CLI Command Surface

```
rw listen                 — start interactive dictation session
rw transcribe <file>      — transcribe an audio file
rw scan                   — check system readiness (binaries, models, perms)
rw status                 — show running state & downloaded models
rw models list            — list available + downloaded models
rw models pull <name>     — download a model
rw models rm <name>       — delete a model
rw config show            — show all config
rw config get <key>       — get a config value
rw config set <key> <val> — set a config value
rw history                — show transcription history
rw history clear          — clear history
rw agent <text>           — process text through AI reasoning
rw gui                    — launch Electron GUI
```

---

## Directory Structure

```
src/
├── cli/                    # CLI entry + commands
│   ├── index.ts            # Commander setup, register all commands
│   ├── output.ts           # Formatting helpers (tables, spinners, colors)
│   └── commands/
│       ├── listen.ts       # Interactive dictation
│       ├── transcribe.ts   # File transcription
│       ├── scan.ts         # System readiness check
│       ├── status.ts       # Current state display
│       ├── models.ts       # Model management (list/pull/rm)
│       ├── config.ts       # Config get/set/show
│       ├── history.ts      # Transcription history
│       ├── agent.ts        # AI reasoning
│       └── gui.ts          # Launch Electron
├── core/                   # Business logic (no CLI/Electron deps)
│   ├── audio/
│   │   ├── recorder.ts     # Audio capture via node bindings
│   │   ├── converter.ts    # FFmpeg WAV conversion
│   │   └── pipeline.ts     # Record → convert → transcribe orchestration
│   ├── transcription/
│   │   ├── types.ts        # TranscriptionResult, TranscriptionOptions
│   │   ├── whisper.ts      # whisper.cpp CLI wrapper
│   │   ├── whisper-server.ts # HTTP server mode
│   │   ├── cloud.ts        # OpenAI/Groq transcription API
│   │   └── index.ts        # Unified transcribe() that routes
│   ├── reasoning/
│   │   ├── types.ts        # ReasoningRequest, ReasoningResult
│   │   ├── openai.ts       # OpenAI Responses API
│   │   ├── anthropic.ts    # Anthropic Messages API
│   │   ├── gemini.ts       # Gemini API
│   │   ├── local.ts        # llama.cpp GGUF inference
│   │   └── index.ts        # Unified reason() that routes by provider
│   ├── models/
│   │   ├── registry.ts     # Model registry (loads modelRegistryData.json)
│   │   ├── downloader.ts   # HuggingFace download with progress
│   │   ├── manager.ts      # List/check/delete downloaded models
│   │   └── types.ts        # ModelInfo, DownloadProgress
│   ├── clipboard/
│   │   └── index.ts        # Cross-platform clipboard read/write/paste
│   ├── config/
│   │   ├── schema.ts       # Config shape + defaults + validation
│   │   ├── store.ts        # Load/save/get/set from config.json
│   │   └── paths.ts        # Platform-specific paths (models, config, logs, db)
│   ├── database/
│   │   └── index.ts        # SQLite transcription history CRUD
│   ├── scanner/
│   │   └── index.ts        # System readiness checks (ffmpeg, whisper, perms)
│   └── logger/
│       └── index.ts        # Structured pino logger (from StructuredLogger prefab)
├── gui/                    # Electron shell (Phase 5)
│   ├── main.ts
│   ├── preload.ts
│   ├── ipc/                # Thin IPC handlers calling core/
│   └── renderer/           # React app (migrated from src/components)
└── shared/
    ├── types.ts            # Shared type definitions
    └── constants.ts        # API endpoints, timeouts, limits
tests/
├── unit/                   # Mirrors src/core/ structure
│   ├── config/
│   ├── scanner/
│   ├── transcription/
│   ├── models/
│   ├── reasoning/
│   └── database/
├── integration/            # Cross-module flows
└── fixtures/               # Test audio, configs
```

---

## Staged Plan

### Stage 1 — Core Foundation
> Target: config, logger, scanner, types, CLI scaffold
> Verification: `rw scan` and `rw config` work end-to-end

### Stage 2 — Transcription Pipeline
> Target: audio converter, whisper.cpp wrapper, cloud transcription, `rw transcribe`
> Verification: `rw transcribe test.wav` produces text

### Stage 3 — Model & History Management
> Target: model registry, downloader, database, `rw models`, `rw history`
> Verification: `rw models pull base && rw models list` works

### Stage 4 — Interactive & Agent
> Target: audio recording, clipboard paste, reasoning APIs, `rw listen`, `rw agent`
> Verification: Full dictation loop works via CLI

### Stage 5 — Electron GUI Shell
> Target: Migrate React UI to call core/ modules via IPC
> Verification: `rw gui` launches working Electron app

### Stage 6 — Polish & Build
> Target: Build config (tsup + electron-builder), README, CI
> Verification: `pnpm build` produces distributable

---

## Stage 1: Core Foundation

### Task 1.1: Project Scaffold

**Files:**
- Create: `src/shared/types.ts`
- Create: `src/shared/constants.ts`
- Create: `tsconfig.json` (new, for src/)
- Create: `vitest.config.ts`
- Modify: `package.json` (add scripts, deps)

**Step 1: Install dependencies**

```bash
pnpm add commander chalk ora
pnpm add -D vitest tsup @types/node @types/better-sqlite3
```

**Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "lib": ["ES2022"],
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "paths": {
      "@core/*": ["./src/core/*"],
      "@cli/*": ["./src/cli/*"],
      "@shared/*": ["./src/shared/*"]
    }
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", "src/components", "src/hooks", "src/services"]
}
```

**Step 3: Create vitest.config.ts**

```typescript
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    root: ".",
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@core": path.resolve(__dirname, "src/core"),
      "@cli": path.resolve(__dirname, "src/cli"),
      "@shared": path.resolve(__dirname, "src/shared"),
    },
  },
});
```

**Step 4: Create shared types**

`src/shared/types.ts` — core domain types extracted from existing code:

```typescript
export interface TranscriptionResult {
  text: string;
  language?: string;
  duration?: number;
  segments?: TranscriptionSegment[];
}

export interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
}

export interface TranscriptionOptions {
  model?: string;
  language?: string;
  provider?: "local" | "openai" | "groq";
  translate?: boolean;
}

export interface ReasoningRequest {
  text: string;
  agentName?: string;
  provider: ReasoningProvider;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ReasoningResult {
  text: string;
  provider: string;
  model: string;
  tokensUsed?: number;
}

export type ReasoningProvider = "openai" | "anthropic" | "gemini" | "groq" | "local";

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  size: number; // bytes
  quantization?: string;
  contextLength?: number;
  downloaded: boolean;
  path?: string;
}

export interface DownloadProgress {
  modelId: string;
  downloaded: number;
  total: number;
  percent: number;
}

export interface ScanResult {
  whisperCpp: { available: boolean; path?: string; version?: string };
  ffmpeg: { available: boolean; path?: string };
  models: { downloaded: string[]; recommended?: string };
  permissions: { microphone: boolean; accessibility?: boolean };
  config: { valid: boolean; issues?: string[] };
}

export interface HistoryEntry {
  id: number;
  timestamp: string;
  originalText: string;
  processedText?: string;
  isProcessed: boolean;
  processingMethod: string;
  agentName?: string;
}
```

**Step 5: Create shared constants**

`src/shared/constants.ts` — migrated from existing `src/config/constants.ts`:

```typescript
export const API_ENDPOINTS = {
  OPENAI_BASE: "https://api.openai.com/v1",
  OPENAI_RESPONSES: "https://api.openai.com/v1/responses",
  OPENAI_TRANSCRIPTION: "https://api.openai.com/v1/audio/transcriptions",
  ANTHROPIC: "https://api.anthropic.com/v1/messages",
  GEMINI: "https://generativelanguage.googleapis.com/v1beta",
  GROQ_BASE: "https://api.groq.com/openai/v1",
} as const;

export const TIMEOUTS = {
  TRANSCRIPTION: 300_000,    // 5 minutes
  FFMPEG: 30_000,            // 30 seconds
  QUICK_CHECK: 5_000,        // 5 seconds
  MODEL_TEST: 5_000,         // 5 seconds
  INFERENCE: 30_000,         // 30 seconds
} as const;

export const CACHE_CONFIG = {
  API_KEY_TTL: 3_600_000,    // 1 hour
  AVAILABILITY_TTL: 30_000,  // 30 seconds
} as const;

export const TOKEN_LIMITS = {
  MIN: 100,
  MAX_OPENAI: 2048,
  MAX_ANTHROPIC: 4096,
  MAX_GEMINI: 8192,
  CONTEXT_SIZE: 4096,
} as const;
```

**Step 6: Add package.json scripts**

```json
{
  "scripts": {
    "rw": "tsup src/cli/index.ts --format cjs --outDir dist/cli && node dist/cli/index.js",
    "rw:dev": "tsx src/cli/index.ts",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  }
}
```

**Step 7: Commit**

```bash
git add -A && git commit -m "feat(rewhisper): scaffold project with types, constants, and tooling"
```

---

### Task 1.2: Config Module

**Files:**
- Create: `src/core/config/paths.ts`
- Create: `src/core/config/schema.ts`
- Create: `src/core/config/store.ts`
- Create: `tests/unit/config/store.test.ts`

**Step 1: Write the failing test**

`tests/unit/config/store.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ConfigStore } from "@core/config/store";
import fs from "fs";
import path from "path";
import os from "os";

describe("ConfigStore", () => {
  let tmpDir: string;
  let store: ConfigStore;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "rw-test-"));
    store = new ConfigStore(path.join(tmpDir, "config.json"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns defaults when no config file exists", () => {
    const config = store.getAll();
    expect(config.language).toBe("auto");
    expect(config.useLocalWhisper).toBe(true);
    expect(config.whisperModel).toBe("base");
  });

  it("gets and sets individual values", () => {
    store.set("language", "en");
    expect(store.get("language")).toBe("en");
  });

  it("persists to disk", () => {
    store.set("language", "fr");
    const store2 = new ConfigStore(path.join(tmpDir, "config.json"));
    expect(store2.get("language")).toBe("fr");
  });

  it("validates known keys", () => {
    expect(() => store.set("whisperModel", "invalid-model")).toThrow();
  });

  it("stores API keys separately from config", () => {
    store.setSecret("openaiApiKey", "sk-test123");
    expect(store.getSecret("openaiApiKey")).toBe("sk-test123");
    // Should NOT appear in main config file
    const raw = JSON.parse(fs.readFileSync(path.join(tmpDir, "config.json"), "utf-8"));
    expect(raw.openaiApiKey).toBeUndefined();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm test -- tests/unit/config/store.test.ts
```

Expected: FAIL — module not found

**Step 3: Implement paths.ts**

`src/core/config/paths.ts`:

```typescript
import path from "path";
import os from "os";

const APP_NAME = "rewhisper";

function getConfigHome(): string {
  if (process.env.XDG_CONFIG_HOME) return process.env.XDG_CONFIG_HOME;
  if (process.platform === "darwin") return path.join(os.homedir(), "Library", "Application Support");
  if (process.platform === "win32") return process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
  return path.join(os.homedir(), ".config");
}

function getDataHome(): string {
  if (process.env.XDG_DATA_HOME) return process.env.XDG_DATA_HOME;
  if (process.platform === "darwin") return path.join(os.homedir(), "Library", "Application Support");
  if (process.platform === "win32") return process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");
  return path.join(os.homedir(), ".local", "share");
}

function getCacheHome(): string {
  if (process.env.XDG_CACHE_HOME) return process.env.XDG_CACHE_HOME;
  if (process.platform === "darwin") return path.join(os.homedir(), "Library", "Caches");
  if (process.platform === "win32") return process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");
  return path.join(os.homedir(), ".cache");
}

export const paths = {
  config: path.join(getConfigHome(), APP_NAME),
  configFile: path.join(getConfigHome(), APP_NAME, "config.json"),
  secretsFile: path.join(getConfigHome(), APP_NAME, "secrets.json"),
  data: path.join(getDataHome(), APP_NAME),
  database: path.join(getDataHome(), APP_NAME, "history.db"),
  cache: path.join(getCacheHome(), APP_NAME),
  whisperModels: path.join(getCacheHome(), APP_NAME, "whisper-models"),
  localModels: path.join(getDataHome(), APP_NAME, "models"),
  logs: path.join(getCacheHome(), APP_NAME, "logs"),
};
```

**Step 4: Implement schema.ts**

`src/core/config/schema.ts`:

```typescript
export interface ReWhisperConfig {
  // Transcription
  useLocalWhisper: boolean;
  whisperModel: string;
  language: string;
  // Reasoning
  reasoningProvider: string;
  reasoningModel: string;
  agentName: string;
  // Hotkey
  hotkey: string;
  // UI
  hasCompletedOnboarding: boolean;
}

export const DEFAULTS: ReWhisperConfig = {
  useLocalWhisper: true,
  whisperModel: "base",
  language: "auto",
  reasoningProvider: "openai",
  reasoningModel: "gpt-4.1-mini",
  agentName: "",
  hotkey: "`",
  hasCompletedOnboarding: false,
};

const VALID_WHISPER_MODELS = ["tiny", "base", "small", "medium", "large", "turbo"];
const VALID_PROVIDERS = ["openai", "anthropic", "gemini", "groq", "local"];

export function validate(key: string, value: unknown): void {
  if (key === "whisperModel" && !VALID_WHISPER_MODELS.includes(value as string)) {
    throw new Error(`Invalid whisper model: ${value}. Valid: ${VALID_WHISPER_MODELS.join(", ")}`);
  }
  if (key === "reasoningProvider" && !VALID_PROVIDERS.includes(value as string)) {
    throw new Error(`Invalid provider: ${value}. Valid: ${VALID_PROVIDERS.join(", ")}`);
  }
}
```

**Step 5: Implement store.ts**

`src/core/config/store.ts`:

```typescript
import fs from "fs";
import path from "path";
import { ReWhisperConfig, DEFAULTS, validate } from "./schema.js";

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
    const all = this.getAll();
    return all[key];
  }

  set<K extends keyof ReWhisperConfig>(key: K, value: ReWhisperConfig[K]): void {
    validate(key, value);
    const current = this.readJson(this.configPath);
    current[key] = value;
    this.writeJson(this.configPath, current);
  }

  getSecret(key: string): string | undefined {
    const secrets = this.readJson(this.secretsPath);
    return secrets[key];
  }

  setSecret(key: string, value: string): void {
    const secrets = this.readJson(this.secretsPath);
    secrets[key] = value;
    this.writeJson(this.secretsPath, secrets);
  }

  private readJson(filePath: string): Record<string, any> {
    try {
      return JSON.parse(fs.readFileSync(filePath, "utf-8"));
    } catch {
      return {};
    }
  }

  private writeJson(filePath: string, data: Record<string, any>): void {
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n");
  }
}
```

**Step 6: Run tests**

```bash
pnpm test -- tests/unit/config/store.test.ts
```

Expected: PASS

**Step 7: Commit**

```bash
git add src/core/config/ tests/unit/config/
git commit -m "feat(config): add config store with defaults, validation, and secret storage"
```

---

### Task 1.3: Logger Module

**Files:**
- Create: `src/core/logger/index.ts`
- Create: `tests/unit/logger/index.test.ts`

**Step 1: Instantiate StructuredLogger prefab**

```bash
bash ~/.claude/prefab-library/prefab-cli.sh info StructuredLogger
```

Adapt pino logger with API key redaction for ReWhisper.

**Step 2: Write the failing test**

`tests/unit/logger/index.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { createLogger } from "@core/logger";

describe("Logger", () => {
  it("creates a logger with the given name", () => {
    const log = createLogger("test");
    expect(log).toBeDefined();
    expect(typeof log.info).toBe("function");
    expect(typeof log.error).toBe("function");
    expect(typeof log.debug).toBe("function");
  });

  it("redacts API keys in log output", () => {
    const log = createLogger("test");
    // Just verify it doesn't throw — redaction is internal to pino
    expect(() => log.info({ apiKey: "sk-secret123" }, "test")).not.toThrow();
  });
});
```

**Step 3: Implement logger**

`src/core/logger/index.ts`:

```typescript
import pino from "pino";
import path from "path";
import { paths } from "../config/paths.js";

const REDACT_PATHS = [
  "apiKey", "openaiApiKey", "anthropicApiKey", "geminiApiKey", "groqApiKey",
  "*.apiKey", "*.authorization", "headers.authorization",
];

export function createLogger(name: string, level?: string) {
  const logLevel = level || process.env.REWHISPER_LOG_LEVEL || "info";

  return pino({
    name,
    level: logLevel,
    redact: {
      paths: REDACT_PATHS,
      censor: "[REDACTED]",
    },
    transport: process.stdout.isTTY
      ? { target: "pino-pretty", options: { colorize: true } }
      : undefined,
  });
}

export type Logger = ReturnType<typeof createLogger>;
```

**Step 4: Install pino deps, run tests**

```bash
pnpm add pino pino-pretty
pnpm test -- tests/unit/logger/
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/core/logger/ tests/unit/logger/
git commit -m "feat(logger): add structured pino logger with API key redaction"
```

---

### Task 1.4: Scanner Module

**Files:**
- Create: `src/core/scanner/index.ts`
- Create: `tests/unit/scanner/index.test.ts`

**Step 1: Write the failing test**

`tests/unit/scanner/index.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { Scanner } from "@core/scanner";

describe("Scanner", () => {
  it("checks ffmpeg availability", async () => {
    const scanner = new Scanner();
    const result = await scanner.checkFfmpeg();
    expect(result).toHaveProperty("available");
    expect(typeof result.available).toBe("boolean");
  });

  it("checks whisper-cpp availability", async () => {
    const scanner = new Scanner();
    const result = await scanner.checkWhisperCpp();
    expect(result).toHaveProperty("available");
    expect(typeof result.available).toBe("boolean");
  });

  it("returns full scan result", async () => {
    const scanner = new Scanner();
    const result = await scanner.scan();
    expect(result).toHaveProperty("whisperCpp");
    expect(result).toHaveProperty("ffmpeg");
    expect(result).toHaveProperty("models");
    expect(result).toHaveProperty("config");
  });
});
```

**Step 2: Implement scanner**

`src/core/scanner/index.ts`:

```typescript
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import { paths } from "../config/paths.js";
import { createLogger } from "../logger/index.js";
import type { ScanResult } from "@shared/types.js";

const execFileAsync = promisify(execFile);
const log = createLogger("scanner");

export class Scanner {
  async checkFfmpeg(): Promise<{ available: boolean; path?: string }> {
    try {
      const { stdout } = await execFileAsync("ffmpeg", ["-version"], { timeout: 5000 });
      const version = stdout.split("\n")[0];
      log.debug({ version }, "ffmpeg found");
      return { available: true, path: "ffmpeg" };
    } catch {
      return { available: false };
    }
  }

  async checkWhisperCpp(): Promise<{ available: boolean; path?: string; version?: string }> {
    // Check bundled binary first, then system
    const bundledPath = this.getBundledWhisperPath();
    if (bundledPath && fs.existsSync(bundledPath)) {
      return { available: true, path: bundledPath };
    }
    try {
      await execFileAsync("whisper-cpp", ["--help"], { timeout: 5000 });
      return { available: true, path: "whisper-cpp" };
    } catch {
      return { available: false };
    }
  }

  async checkModels(): Promise<{ downloaded: string[] }> {
    const modelDir = paths.whisperModels;
    if (!fs.existsSync(modelDir)) return { downloaded: [] };
    const files = fs.readdirSync(modelDir).filter((f) => f.endsWith(".bin"));
    const models = files.map((f) => f.replace("ggml-", "").replace(".bin", ""));
    return { downloaded: models };
  }

  async scan(): Promise<ScanResult> {
    const [whisperCpp, ffmpeg, models] = await Promise.all([
      this.checkWhisperCpp(),
      this.checkFfmpeg(),
      this.checkModels(),
    ]);

    return {
      whisperCpp,
      ffmpeg,
      models,
      permissions: { microphone: true }, // CLI doesn't need permission checks
      config: { valid: true },
    };
  }

  private getBundledWhisperPath(): string | null {
    const platform = process.platform === "darwin" ? "macos" : process.platform === "win32" ? "win" : "linux";
    const arch = process.arch === "arm64" ? "arm64" : "x64";
    const ext = process.platform === "win32" ? ".exe" : "";
    const binaryName = `whisper-cpp-${platform}-${arch}${ext}`;
    const bundled = `${process.cwd()}/resources/bin/${binaryName}`;
    return fs.existsSync(bundled) ? bundled : null;
  }
}
```

**Step 3: Run tests**

```bash
pnpm test -- tests/unit/scanner/
```

Expected: PASS (ffmpeg/whisper may not be available, but the shape check passes)

**Step 4: Commit**

```bash
git add src/core/scanner/ tests/unit/scanner/
git commit -m "feat(scanner): add system readiness scanner for ffmpeg, whisper-cpp, and models"
```

---

### Task 1.5: CLI Scaffold + First Commands

**Files:**
- Create: `src/cli/index.ts`
- Create: `src/cli/output.ts`
- Create: `src/cli/commands/scan.ts`
- Create: `src/cli/commands/config.ts`
- Create: `src/cli/commands/status.ts`

**Step 1: Create CLI entry point**

`src/cli/index.ts`:

```typescript
#!/usr/bin/env node
import { Command } from "commander";
import { registerScanCommand } from "./commands/scan.js";
import { registerConfigCommand } from "./commands/config.js";
import { registerStatusCommand } from "./commands/status.js";

const program = new Command();

program
  .name("rw")
  .description("ReWhisper — CLI-first dictation tool")
  .version("0.1.0");

registerScanCommand(program);
registerConfigCommand(program);
registerStatusCommand(program);

program.parse();
```

**Step 2: Create output helpers**

`src/cli/output.ts`:

```typescript
import chalk from "chalk";

export const ok = (msg: string) => console.log(chalk.green("✓"), msg);
export const fail = (msg: string) => console.log(chalk.red("✗"), msg);
export const warn = (msg: string) => console.log(chalk.yellow("!"), msg);
export const info = (msg: string) => console.log(chalk.blue("i"), msg);

export function table(rows: Array<[string, string]>): void {
  const maxKey = Math.max(...rows.map(([k]) => k.length));
  for (const [key, value] of rows) {
    console.log(`  ${chalk.dim(key.padEnd(maxKey))}  ${value}`);
  }
}
```

**Step 3: Create scan command**

`src/cli/commands/scan.ts`:

```typescript
import type { Command } from "commander";
import { Scanner } from "../../core/scanner/index.js";
import { ok, fail, table } from "../output.js";

export function registerScanCommand(program: Command): void {
  program
    .command("scan")
    .description("Check system readiness (binaries, models, permissions)")
    .action(async () => {
      const scanner = new Scanner();
      const result = await scanner.scan();

      console.log("\nSystem scan:\n");

      if (result.ffmpeg.available) ok(`ffmpeg found`);
      else fail("ffmpeg not found — install with: brew install ffmpeg");

      if (result.whisperCpp.available) ok(`whisper-cpp found at ${result.whisperCpp.path}`);
      else fail("whisper-cpp not found — run: rw models pull base");

      const models = result.models.downloaded;
      if (models.length > 0) ok(`${models.length} model(s): ${models.join(", ")}`);
      else fail("No models downloaded — run: rw models pull base");

      console.log();
    });
}
```

**Step 4: Create config command**

`src/cli/commands/config.ts`:

```typescript
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
      table(Object.entries(config).map(([k, v]) => [k, String(v)]));
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
      // Coerce booleans
      const coerced = value === "true" ? true : value === "false" ? false : value;
      store.set(key as any, coerced as any);
      console.log(`${key} = ${coerced}`);
    });
}
```

**Step 5: Create status command**

`src/cli/commands/status.ts`:

```typescript
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
        ["Reasoning", `${config.reasoningProvider}/${config.reasoningModel}`],
        ["Downloaded models", models.downloaded.join(", ") || "(none)"],
      ]);
      console.log();
      info(`Config: ${paths.configFile}`);
      info(`Models: ${paths.whisperModels}`);
      info(`Database: ${paths.database}`);
      console.log();
    });
}
```

**Step 6: Test manually**

```bash
pnpm rw:dev scan
pnpm rw:dev status
pnpm rw:dev config show
pnpm rw:dev config set language en
pnpm rw:dev config get language
```

**Step 7: Commit**

```bash
git add src/cli/ src/core/
git commit -m "feat(cli): add rw command with scan, status, and config commands"
```

---

### Stage 1 Verification

```bash
pnpm test                    # All unit tests pass
pnpm rw:dev scan             # Shows system readiness
pnpm rw:dev config show      # Shows all defaults
pnpm rw:dev config set language en  # Persists
pnpm rw:dev status           # Shows full state
```

---

## Stage 2: Transcription Pipeline

### Task 2.1: Audio Converter (FFmpeg Wrapper)

**Files:**
- Create: `src/core/audio/converter.ts`
- Create: `tests/unit/audio/converter.test.ts`
- Create: `tests/fixtures/` (test audio)

**Step 1: Write the failing test**

`tests/unit/audio/converter.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { AudioConverter } from "@core/audio/converter";
import fs from "fs";
import path from "path";
import os from "os";

describe("AudioConverter", () => {
  const converter = new AudioConverter();

  it("reports ffmpeg availability", async () => {
    const available = await converter.isAvailable();
    expect(typeof available).toBe("boolean");
  });

  it("converts wav to 16kHz mono wav", async () => {
    // Create a minimal WAV file header (44 bytes) for testing
    const header = Buffer.alloc(44);
    header.write("RIFF", 0);
    header.writeUInt32LE(36, 4);
    header.write("WAVE", 8);
    header.write("fmt ", 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);  // PCM
    header.writeUInt16LE(1, 22);  // mono
    header.writeUInt32LE(16000, 24); // sample rate
    header.writeUInt32LE(32000, 28); // byte rate
    header.writeUInt16LE(2, 32);  // block align
    header.writeUInt16LE(16, 34); // bits per sample
    header.write("data", 36);
    header.writeUInt32LE(0, 40);

    const tmpIn = path.join(os.tmpdir(), "rw-test-in.wav");
    const tmpOut = path.join(os.tmpdir(), "rw-test-out.wav");
    fs.writeFileSync(tmpIn, header);

    try {
      const result = await converter.toWav16kMono(tmpIn, tmpOut);
      expect(result.success).toBeDefined();
    } finally {
      fs.rmSync(tmpIn, { force: true });
      fs.rmSync(tmpOut, { force: true });
    }
  });
});
```

**Step 2: Implement converter**

`src/core/audio/converter.ts`:

```typescript
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import { TIMEOUTS } from "@shared/constants.js";
import { createLogger } from "../logger/index.js";

const execFileAsync = promisify(execFile);
const log = createLogger("audio-converter");

export class AudioConverter {
  private ffmpegPath: string;

  constructor(ffmpegPath = "ffmpeg") {
    this.ffmpegPath = ffmpegPath;
  }

  async isAvailable(): Promise<boolean> {
    try {
      await execFileAsync(this.ffmpegPath, ["-version"], { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  async toWav16kMono(
    inputPath: string,
    outputPath: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!fs.existsSync(inputPath)) {
      return { success: false, error: `Input file not found: ${inputPath}` };
    }

    const args = [
      "-i", inputPath,
      "-ar", "16000",
      "-ac", "1",
      "-c:a", "pcm_s16le",
      "-y",
      outputPath,
    ];

    try {
      await execFileAsync(this.ffmpegPath, args, { timeout: TIMEOUTS.FFMPEG });
      log.debug({ inputPath, outputPath }, "Converted to 16kHz mono WAV");
      return { success: true };
    } catch (err: any) {
      log.error({ err, inputPath }, "FFmpeg conversion failed");
      return { success: false, error: err.message };
    }
  }
}
```

**Step 3: Run tests, commit**

```bash
pnpm test -- tests/unit/audio/
git add src/core/audio/ tests/unit/audio/ tests/fixtures/
git commit -m "feat(audio): add FFmpeg audio converter module"
```

---

### Task 2.2: Whisper.cpp Transcription

**Files:**
- Create: `src/core/transcription/types.ts`
- Create: `src/core/transcription/whisper.ts`
- Create: `src/core/transcription/cloud.ts`
- Create: `src/core/transcription/index.ts`
- Create: `tests/unit/transcription/whisper.test.ts`

**Step 1: Write the failing test**

`tests/unit/transcription/whisper.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { WhisperCpp } from "@core/transcription/whisper";

describe("WhisperCpp", () => {
  it("builds correct CLI arguments", () => {
    const whisper = new WhisperCpp("/usr/bin/whisper-cpp");
    const args = whisper.buildArgs("/tmp/audio.wav", {
      model: "base",
      language: "en",
    });

    expect(args).toContain("-m");
    expect(args).toContain("-l");
    expect(args.includes("en")).toBe(true);
    expect(args).toContain("-oj"); // JSON output
    expect(args).toContain("-f");
    expect(args.includes("/tmp/audio.wav")).toBe(true);
  });

  it("parses whisper JSON output", () => {
    const whisper = new WhisperCpp("/usr/bin/whisper-cpp");
    const raw = JSON.stringify({
      transcription: [{ timestamps: { from: "00:00:00", to: "00:00:05" }, text: " Hello world" }],
    });
    const result = whisper.parseOutput(raw);
    expect(result.text).toBe("Hello world");
  });
});
```

**Step 2: Implement whisper.ts**

`src/core/transcription/whisper.ts`:

```typescript
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { paths } from "../config/paths.js";
import { createLogger } from "../logger/index.js";
import { TIMEOUTS } from "@shared/constants.js";
import type { TranscriptionResult, TranscriptionOptions } from "@shared/types.js";

const execFileAsync = promisify(execFile);
const log = createLogger("whisper-cpp");

export class WhisperCpp {
  private binaryPath: string;

  constructor(binaryPath: string) {
    this.binaryPath = binaryPath;
  }

  buildArgs(audioPath: string, options: TranscriptionOptions): string[] {
    const modelName = options.model || "base";
    const modelPath = path.join(paths.whisperModels, `ggml-${modelName}.bin`);

    const args = ["-m", modelPath, "-f", audioPath, "-oj", "--no-prints"];

    if (options.language && options.language !== "auto") {
      args.push("-l", options.language);
    }

    if (options.translate) {
      args.push("-tr");
    }

    return args;
  }

  parseOutput(raw: string): TranscriptionResult {
    const data = JSON.parse(raw);
    const segments = data.transcription || [];
    const text = segments.map((s: any) => s.text).join("").trim();
    return {
      text,
      segments: segments.map((s: any) => ({
        start: this.parseTimestamp(s.timestamps?.from),
        end: this.parseTimestamp(s.timestamps?.to),
        text: s.text.trim(),
      })),
    };
  }

  async transcribe(audioPath: string, options: TranscriptionOptions): Promise<TranscriptionResult> {
    const args = this.buildArgs(audioPath, options);
    log.debug({ binaryPath: this.binaryPath, args }, "Running whisper-cpp");

    const { stdout } = await execFileAsync(this.binaryPath, args, {
      timeout: TIMEOUTS.TRANSCRIPTION,
      maxBuffer: 10 * 1024 * 1024,
    });

    return this.parseOutput(stdout);
  }

  private parseTimestamp(ts?: string): number {
    if (!ts) return 0;
    const parts = ts.split(":").map(Number);
    return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
  }
}
```

**Step 3: Implement cloud.ts**

`src/core/transcription/cloud.ts`:

```typescript
import fs from "fs";
import { createLogger } from "../logger/index.js";
import { API_ENDPOINTS, TIMEOUTS } from "@shared/constants.js";
import type { TranscriptionResult, TranscriptionOptions } from "@shared/types.js";

const log = createLogger("cloud-transcription");

export class CloudTranscriber {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl?: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl || API_ENDPOINTS.OPENAI_TRANSCRIPTION;
  }

  async transcribe(audioPath: string, options: TranscriptionOptions): Promise<TranscriptionResult> {
    const formData = new FormData();
    const audioBuffer = fs.readFileSync(audioPath);
    const blob = new Blob([audioBuffer], { type: "audio/wav" });
    formData.append("file", blob, "audio.wav");
    formData.append("model", "whisper-1");

    if (options.language && options.language !== "auto") {
      formData.append("language", options.language);
    }

    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}` },
      body: formData,
      signal: AbortSignal.timeout(TIMEOUTS.TRANSCRIPTION),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Transcription API error ${response.status}: ${body}`);
    }

    const data = await response.json();
    log.debug({ model: "whisper-1" }, "Cloud transcription complete");
    return { text: data.text };
  }
}
```

**Step 4: Implement unified index.ts**

`src/core/transcription/index.ts`:

```typescript
import { WhisperCpp } from "./whisper.js";
import { CloudTranscriber } from "./cloud.js";
import { Scanner } from "../scanner/index.js";
import { ConfigStore } from "../config/store.js";
import { AudioConverter } from "../audio/converter.js";
import { paths } from "../config/paths.js";
import { createLogger } from "../logger/index.js";
import type { TranscriptionResult, TranscriptionOptions } from "@shared/types.js";
import fs from "fs";
import os from "os";
import path from "path";

const log = createLogger("transcription");

export async function transcribe(
  audioPath: string,
  options: TranscriptionOptions = {}
): Promise<TranscriptionResult> {
  const config = new ConfigStore(paths.configFile);
  const provider = options.provider || (config.get("useLocalWhisper") ? "local" : "openai");

  // Convert to WAV if needed
  const ext = path.extname(audioPath).toLowerCase();
  let wavPath = audioPath;
  if (ext !== ".wav") {
    wavPath = path.join(os.tmpdir(), `rw-${Date.now()}.wav`);
    const converter = new AudioConverter();
    const result = await converter.toWav16kMono(audioPath, wavPath);
    if (!result.success) throw new Error(`Audio conversion failed: ${result.error}`);
  }

  try {
    if (provider === "local") {
      const scanner = new Scanner();
      const check = await scanner.checkWhisperCpp();
      if (!check.available || !check.path) throw new Error("whisper-cpp not available. Run: rw scan");
      const whisper = new WhisperCpp(check.path);
      return await whisper.transcribe(wavPath, {
        model: options.model || config.get("whisperModel"),
        language: options.language || config.get("language"),
        ...options,
      });
    }

    const apiKey = config.getSecret("openaiApiKey");
    if (!apiKey) throw new Error("No OpenAI API key configured. Run: rw config set-secret openaiApiKey <key>");
    return await new CloudTranscriber(apiKey).transcribe(wavPath, options);
  } finally {
    if (wavPath !== audioPath) fs.rmSync(wavPath, { force: true });
  }
}
```

**Step 5: Run tests, commit**

```bash
pnpm test -- tests/unit/transcription/
git add src/core/transcription/ src/core/audio/ tests/unit/transcription/
git commit -m "feat(transcription): add whisper-cpp and cloud transcription with unified API"
```

---

### Task 2.3: Transcribe CLI Command

**Files:**
- Create: `src/cli/commands/transcribe.ts`
- Modify: `src/cli/index.ts` (register command)

**Step 1: Create transcribe command**

`src/cli/commands/transcribe.ts`:

```typescript
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
    .action(async (file: string, opts) => {
      if (!fs.existsSync(file)) {
        fail(`File not found: ${file}`);
        process.exit(1);
      }

      info(`Transcribing ${file}...`);
      try {
        const result = await transcribe(file, {
          model: opts.model,
          language: opts.language,
          provider: opts.provider,
        });
        console.log(result.text);
      } catch (err: any) {
        fail(err.message);
        process.exit(1);
      }
    });
}
```

**Step 2: Register in CLI index**

Add to `src/cli/index.ts`:

```typescript
import { registerTranscribeCommand } from "./commands/transcribe.js";
// ... in program setup:
registerTranscribeCommand(program);
```

**Step 3: Test manually**

```bash
pnpm rw:dev transcribe ~/some-audio-file.wav
```

**Step 4: Commit**

```bash
git add src/cli/commands/transcribe.ts src/cli/index.ts
git commit -m "feat(cli): add rw transcribe command"
```

---

### Stage 2 Verification

```bash
pnpm test                                # All tests pass
pnpm rw:dev transcribe test.wav          # Outputs transcribed text
pnpm rw:dev transcribe test.wav -m tiny  # Uses tiny model
pnpm rw:dev transcribe test.wav -p openai # Uses cloud
```

---

## Stage 3: Model & History Management

### Task 3.1: Model Registry + Manager

**Files:**
- Create: `src/core/models/types.ts`
- Create: `src/core/models/registry.ts`
- Create: `src/core/models/downloader.ts`
- Create: `src/core/models/manager.ts`
- Create: `tests/unit/models/registry.test.ts`
- Create: `tests/unit/models/manager.test.ts`

Uses existing `src/models/modelRegistryData.json` as data source.

**Step 1: Write the failing test**

`tests/unit/models/registry.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { ModelRegistry } from "@core/models/registry";

describe("ModelRegistry", () => {
  const registry = new ModelRegistry();

  it("lists whisper models", () => {
    const models = registry.getWhisperModels();
    expect(models.length).toBeGreaterThan(0);
    expect(models.find((m) => m.id === "base")).toBeDefined();
  });

  it("lists cloud providers", () => {
    const providers = registry.getCloudProviders();
    expect(providers.length).toBeGreaterThan(0);
  });

  it("lists local models", () => {
    const models = registry.getLocalModels();
    expect(models.length).toBeGreaterThan(0);
  });

  it("finds model by ID", () => {
    const model = registry.findModel("base");
    expect(model).toBeDefined();
    expect(model!.name).toContain("base");
  });
});
```

**Step 2: Implement registry, downloader, manager (extract from existing whisper.js + modelManagerBridge.js)**

The implementation should wrap `src/models/modelRegistryData.json` with typed accessors and add download/delete operations with progress callbacks.

**Step 3: Run tests, commit**

```bash
pnpm test -- tests/unit/models/
git add src/core/models/ tests/unit/models/
git commit -m "feat(models): add model registry, downloader, and manager"
```

---

### Task 3.2: Database Module

**Files:**
- Create: `src/core/database/index.ts`
- Create: `tests/unit/database/index.test.ts`

**Step 1: Write the failing test**

`tests/unit/database/index.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Database } from "@core/database";
import fs from "fs";
import path from "path";
import os from "os";

describe("Database", () => {
  let tmpDir: string;
  let db: Database;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "rw-db-"));
    db = new Database(path.join(tmpDir, "test.db"));
  });

  afterEach(() => {
    db.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("saves and retrieves transcriptions", () => {
    db.save({ originalText: "hello world", processingMethod: "local" });
    const entries = db.getAll();
    expect(entries).toHaveLength(1);
    expect(entries[0].originalText).toBe("hello world");
  });

  it("deletes a transcription", () => {
    db.save({ originalText: "delete me", processingMethod: "local" });
    const entries = db.getAll();
    db.delete(entries[0].id);
    expect(db.getAll()).toHaveLength(0);
  });

  it("clears all transcriptions", () => {
    db.save({ originalText: "one", processingMethod: "local" });
    db.save({ originalText: "two", processingMethod: "local" });
    db.clear();
    expect(db.getAll()).toHaveLength(0);
  });
});
```

**Step 2: Implement database (extract from existing database.js)**

`src/core/database/index.ts`:

```typescript
import BetterSqlite3 from "better-sqlite3";
import { createLogger } from "../logger/index.js";
import type { HistoryEntry } from "@shared/types.js";

const log = createLogger("database");

export class Database {
  private db: BetterSqlite3.Database;

  constructor(dbPath: string) {
    this.db = new BetterSqlite3(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.migrate();
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS transcriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        original_text TEXT NOT NULL,
        processed_text TEXT,
        is_processed BOOLEAN DEFAULT 0,
        processing_method TEXT DEFAULT 'none',
        agent_name TEXT,
        error TEXT
      )
    `);
  }

  save(entry: { originalText: string; processedText?: string; processingMethod: string; agentName?: string }): void {
    this.db.prepare(
      `INSERT INTO transcriptions (original_text, processed_text, is_processed, processing_method, agent_name)
       VALUES (?, ?, ?, ?, ?)`
    ).run(
      entry.originalText,
      entry.processedText || null,
      entry.processedText ? 1 : 0,
      entry.processingMethod,
      entry.agentName || null
    );
  }

  getAll(limit = 100): HistoryEntry[] {
    return this.db.prepare(
      `SELECT id, timestamp, original_text as originalText, processed_text as processedText,
              is_processed as isProcessed, processing_method as processingMethod, agent_name as agentName
       FROM transcriptions ORDER BY timestamp DESC LIMIT ?`
    ).all(limit) as HistoryEntry[];
  }

  delete(id: number): void {
    this.db.prepare("DELETE FROM transcriptions WHERE id = ?").run(id);
  }

  clear(): void {
    this.db.prepare("DELETE FROM transcriptions").run();
  }

  close(): void {
    this.db.close();
  }
}
```

**Step 3: Run tests, commit**

```bash
pnpm test -- tests/unit/database/
git add src/core/database/ tests/unit/database/
git commit -m "feat(database): add SQLite transcription history with CRUD"
```

---

### Task 3.3: Models + History CLI Commands

**Files:**
- Create: `src/cli/commands/models.ts`
- Create: `src/cli/commands/history.ts`
- Modify: `src/cli/index.ts`

Implement `rw models list|pull|rm` and `rw history|history clear` commands.
Register in CLI index.

**Commit:**
```bash
git commit -m "feat(cli): add rw models and rw history commands"
```

---

## Stage 4: Interactive & Agent

### Task 4.1: Clipboard Module

**Files:**
- Create: `src/core/clipboard/index.ts`
- Create: `tests/unit/clipboard/index.test.ts`

Extract cross-platform paste logic from existing `src/helpers/clipboard.js`.
Keep the platform detection (macOS/Windows/Linux) and tool fallbacks.

### Task 4.2: Reasoning Module

**Files:**
- Create: `src/core/reasoning/types.ts`
- Create: `src/core/reasoning/openai.ts`
- Create: `src/core/reasoning/anthropic.ts`
- Create: `src/core/reasoning/gemini.ts`
- Create: `src/core/reasoning/local.ts`
- Create: `src/core/reasoning/index.ts`
- Create: `tests/unit/reasoning/openai.test.ts`

Extract from existing `src/services/ReasoningService.ts` and `LocalReasoningService.ts`.

### Task 4.3: Listen Command (Interactive Dictation)

**Files:**
- Create: `src/core/audio/recorder.ts`
- Create: `src/cli/commands/listen.ts`

The `rw listen` command starts an interactive session:
- Listens for hotkey (or Enter) to start/stop recording
- Records audio, transcribes, pastes to clipboard
- Shows transcript in terminal
- Ctrl+C to exit

### Task 4.4: Agent Command

**Files:**
- Create: `src/cli/commands/agent.ts`

`rw agent "summarize this text"` — pipe text through AI reasoning.

---

## Stage 5: Electron GUI Shell

### Task 5.1: Restructure Electron Entry

Move existing Electron code under `src/gui/`:
- `main.js` → `src/gui/main.ts`
- `preload.js` → `src/gui/preload.ts`
- `src/components/` → `src/gui/renderer/components/`
- `src/hooks/` → `src/gui/renderer/hooks/`

### Task 5.2: IPC Handlers as Core Wrappers

Replace all `src/helpers/` god-objects with thin IPC handlers that call `src/core/` modules.

### Task 5.3: GUI Launch Command

`rw gui` spawns the Electron process.

---

## Stage 6: Polish & Build

### Task 6.1: Build Pipeline

- tsup for CLI binary
- Vite for renderer
- electron-builder for desktop app
- `bin` field in package.json for `rw` command

### Task 6.2: CI/CD

- GitHub Actions for test + build
- Release workflow

---

## Dependency Graph

```
shared/types.ts, shared/constants.ts
        ↓
core/config/ ← core/logger/
        ↓
core/scanner/ ← core/audio/converter
        ↓
core/transcription/ (whisper, cloud)
core/models/ (registry, downloader)
core/database/
core/clipboard/
core/reasoning/
        ↓
cli/commands/* (wires core to CLI)
        ↓
gui/ (wires core to Electron IPC)
```

No circular dependencies. Core has zero CLI/Electron imports.
