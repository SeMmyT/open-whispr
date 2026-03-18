import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Database } from "@core/database";
import fs from "fs";
import path from "path";
import os from "os";

describe("Database", () => {
  let tmpDir: string;
  let db: Database;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "rw-db-"));
    db = new Database(path.join(tmpDir, "test.db"));
  });

  afterEach(() => {
    db.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("saves and retrieves transcriptions", () => {
    db.save({ originalText: "hello world", processingMethod: "local" });
    const entries = db.getAll();
    expect(entries).toHaveLength(1);
    expect(entries[0].originalText).toBe("hello world");
    expect(entries[0].processingMethod).toBe("local");
  });

  it("returns inserted ID", () => {
    const id = db.save({
      originalText: "test",
      processingMethod: "local",
    });
    expect(id).toBeGreaterThan(0);
  });

  it("gets single entry by ID", () => {
    const id = db.save({
      originalText: "find me",
      processingMethod: "cloud",
    });
    const entry = db.get(id);
    expect(entry).toBeDefined();
    expect(entry!.originalText).toBe("find me");
  });

  it("saves processed text and agent name", () => {
    db.save({
      originalText: "raw text",
      processedText: "processed text",
      processingMethod: "openai",
      agentName: "Jarvis",
    });
    const entries = db.getAll();
    expect(entries[0].processedText).toBe("processed text");
    expect(entries[0].agentName).toBe("Jarvis");
    expect(entries[0].isProcessed).toBe(1);
  });

  it("deletes a transcription", () => {
    const id = db.save({
      originalText: "delete me",
      processingMethod: "local",
    });
    expect(db.delete(id)).toBe(true);
    expect(db.getAll()).toHaveLength(0);
  });

  it("returns false deleting nonexistent entry", () => {
    expect(db.delete(9999)).toBe(false);
  });

  it("clears all transcriptions", () => {
    db.save({ originalText: "one", processingMethod: "local" });
    db.save({ originalText: "two", processingMethod: "local" });
    const cleared = db.clear();
    expect(cleared).toBe(2);
    expect(db.getAll()).toHaveLength(0);
  });

  it("counts entries", () => {
    expect(db.count()).toBe(0);
    db.save({ originalText: "one", processingMethod: "local" });
    db.save({ originalText: "two", processingMethod: "local" });
    expect(db.count()).toBe(2);
  });

  it("respects limit parameter", () => {
    for (let i = 0; i < 10; i++) {
      db.save({ originalText: `entry ${i}`, processingMethod: "local" });
    }
    expect(db.getAll(3)).toHaveLength(3);
  });

  it("returns newest entries first", () => {
    db.save({ originalText: "first", processingMethod: "local" });
    db.save({ originalText: "second", processingMethod: "local" });
    const entries = db.getAll();
    expect(entries[0].originalText).toBe("second");
  });
});
