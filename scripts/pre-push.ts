/**
 * Pre-push gate — runs ALL checks before code can be pushed.
 * Exits with code 1 if anything fails. Run via: npm run pre-push
 *
 * Steps:
 * 1. TypeScript build
 * 2. Schema validation (all JSON files)
 * 3. Sanity checks (logical consistency)
 * 4. Accuracy verification (cross-reference JSON against raw sources)
 * 5. MCP server tests
 * 6. Package check (only intended files ship)
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { ToolEntrySchema, type ToolEntry } from "../src/schema/pricing.js";

const ROOT = path.join(__dirname, "..");
const TOOLS_DIR = path.join(ROOT, "data", "tools");
const RAW_DIR = path.join(ROOT, "data", "raw");

let failures = 0;
let warnings = 0;

function run(label: string, cmd: string): boolean {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`STEP: ${label}`);
  console.log("=".repeat(60));
  try {
    execSync(cmd, { cwd: ROOT, stdio: "inherit" });
    console.log(`✓ ${label} passed`);
    return true;
  } catch {
    console.error(`✗ ${label} FAILED`);
    failures++;
    return false;
  }
}

function loadTool(file: string): ToolEntry | null {
  const raw = fs.readFileSync(path.join(TOOLS_DIR, file), "utf-8");
  const result = ToolEntrySchema.safeParse(JSON.parse(raw));
  return result.success ? result.data : null;
}

/**
 * Accuracy check: for each JSON file, verify that key numbers
 * exist in the corresponding raw source file.
 *
 * This isn't a full semantic audit (that requires an LLM) but it catches
 * the most common error: numbers in JSON that don't appear anywhere in the source.
 */
function verifyAccuracy(): void {
  console.log(`\n${"=".repeat(60)}`);
  console.log("STEP: Accuracy verification (JSON numbers vs raw sources)");
  console.log("=".repeat(60));

  const files = fs.readdirSync(TOOLS_DIR).filter((f) => f.endsWith(".json"));
  let checked = 0;
  let issues = 0;
  let skipped = 0;

  for (const file of files) {
    const tool = loadTool(file);
    if (!tool) continue;

    // Find corresponding raw file — try the tool id, but handle splits (auth0-b2c -> auth0)
    const rawCandidates = [
      `${tool.id}.md`,
      `${tool.id.replace(/-b2[cb]$/, "")}.md`,
      `${tool.id.replace(/-postgres$/, "")}.md`,
      `${tool.id.replace(/-vitess$/, "")}.md`,
    ];

    let rawContent: string | null = null;
    for (const candidate of rawCandidates) {
      const rawPath = path.join(RAW_DIR, candidate);
      if (fs.existsSync(rawPath)) {
        rawContent = fs.readFileSync(rawPath, "utf-8");
        break;
      }
    }

    if (!rawContent) {
      console.log(`  SKIP  ${tool.id} — no raw source file found`);
      skipped++;
      continue;
    }

    // Also load .verified file if it exists (contains numbers confirmed from live pricing page)
    const verifiedPath = path.join(RAW_DIR, `${tool.id}.verified`);
    if (fs.existsSync(verifiedPath)) {
      rawContent += "\n" + fs.readFileSync(verifiedPath, "utf-8");
    }
    // Check base ID verified file too (for splits like auth0-b2c)
    for (const candidate of rawCandidates) {
      const vPath = path.join(RAW_DIR, candidate.replace(".md", ".verified"));
      if (fs.existsSync(vPath)) {
        rawContent += "\n" + fs.readFileSync(vPath, "utf-8");
      }
    }

    checked++;
    const toolIssues: string[] = [];

    // Check that key prices appear in the raw source
    for (const tier of tool.tiers) {
      // Check basePrice
      if (tier.basePrice !== null && tier.basePrice > 0) {
        if (!numberExistsInSource(tier.basePrice, rawContent)) {
          toolIssues.push(`${tier.name} basePrice $${tier.basePrice} not found in raw source`);
        }
      }

      // Check seatPrice
      if (tier.seatPrice !== null && tier.seatPrice > 0) {
        if (!numberExistsInSource(tier.seatPrice, rawContent)) {
          toolIssues.push(`${tier.name} seatPrice $${tier.seatPrice} not found in raw source`);
        }
      }

      // Check usage metric prices
      for (const metric of tier.usageMetrics) {
        if (metric.pricePerUnit > 0) {
          if (!numberExistsInSource(metric.pricePerUnit, rawContent)) {
            toolIssues.push(`${tier.name} ${metric.name} pricePerUnit $${metric.pricePerUnit} not found in raw source`);
          }
        }
        if (metric.includedQuantity > 0) {
          if (!numberExistsInSource(metric.includedQuantity, rawContent)) {
            // Try common formatted versions (1,000 or 1K or 1000)
            const formatted = formatVariants(metric.includedQuantity);
            const found = formatted.some((v) => rawContent!.includes(v));
            if (!found) {
              toolIssues.push(`${tier.name} ${metric.name} includedQuantity ${metric.includedQuantity} not found in raw source`);
            }
          }
        }
      }
    }

    if (toolIssues.length === 0) {
      console.log(`  PASS  ${tool.id}`);
    } else {
      console.log(`  FAIL  ${tool.id}`);
      for (const issue of toolIssues) {
        console.log(`         ${issue}`);
      }
      issues += toolIssues.length;
    }
  }

  console.log(`\nAccuracy: ${checked} checked, ${skipped} skipped, ${issues} issues found`);
  if (issues > 0) {
    console.error(`\n✗ Accuracy verification found ${issues} issues — numbers in JSON not traceable to raw source`);
    console.error("  Run a manual audit or use the pricing-research skill to investigate before pushing.");
    failures++;
  } else {
    console.log("✓ Accuracy verification passed — all JSON numbers found in raw sources");
  }
}

