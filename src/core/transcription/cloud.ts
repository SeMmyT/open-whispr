import fs from "fs";
import { createLogger } from "../logger/index.js";
import { API_ENDPOINTS, TIMEOUTS } from "../../shared/constants.js";
import type {
  TranscriptionResult,
  TranscriptionOptions,
} from "../../shared/types.js";

const log = createLogger("cloud-transcription", "warn");

export class CloudTranscriber {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl?: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl || API_ENDPOINTS.OPENAI_TRANSCRIPTION;
  }

  async transcribe(
    audioPath: string,
    options: TranscriptionOptions,
  ): Promise<TranscriptionResult> {
    const audioBuffer = fs.readFileSync(audioPath);
    const blob = new Blob([audioBuffer], { type: "audio/wav" });

    const formData = new FormData();
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
      throw new Error(
        `Transcription API error ${response.status}: ${body}`,
      );
    }

    const data = (await response.json()) as { text: string };
    log.debug({ model: "whisper-1" }, "Cloud transcription complete");
    return { text: data.text };
  }
}
