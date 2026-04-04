import fs from "fs";
import path from "path";
import crypto from "crypto";
import { ChangelogDB } from "../web/changelog-db.js";
import { ToolEntrySchema, type ToolEntry } from "../src/schema/pricing.js";
import { computeDiff } from "./compute-diff.js";

const dataDir = path.join(__dirname, "..", "data", "tools");
const dbPath = path.join(__dirname, "..", "data", "changelog.db");

function sha256(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}

function loadTool(filePath: string): ToolEntry | null {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw);
    const result = ToolEntrySchema.safeParse(data);
    if (!result.success) {
      console.warn(`Skipping ${path.basename(filePath)}: invalid schema`);
      return null;
    }
    return result.data;
  } catch (err) {
    console.warn(`Error reading ${path.basename(filePath)}:`, err);
    return null;
  }
}

function recordSnapshot(db: ChangelogDB, toolId: string, toolJson: string, tool: ToolEntry): void {
  const hash = sha256(toolJson);
  const today = new Date().toISOString().split("T")[0];
  const existing = db.getLatestSnapshot(toolId);

  if (existing && existing.content_hash === hash) {
    // No changes
    return;
  }

  db.insertSnapshot(toolId, today, hash, toolJson);

  if (existing) {
    // Compute diff against previous snapshot
    try {
      const before = JSON.parse(existing.tool_json) as ToolEntry;
      const changes = computeDiff(before, tool);
      for (const change of changes) {
        db.insertChange(toolId, change.changeType, change.summary, JSON.stringify(change.details));
        console.log(`  Change: ${change.summary}`);
      }
      if (changes.length === 0) {
        console.log(`  Hash changed but no pricing diff detected (metadata only)`);
      }
    } catch (err) {
      console.warn(`  Error computing diff for ${toolId}:`, err);
    }
  } else {
    console.log(`  Baseline snapshot recorded (no diff generated)`);
  }
}

function main(): void {
  const args = process.argv.slice(2);
  const isAll = args.includes("--all");
  const toolIdArg = args.find((a) => !a.startsWith("--"));

  if (!isAll && !toolIdArg) {
    console.error("Usage: record-snapshot --all | record-snapshot <tool-id>");
    process.exit(1);
  }

  const db = new ChangelogDB(dbPath);

  if (isAll) {
    const files = fs.readdirSync(dataDir).filter((f) => f.endsWith(".json"));
    console.log(`Recording snapshots for ${files.length} tools...`);

    for (const file of files) {
      const filePath = path.join(dataDir, file);
      const raw = fs.readFileSync(filePath, "utf-8");
      const tool = loadTool(filePath);
      if (!tool) continue;

      console.log(`Processing ${tool.id}...`);
      recordSnapshot(db, tool.id, raw, tool);
    }
  } else {
    const filePath = path.join(dataDir, `${toolIdArg}.json`);
    if (!fs.existsSync(filePath)) {
      console.error(`Tool file not found: ${filePath}`);
      process.exit(1);
    }

    const raw = fs.readFileSync(filePath, "utf-8");
    const tool = loadTool(filePath);
    if (!tool) {
      console.error(`Invalid tool data: ${toolIdArg}`);
      process.exit(1);
    }

    console.log(`Processing ${tool.id}...`);
    recordSnapshot(db, tool.id, raw, tool);
  }

  db.close();
  console.log("Done.");
}

main();