function numberExistsInSource(num: number, source: string): boolean {
  // Check exact number as string
  const variants = formatVariants(num);
  return variants.some((v) => source.includes(v));
}

function formatVariants(num: number): string[] {
  const variants: string[] = [];
  // Exact string
  variants.push(String(num));
  // Comma-formatted (1000 -> 1,000)
  variants.push(num.toLocaleString("en-US"));
  // Dollar formatted ($20, $0.02)
  variants.push(`$${num}`);
  // With decimals trimmed (5.99 -> 5.99, also try 5)
  if (num !== Math.floor(num)) {
    variants.push(String(Math.floor(num)));
  }
  // K/M/B shorthand
  if (num >= 1_000_000_000 && num % 1_000_000_000 === 0) {
    variants.push(`${num / 1_000_000_000}B`);
    variants.push(`${num / 1_000_000_000}b`);
    variants.push(`${num / 1_000_000_000} billion`);
    variants.push(`${num / 1_000_000_000} Billion`);
  }
  if (num >= 1_000_000 && num % 1_000_000 === 0) {
    variants.push(`${num / 1_000_000}M`);
    variants.push(`${num / 1_000_000}m`);
    variants.push(`${num / 1_000_000} million`);
    variants.push(`${num / 1_000_000} Million`);
    variants.push(`${num / 1_000_000},000,000`);
  }
  // Handle non-round millions (e.g. 2500000000 = 2.5 Billion, 25000000 = 25 Million)
  if (num >= 1_000_000_000) {
    const billions = num / 1_000_000_000;
    if (billions !== Math.floor(billions)) {
      variants.push(`${billions} Billion`);
      variants.push(`${billions} billion`);
      variants.push(`${billions}B`);
    }
  }
  if (num >= 1_000_000) {
    const millions = num / 1_000_000;
    variants.push(`${millions} Million`);
    variants.push(`${millions} million`);
    variants.push(`${millions}M`);
  }
  if (num >= 1_000 && num % 1_000 === 0) {
    variants.push(`${num / 1_000}K`);
    variants.push(`${num / 1_000}k`);
    variants.push(`${num / 1_000},000`);
  }
  // Percentage-like (for things stored as 995 meaning 99.5%)
  if (num > 100 && num < 10000) {
    variants.push(`${(num / 10).toFixed(1)}%`);
    variants.push(`${(num / 100).toFixed(2)}%`);
  }
  return variants;
}

function main() {
  console.log("PricingMD Pre-Push Gate");
  console.log("=======================\n");

  // Step 1: Build
  if (!run("TypeScript build", "npx tsc")) {
    console.error("\nBuild failed — fix compilation errors first.");
    process.exit(1);
  }

  // Step 2: Schema validation
  run("Schema validation", "npx tsx scripts/validate.ts");

  // Step 3: Sanity checks
  run("Sanity checks", "npx tsx scripts/sanity-check.ts");

  // Step 4: Accuracy verification
  verifyAccuracy();

  // Step 5: MCP server tests
  run("MCP server tests", "npx tsx scripts/test-server.ts");

  // Step 6: Package check
  console.log(`\n${"=".repeat(60)}`);
  console.log("STEP: Package contents check");
  console.log("=".repeat(60));
  try {
    const packOutput = execSync("npm pack --dry-run 2>&1", { cwd: ROOT, encoding: "utf-8" });
    const hasScripts = packOutput.includes("scripts/");
    const hasRaw = packOutput.includes("data/raw/");
    const hasDb = packOutput.includes("discovery.db");
    const hasNodeModules = packOutput.includes("node_modules/");
    const hasSnapshots = packOutput.includes("data/snapshots/");

    if (hasScripts || hasRaw || hasDb || hasNodeModules || hasSnapshots) {
      console.error("✗ Package contains files that shouldn't ship:");
      if (hasScripts) console.error("  - scripts/ (should only be in source, not npm package)");
      if (hasRaw) console.error("  - data/raw/ (internal data, not for distribution)");
      if (hasDb) console.error("  - discovery.db (internal database)");
      if (hasNodeModules) console.error("  - node_modules/");
      if (hasSnapshots) console.error("  - data/snapshots/");
      failures++;
    } else {
      console.log("✓ Package contents check passed");
    }
  } catch {
    console.error("✗ Package check failed");
    failures++;
  }

  // Summary
  console.log(`\n${"=".repeat(60)}`);
  console.log("PRE-PUSH SUMMARY");
  console.log("=".repeat(60));

  if (failures === 0) {
    console.log("\n✓ ALL CHECKS PASSED — safe to push\n");
    process.exit(0);
  } else {
    console.error(`\n✗ ${failures} CHECK(S) FAILED — do NOT push until these are resolved\n`);
    process.exit(1);
  }
}

main();
