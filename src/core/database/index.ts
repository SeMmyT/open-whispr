import fs from "fs";
import path from "path";
import BetterSqlite3 from "better-sqlite3";
import { createLogger } from "../logger/index.js";
import type { HistoryEntry } from "../../shared/types.js";

const log = createLogger("database", "warn");

export class Database {
  private db: BetterSqlite3.Database;

  constructor(dbPath: string) {
    const dir = path.dirname(dbPath);
    fs.mkdirSync(dir, { recursive: true });
    this.db = new BetterSqlite3(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.migrate();
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS transcriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        original_text TEXT NOT NULL,
        processed_text TEXT,
        is_processed BOOLEAN DEFAULT 0,
        processing_method TEXT DEFAULT 'none',
        agent_name TEXT,
        error TEXT
      )
    `);
    log.debug("Database migrated");
  }

  save(entry: {
    originalText: string;
    processedText?: string;
    processingMethod: string;
    agentName?: string;
  }): number {
    const result = this.db
      .prepare(
        `INSERT INTO transcriptions (original_text, processed_text, is_processed, processing_method, agent_name)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(
        entry.originalText,
        entry.processedText || null,
        entry.processedText ? 1 : 0,
        entry.processingMethod,
        entry.agentName || null,
      );
    return Number(result.lastInsertRowid);
  }

  getAll(limit = 100): HistoryEntry[] {
    return this.db
      .prepare(
        `SELECT id, timestamp, original_text as originalText, processed_text as processedText,
                is_processed as isProcessed, processing_method as processingMethod, agent_name as agentName
         FROM transcriptions ORDER BY id DESC LIMIT ?`,
      )
      .all(limit) as HistoryEntry[];
  }

  get(id: number): HistoryEntry | undefined {
    return this.db
      .prepare(
        `SELECT id, timestamp, original_text as originalText, processed_text as processedText,
                is_processed as isProcessed, processing_method as processingMethod, agent_name as agentName
         FROM transcriptions WHERE id = ?`,
      )
      .get(id) as HistoryEntry | undefined;
  }

  delete(id: number): boolean {
    const result = this.db
      .prepare("DELETE FROM transcriptions WHERE id = ?")
      .run(id);
    return result.changes > 0;
  }

  clear(): number {
    const result = this.db.prepare("DELETE FROM transcriptions").run();
    return result.changes;
  }

  count(): number {
    const row = this.db
      .prepare("SELECT COUNT(*) as count FROM transcriptions")
      .get() as { count: number };
    return row.count;
  }

  close(): void {
    this.db.close();
  }
}
