import Database from "better-sqlite3";
import path from "path";

const MAX_RATE_LIMIT_ENTRIES = 50_000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export class VoteDB {
  private db: Database.Database;
  private rateLimit: Map<string, number> = new Map();
  private cleanupTimer: ReturnType<typeof setInterval>;

  constructor(dbPath?: string) {
    const resolvedPath = dbPath || path.join(__dirname, "..", "data", "votes.db");
    this.db = new Database(resolvedPath);
    this.db.pragma("journal_mode = WAL");
    this.init();

    // Evict stale entries every hour to prevent unbounded memory growth
    this.cleanupTimer = setInterval(() => this.evictStaleEntries(), 60 * 60 * 1000);
  }

  private evictStaleEntries(): void {
    const now = Date.now();
    for (const [key, timestamp] of this.rateLimit) {
      if (now - timestamp > ONE_DAY_MS) {
        this.rateLimit.delete(key);
      }
    }
    // Hard cap: if still too large, drop oldest entries
    if (this.rateLimit.size > MAX_RATE_LIMIT_ENTRIES) {
      const sorted = [...this.rateLimit.entries()].sort((a, b) => a[1] - b[1]);
      const toRemove = sorted.slice(0, this.rateLimit.size - MAX_RATE_LIMIT_ENTRIES);
      for (const [key] of toRemove) {
        this.rateLimit.delete(key);
      }
    }
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
    if (lastVote && now - lastVote < ONE_DAY_MS) {
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
    clearInterval(this.cleanupTimer);
    this.db.close();
  }
}
