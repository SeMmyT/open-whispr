import fs from "fs";
import os from "os";
import path from "path";
import { WhisperCpp } from "./whisper.js";
import { CloudTranscriber } from "./cloud.js";
import { Scanner } from "../scanner/index.js";
import { ConfigStore } from "../config/store.js";
import { AudioConverter } from "../audio/converter.js";
import { paths } from "../config/paths.js";
import { createLogger } from "../logger/index.js";
import type {
  TranscriptionResult,
  TranscriptionOptions,
} from "../../shared/types.js";

const log = createLogger("transcription", "warn");

export async function transcribe(
  audioPath: string,
  options: TranscriptionOptions = {},
): Promise<TranscriptionResult> {
  const config = new ConfigStore(paths.configFile);
  const provider =
    options.provider || (config.get("useLocalWhisper") ? "local" : "openai");

  // Convert to WAV if needed
  const ext = path.extname(audioPath).toLowerCase();
  let wavPath = audioPath;
  if (ext !== ".wav") {
    wavPath = path.join(os.tmpdir(), `rw-${Date.now()}.wav`);
    const converter = new AudioConverter();
    const result = await converter.toWav16kMono(audioPath, wavPath);
    if (!result.success)
      throw new Error(`Audio conversion failed: ${result.error}`);
    log.debug({ from: audioPath, to: wavPath }, "Converted to WAV");
  }

  try {
    if (provider === "local") {
      const scanner = new Scanner();
      const check = await scanner.checkWhisperCpp();
      if (!check.available || !check.path)
        throw new Error("whisper-cpp not available. Run: rw scan");

      const whisper = new WhisperCpp(check.path);
      return await whisper.transcribe(wavPath, {
        model: options.model || config.get("whisperModel"),
        language: options.language || config.get("language"),
        ...options,
      });
    }

    // Cloud provider
    const apiKey = config.getSecret("openaiApiKey");
    if (!apiKey)
      throw new Error(
        "No OpenAI API key configured. Run: rw config set-secret openaiApiKey <key>",
      );
    return await new CloudTranscriber(apiKey).transcribe(wavPath, options);
  } finally {
    if (wavPath !== audioPath) {
      fs.rmSync(wavPath, { force: true });
    }
  }
}
