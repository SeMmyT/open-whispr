import { execFile, exec } from "child_process";
import { promisify } from "util";
import { createLogger } from "../logger/index.js";

const execFileAsync = promisify(execFile);
const execAsync = promisify(exec);
const log = createLogger("clipboard", "warn");

export class Clipboard {
  async read(): Promise<string> {
    switch (process.platform) {
      case "darwin":
        return (await execFileAsync("pbpaste")).stdout;
      case "win32":
        return (
          await execAsync(
            'powershell.exe -NoProfile -Command "Get-Clipboard"',
          )
        ).stdout.trim();
      default:
        return (await execFileAsync("xclip", ["-selection", "clipboard", "-o"]))
          .stdout;
    }
  }

  async write(text: string): Promise<void> {
    switch (process.platform) {
      case "darwin": {
        const proc = require("child_process").spawn("pbcopy");
        proc.stdin.write(text);
        proc.stdin.end();
        await new Promise<void>((resolve) => proc.on("close", resolve));
        break;
      }
      case "win32":
        await execAsync(
          `powershell.exe -NoProfile -Command "Set-Clipboard -Value '${text.replace(/'/g, "''")}'"`
        );
        break;
      default: {
        const proc = require("child_process").spawn("xclip", [
          "-selection",
          "clipboard",
        ]);
        proc.stdin.write(text);
        proc.stdin.end();
        await new Promise<void>((resolve) => proc.on("close", resolve));
        break;
      }
    }
    log.debug("Text written to clipboard");
  }

  async paste(): Promise<void> {
    switch (process.platform) {
      case "darwin":
        await execAsync(
          `osascript -e 'tell application "System Events" to keystroke "v" using command down'`,
        );
        break;
      case "win32":
        await execAsync(
          'powershell.exe -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait(\'^v\')"',
        );
        break;
      default: {
        const session = process.env.XDG_SESSION_TYPE;
        if (session === "wayland") {
          await execFileAsync("wtype", ["-M", "ctrl", "-k", "v"]);
        } else {
          await execFileAsync("xdotool", ["key", "ctrl+v"]);
        }
        break;
      }
    }
    log.debug("Paste keystroke sent");
  }

  async writeAndPaste(text: string): Promise<void> {
    const original = await this.read().catch(() => "");
    await this.write(text);
    await new Promise((r) => setTimeout(r, 50));
    await this.paste();
    // Restore original clipboard after a delay
    setTimeout(async () => {
      try {
        await this.write(original);
      } catch {
        // ignore restore failures
      }
    }, 500);
  }
}
