export interface WhisperModelDef {
  name: string;
  description: string;
  size: string;
  sizeMb: number;
  recommended?: boolean;
}

export interface CloudModelDef {
  id: string;
  name: string;
  description: string;
  disableThinking?: boolean;
}

export interface CloudProviderDef {
  id: string;
  name: string;
  models: CloudModelDef[];
}

export interface LocalModelDef {
  id: string;
  name: string;
  size: string;
  sizeBytes: number;
  description: string;
  fileName: string;
  quantization: string;
  contextLength: number;
  hfRepo: string;
  recommended?: boolean;
}

export interface LocalProviderDef {
  id: string;
  name: string;
  baseUrl: string;
  promptTemplate: string;
  models: LocalModelDef[];
}

export interface RegistryData {
  whisperModels: Record<string, WhisperModelDef>;
  transcriptionProviders: CloudProviderDef[];
  cloudProviders: CloudProviderDef[];
  localProviders: LocalProviderDef[];
}
