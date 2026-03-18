import fs from "fs";
import path from "path";
import { createLogger } from "../logger/index.js";
import type { DownloadProgress } from "../../shared/types.js";

const log = createLogger("downloader", "warn");

export type ProgressCallback = (progress: DownloadProgress) => void;

export async function downloadFile(
  url: string,
  destPath: string,
  modelId: string,
  onProgress?: ProgressCallback,
): Promise<void> {
  const dir = path.dirname(destPath);
  fs.mkdirSync(dir, { recursive: true });

  const tmpPath = `${destPath}.tmp`;

  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status} ${response.statusText}`);
  }

  const totalStr = response.headers.get("content-length");
  const total = totalStr ? parseInt(totalStr, 10) : 0;
  let downloaded = 0;

  const fileStream = fs.createWriteStream(tmpPath);

  try {
    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      fileStream.write(Buffer.from(value));
      downloaded += value.byteLength;

      if (onProgress && total > 0) {
        onProgress({
          modelId,
          downloaded,
          total,
          percent: Math.round((downloaded / total) * 100),
        });
      }
    }

    fileStream.end();
    await new Promise<void>((resolve, reject) => {
      fileStream.on("finish", resolve);
      fileStream.on("error", reject);
    });

    // Atomic rename
    fs.renameSync(tmpPath, destPath);
    log.debug({ url, destPath }, "Download complete");
  } catch (err) {
    fileStream.end();
    fs.rmSync(tmpPath, { force: true });
    throw err;
  }
}
