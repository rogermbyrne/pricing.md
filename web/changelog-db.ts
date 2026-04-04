import Database from "better-sqlite3";
import path from "path";

export interface PricingSnapshot {
  id: number;
  tool_id: string;
  snapshot_date: string;
  content_hash: string;
  tool_json: string;
}

export interface PricingChange {
  id: number;
  tool_id: string;
  detected_at: string;
  change_type: string;
  summary: string;
  diff_json: string;
  notified: number;
}

export class ChangelogDB {
  private db: Database.Database;

  constructor(dbPath?: string) {
    const resolvedPath = dbPath || path.join(__dirname, "..", "data", "changelog.db");
    this.db = new Database(resolvedPath);
    this.db.pragma("journal_mode = WAL");
    this.init();
  }

  private init(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS pricing_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tool_id TEXT NOT NULL,
        snapshot_date TEXT NOT NULL,
        content_hash TEXT NOT NULL,
        tool_json TEXT NOT NULL,
        UNIQUE(tool_id, snapshot_date)
      );

      CREATE TABLE IF NOT EXISTS pricing_changes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tool_id TEXT NOT NULL,
        detected_at TEXT NOT NULL,
        change_type TEXT NOT NULL,
        summary TEXT NOT NULL,
        diff_json TEXT NOT NULL,
        notified INTEGER DEFAULT 0
      );
    `);
  }

  getRecentChanges(limit: number = 50, offset: number = 0, category?: string): PricingChange[] {
    if (category) {
      // We need to filter by category, which requires joining with tool data
      // Since we store tool_json in snapshots, we can filter via a subquery
      const stmt = this.db.prepare(`
        SELECT pc.* FROM pricing_changes pc
        WHERE pc.tool_id IN (
          SELECT DISTINCT ps.tool_id FROM pricing_snapshots ps
          WHERE json_extract(ps.tool_json, '$.category') = ?
        )
        ORDER BY pc.detected_at DESC
        LIMIT ? OFFSET ?
      `);
      return stmt.all(category, limit, offset) as PricingChange[];
    }

    const stmt = this.db.prepare(`
      SELECT * FROM pricing_changes
      ORDER BY detected_at DESC
      LIMIT ? OFFSET ?
    `);
    return stmt.all(limit, offset) as PricingChange[];
  }

  getToolChanges(toolId: string): PricingChange[] {
    const stmt = this.db.prepare(`
      SELECT * FROM pricing_changes
      WHERE tool_id = ?
      ORDER BY detected_at DESC
    `);
    return stmt.all(toolId) as PricingChange[];
  }

  getLatestSnapshot(toolId: string): PricingSnapshot | undefined {
    const stmt = this.db.prepare(`
      SELECT * FROM pricing_snapshots
      WHERE tool_id = ?
      ORDER BY snapshot_date DESC
      LIMIT 1
    `);
    return stmt.get(toolId) as PricingSnapshot | undefined;
  }

  insertSnapshot(toolId: string, date: string, hash: string, json: string): void {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO pricing_snapshots (tool_id, snapshot_date, content_hash, tool_json)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(toolId, date, hash, json);
  }

  insertChange(toolId: string, changeType: string, summary: string, diffJson: string): void {
    const stmt = this.db.prepare(`
      INSERT INTO pricing_changes (tool_id, detected_at, change_type, summary, diff_json)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(toolId, new Date().toISOString(), changeType, summary, diffJson);
  }

  close(): void {
    this.db.close();
  }
}
