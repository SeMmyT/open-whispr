import fs from "fs";
import path from "path";
import type {
  RegistryData,
  WhisperModelDef,
  CloudProviderDef,
  LocalProviderDef,
  LocalModelDef,
} from "./types.js";

// Locate the registry JSON relative to this module, falling back to common locations
function loadRegistryData(): RegistryData {
  const candidates = [
    path.resolve(process.cwd(), "src/models/modelRegistryData.json"),
    path.resolve(__dirname, "../../models/modelRegistryData.json"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, "utf-8")) as RegistryData;
    }
  }
  throw new Error("modelRegistryData.json not found");
}

export class ModelRegistry {
  private data: RegistryData;

  constructor(data?: RegistryData) {
    this.data = data || loadRegistryData();
  }

  getWhisperModels(): Array<WhisperModelDef & { id: string }> {
    return Object.entries(this.data.whisperModels).map(([id, def]) => ({
      id,
      ...def,
    }));
  }

  getWhisperModel(id: string): (WhisperModelDef & { id: string }) | undefined {
    const def = this.data.whisperModels[id];
    return def ? { id, ...def } : undefined;
  }

  getCloudProviders(): CloudProviderDef[] {
    return this.data.cloudProviders;
  }

  getLocalProviders(): LocalProviderDef[] {
    return this.data.localProviders;
  }

  getLocalModels(): Array<LocalModelDef & { providerId: string }> {
    return this.data.localProviders.flatMap((p) =>
      p.models.map((m) => ({ ...m, providerId: p.id })),
    );
  }

  findModel(
    id: string,
  ):
    | { type: "whisper"; model: WhisperModelDef & { id: string } }
    | { type: "local"; model: LocalModelDef & { providerId: string } }
    | undefined {
    const whisper = this.getWhisperModel(id);
    if (whisper) return { type: "whisper", model: whisper };

    const local = this.getLocalModels().find((m) => m.id === id);
    if (local) return { type: "local", model: local };

    return undefined;
  }

  getWhisperDownloadUrl(modelId: string): string {
    return `https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-${modelId}.bin`;
  }

  getLocalDownloadUrl(model: LocalModelDef): string {
    const provider = this.data.localProviders.find((p) =>
      p.models.some((m) => m.id === model.id),
    );
    const baseUrl = provider?.baseUrl || "https://huggingface.co";
    return `${baseUrl}/${model.hfRepo}/resolve/main/${model.fileName}`;
  }
}
