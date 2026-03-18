import path from "path";
import os from "os";

const APP_NAME = "rewhisper";

function getConfigHome(): string {
  if (process.env.XDG_CONFIG_HOME) return process.env.XDG_CONFIG_HOME;
  if (process.platform === "darwin")
    return path.join(os.homedir(), "Library", "Application Support");
  if (process.platform === "win32")
    return (
      process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming")
    );
  return path.join(os.homedir(), ".config");
}

function getDataHome(): string {
  if (process.env.XDG_DATA_HOME) return process.env.XDG_DATA_HOME;
  if (process.platform === "darwin")
    return path.join(os.homedir(), "Library", "Application Support");
  if (process.platform === "win32")
    return (
      process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local")
    );
  return path.join(os.homedir(), ".local", "share");
}

function getCacheHome(): string {
  if (process.env.XDG_CACHE_HOME) return process.env.XDG_CACHE_HOME;
  if (process.platform === "darwin")
    return path.join(os.homedir(), "Library", "Caches");
  if (process.platform === "win32")
    return (
      process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local")
    );
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
