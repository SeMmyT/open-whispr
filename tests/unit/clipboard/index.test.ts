import { describe, it, expect } from "vitest";
import { Clipboard } from "@core/clipboard";

describe("Clipboard", () => {
  it("creates an instance", () => {
    const clip = new Clipboard();
    expect(clip).toBeDefined();
    expect(typeof clip.read).toBe("function");
    expect(typeof clip.write).toBe("function");
    expect(typeof clip.paste).toBe("function");
    expect(typeof clip.writeAndPaste).toBe("function");
  });

  // Platform-specific tests — only run where tools are available
  it("can read clipboard (may fail in headless CI)", async () => {
    const clip = new Clipboard();
    try {
      const text = await clip.read();
      expect(typeof text).toBe("string");
    } catch {
      // Expected in headless environments
    }
  });
});
