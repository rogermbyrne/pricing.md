/**
 * Updates lastVerified dates for all tools whose pricing page content
 * has NOT changed since the last check. For tools that HAVE changed,
 * it prints a warning but does not modify the JSON (those need manual review).
 *
 * Reads pricingUrl directly from tool JSON files — no database needed.
 * Intended to be run by CI on a schedule (e.g. weekly).
 */
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { isSafeUrl } from "./lib/safe-url.js";

const PROJECT_ROOT = path.join(__dirname, "..");
const TOOLS_DIR = path.join(PROJECT_ROOT, "data", "tools");
const SNAPSHOTS_DIR = path.join(PROJECT_ROOT, "data", "snapshots");

interface ToolEntry {
  id: string;
  name: string;
  pricingUrl: string;
  lastVerified: string;
}

async function fetchContent(url: string): Promise<string | null> {
  if (!isSafeUrl(url)) return null;
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
      headers: { "User-Agent": "Pricing.md-Freshness/1.0" },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function hash(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}

async function main() {
  const today = new Date().toISOString().split("T")[0];
  fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });

  // Read all tool JSON files to get pricingUrls
  const toolFiles = fs.readdirSync(TOOLS_DIR).filter((f) => f.endsWith(".json"));
  const tools: ToolEntry[] = toolFiles.map((f) => {
    const data = JSON.parse(fs.readFileSync(path.join(TOOLS_DIR, f), "utf-8"));
    return {
      id: data.id,
      name: data.name,
      pricingUrl: data.pricingUrl,
      lastVerified: data.lastVerified,
    };
  });

  console.log(`Checking ${tools.length} tools...\n`);

  let verified = 0;
  let changed = 0;
  let failed = 0;
  const changes: string[] = [];

  for (const tool of tools) {
    process.stdout.write(`  ${tool.name}... `);

    const content = await fetchContent(tool.pricingUrl);
    if (!content) {
      console.log("FETCH FAILED");
      failed++;
      continue;
    }

    const currentHash = hash(content);
    const snapshotPath = path.join(SNAPSHOTS_DIR, `${tool.id}.sha256`);
    const toolJsonPath = path.join(TOOLS_DIR, `${tool.id}.json`);

    // Compare with previous snapshot
    let isChanged = false;
    if (fs.existsSync(snapshotPath)) {
      const previousHash = fs.readFileSync(snapshotPath, "utf-8").trim();
      isChanged = currentHash !== previousHash;
    }

    if (isChanged) {
      console.log("CHANGED — needs review");
      changed++;
      changes.push(tool.id);
      // Save new snapshot so next run sees the new baseline
      fs.writeFileSync(snapshotPath, currentHash, "utf-8");
    } else {
      // Unchanged — update lastVerified in the JSON
      const json = JSON.parse(fs.readFileSync(toolJsonPath, "utf-8"));
      if (json.lastVerified !== today) {
        json.lastVerified = today;
        fs.writeFileSync(toolJsonPath, JSON.stringify(json, null, 2) + "\n", "utf-8");
        console.log(`verified → ${today}`);
      } else {
        console.log("already current");
      }
      // Save/refresh snapshot
      fs.writeFileSync(snapshotPath, currentHash, "utf-8");
      verified++;
    }
  }

  console.log(`\n========================================`);
  console.log(`VERIFICATION SUMMARY`);
  console.log(`========================================`);
  console.log(`Verified (unchanged): ${verified}`);
  console.log(`Changed (needs review): ${changed}`);
  console.log(`Fetch failed: ${failed}`);

  if (changes.length > 0) {
    console.log(`\nTools with pricing changes:`);
    for (const id of changes) {
      console.log(`  - ${id}`);
    }
    // Write changes list for downstream steps
    fs.writeFileSync(path.join(PROJECT_ROOT, "data", "pending-changes.txt"), changes.join("\n") + "\n", "utf-8");
  }

  // Exit 0 even if changes detected — CI will commit the verified date updates
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
