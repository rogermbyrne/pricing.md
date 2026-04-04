import Database from "better-sqlite3";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { isSafeUrl } from "./lib/safe-url.js";

const DB_PATH = path.join(__dirname, "..", "data", "discovery.db");
const SNAPSHOTS_DIR = path.join(__dirname, "..", "data", "snapshots");

interface TrackedTool {
  id: string;
  name: string;
  pricing_md_url: string;
}

async function fetchContent(url: string): Promise<string | null> {
  if (!isSafeUrl(url)) {
    console.error(`  [warn] Blocked unsafe URL: ${url}`);
    return null;
  }
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
      headers: { "User-Agent": "PricingMD-Freshness/1.0" },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch (e) {
    console.error(`  [warn] ${url}: ${(e as Error).message}`);
    return null;
  }
}

function hash(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}

async function main() {
  const db = new Database(DB_PATH, { readonly: true });
  fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });

  const tools = db
    .prepare("SELECT id, name, pricing_md_url FROM tools WHERE has_pricing_md = 1 AND pricing_md_url IS NOT NULL")
    .all() as TrackedTool[];

  console.log(`Checking freshness for ${tools.length} tools...\n`);

  let unchanged = 0;
  let changed = 0;
  let failed = 0;
  let newSnapshot = 0;
  const changes: { name: string; url: string }[] = [];

  for (const tool of tools) {
    process.stdout.write(`  ${tool.name}... `);

    const content = await fetchContent(tool.pricing_md_url);
    if (!content) {
      console.log("FETCH FAILED");
      failed++;
      continue;
    }

    const currentHash = hash(content);
    const snapshotPath = path.join(SNAPSHOTS_DIR, `${tool.id}.sha256`);

    if (fs.existsSync(snapshotPath)) {
      const previousHash = fs.readFileSync(snapshotPath, "utf-8").trim();
      if (currentHash === previousHash) {
        console.log("unchanged");
        unchanged++;
      } else {
        console.log("CHANGED");
        changed++;
        changes.push({ name: tool.name, url: tool.pricing_md_url });
        // Save new snapshot
        fs.writeFileSync(snapshotPath, currentHash, "utf-8");
      }
    } else {
      console.log("new snapshot");
      fs.writeFileSync(snapshotPath, currentHash, "utf-8");
      newSnapshot++;
    }
  }

  db.close();

  console.log(`\n========================================`);
  console.log(`FRESHNESS CHECK SUMMARY`);
  console.log(`========================================\n`);
  console.log(`Unchanged:     ${unchanged}`);
  console.log(`Changed:       ${changed}`);
  console.log(`New snapshots: ${newSnapshot}`);
  console.log(`Fetch failed:  ${failed}`);

  if (changes.length > 0) {
    console.log(`\nPricing changes detected — review and update these:`);
    for (const c of changes) {
      console.log(`  ${c.name}: ${c.url}`);
    }
  }
}

main().catch(console.error);
