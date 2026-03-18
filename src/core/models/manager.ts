import fs from "fs";
import path from "path";
import { ModelRegistry } from "./registry.js";
import { downloadFile, type ProgressCallback } from "./downloader.js";
import { paths } from "../config/paths.js";
import { createLogger } from "../logger/index.js";

const log = createLogger("model-manager", "warn");

export interface InstalledModel {
  id: string;
  name: string;
  type: "whisper" | "local";
  size: string;
  path: string;
}

export class ModelManager {
  private registry: ModelRegistry;

  constructor(registry?: ModelRegistry) {
    this.registry = registry || new ModelRegistry();
  }

  listInstalled(): InstalledModel[] {
    const models: InstalledModel[] = [];

    // Whisper models
    if (fs.existsSync(paths.whisperModels)) {
      for (const file of fs.readdirSync(paths.whisperModels)) {
        if (!file.endsWith(".bin")) continue;
        const id = file.replace("ggml-", "").replace(".bin", "");
        const def = this.registry.getWhisperModel(id);
        const filePath = path.join(paths.whisperModels, file);
        const stat = fs.statSync(filePath);
        models.push({
          id,
          name: def?.name || id,
          type: "whisper",
          size: formatBytes(stat.size),
          path: filePath,
        });
      }
    }

    // Local GGUF models
    if (fs.existsSync(paths.localModels)) {
      for (const file of fs.readdirSync(paths.localModels)) {
        if (!file.endsWith(".gguf")) continue;
        const localModels = this.registry.getLocalModels();
        const def = localModels.find((m) => m.fileName === file);
        const filePath = path.join(paths.localModels, file);
        const stat = fs.statSync(filePath);
        models.push({
          id: def?.id || file,
          name: def?.name || file,
          type: "local",
          size: formatBytes(stat.size),
          path: filePath,
        });
      }
    }

    return models;
  }

  listAvailable(): Array<{
    id: string;
    name: string;
    type: "whisper" | "local";
    size: string;
    installed: boolean;
  }> {
    const installed = new Set(this.listInstalled().map((m) => m.id));

    const whisper = this.registry.getWhisperModels().map((m) => ({
      id: m.id,
      name: m.name,
      type: "whisper" as const,
      size: m.size,
      installed: installed.has(m.id),
    }));

    const local = this.registry.getLocalModels().map((m) => ({
      id: m.id,
      name: m.name,
      type: "local" as const,
      size: m.size,
      installed: installed.has(m.id),
    }));

    return [...whisper, ...local];
  }

  async pull(
    modelId: string,
    onProgress?: ProgressCallback,
  ): Promise<string> {
    const found = this.registry.findModel(modelId);
    if (!found) throw new Error(`Unknown model: ${modelId}`);

    if (found.type === "whisper") {
      const dest = path.join(paths.whisperModels, `ggml-${modelId}.bin`);
      if (fs.existsSync(dest)) return dest;
      const url = this.registry.getWhisperDownloadUrl(modelId);
      log.info({ modelId, url }, "Downloading whisper model");
      await downloadFile(url, dest, modelId, onProgress);
      return dest;
    }

    // Local model
    const dest = path.join(paths.localModels, found.model.fileName);
    if (fs.existsSync(dest)) return dest;
    const url = this.registry.getLocalDownloadUrl(found.model);
    log.info({ modelId, url }, "Downloading local model");
    await downloadFile(url, dest, modelId, onProgress);
    return dest;
  }

  remove(modelId: string): boolean {
    const installed = this.listInstalled().find((m) => m.id === modelId);
    if (!installed) return false;
    fs.rmSync(installed.path);
    log.info({ modelId, path: installed.path }, "Model removed");
    return true;
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(0)}MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`;
}
