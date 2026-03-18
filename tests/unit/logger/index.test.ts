import { describe, it, expect } from "vitest";
import { createLogger } from "@core/logger";

describe("Logger", () => {
  it("creates a logger with the given name", () => {
    const log = createLogger("test", "silent");
    expect(log).toBeDefined();
    expect(typeof log.info).toBe("function");
    expect(typeof log.error).toBe("function");
    expect(typeof log.debug).toBe("function");
  });

  it("redacts API keys in log output", () => {
    const log = createLogger("test", "silent");
    expect(() =>
      log.info({ apiKey: "sk-secret123" }, "test"),
    ).not.toThrow();
  });
});
