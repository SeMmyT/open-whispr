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

export type ReasoningProvider =
  | "openai"
  | "anthropic"
  | "gemini"
  | "groq"
  | "local";

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  size: number;
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
