import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { isSafeUrl } from "./lib/safe-url.js";

const DB_PATH = path.join(__dirname, "..", "data", "discovery.db");
const RAW_DIR = path.join(__dirname, "..", "data", "raw");
const TOOLS_DIR = path.join(__dirname, "..", "data", "tools");

const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;

interface DiscoveredTool {
  id: string;
  name: string;
  domain: string;
  category: string;
  pricing_md_url: string;
}

async function fetchPricingMd(url: string): Promise<string | null> {
  if (!isSafeUrl(url)) {
    console.error(`  [warn] Blocked unsafe URL: ${url}`);
    return null;
  }
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
      headers: { "User-Agent": "PricingMD-Parser/1.0" },
    });

    if (!res.ok) return null;
    return await res.text();
  } catch (e) {
    console.error(`  [warn] ${url}: ${(e as Error).message}`);
    return null;
  }
}

async function main() {
  const db = new Database(DB_PATH, { readonly: true });

  const tools = db
    .prepare("SELECT id, name, domain, category, pricing_md_url FROM tools WHERE has_pricing_md = 1 AND pricing_md_url IS NOT NULL")
    .all() as DiscoveredTool[];

  console.log(`Fetching pricing.md for ${tools.length} tools...\n`);

  fs.mkdirSync(RAW_DIR, { recursive: true });
  fs.mkdirSync(TOOLS_DIR, { recursive: true });

  let fetched = 0;
  let failed = 0;

  for (const tool of tools) {
    if (!SLUG_RE.test(tool.id)) {
      console.log(`  SKIP ${tool.name} — invalid ID: ${tool.id}`);
      failed++;
      continue;
    }

    process.stdout.write(`  ${tool.name} (${tool.pricing_md_url})... `);

    const content = await fetchPricingMd(tool.pricing_md_url);
    if (content) {
      const rawPath = path.join(RAW_DIR, `${tool.id}.md`);
      fs.writeFileSync(rawPath, content, "utf-8");
      console.log(`saved (${(content.length / 1024).toFixed(1)} KB)`);
      fetched++;
    } else {
      console.log("FAILED");
      failed++;
    }
  }

  db.close();

  console.log(`\n========================================`);
  console.log(`FETCH SUMMARY`);
  console.log(`========================================\n`);
  console.log(`Fetched: ${fetched}/${tools.length}`);
  console.log(`Failed:  ${failed}/${tools.length}`);
  console.log(`\nRaw files saved to ${RAW_DIR}`);
  console.log(`\nNext step: review raw files and convert to schema JSON in ${TOOLS_DIR}`);
}

main().catch(console.error);
