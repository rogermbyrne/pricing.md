import Database from "better-sqlite3";
import path from "path";

export class VoteDB {
  private db: Database.Database;
  private rateLimit: Map<string, number> = new Map();

  constructor(dbPath?: string) {
    const resolvedPath = dbPath || path.join(__dirname, "..", "data", "votes.db");
    this.db = new Database(resolvedPath);
    this.db.pragma("journal_mode = WAL");
    this.init();
  }

  private init(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS votes (
        tool_id TEXT PRIMARY KEY,
        count INTEGER DEFAULT 0
      );
    `);
  }

  getVoteCount(toolId: string): number {
    const stmt = this.db.prepare("SELECT count FROM votes WHERE tool_id = ?");
    const row = stmt.get(toolId) as { count: number } | undefined;
    return row?.count ?? 0;
  }

  vote(toolId: string, ip: string): boolean {
    const key = `${toolId}:${ip}`;
    const lastVote = this.rateLimit.get(key);
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    if (lastVote && now - lastVote < oneDay) {
      return false;
    }

    this.rateLimit.set(key, now);

    const stmt = this.db.prepare(`
      INSERT INTO votes (tool_id, count) VALUES (?, 1)
      ON CONFLICT(tool_id) DO UPDATE SET count = count + 1
    `);
    stmt.run(toolId);
    return true;
  }

  close(): void {
    this.db.close();
  }
}
