/**
 * Strips all tool JSON files to high-confidence data only:
 * - Removes feature arrays (most error-prone)
 * - Keeps tier names, base prices, key usage metrics, limits
 * - Keeps portability info
 * - Applies specific fixes for known errors
 */
import fs from "fs";
import path from "path";

const TOOLS_DIR = path.join(__dirname, "..", "data", "tools");

// Known fixes to apply
const FIXES: Record<string, (data: any) => void> = {
  "planetscale": (data) => {
    // Vitess Non-Metal maxMemoryGiB should be 256, not 512
    const tier = data.tiers.find((t: any) => t.slug === "vitess-non-metal");
    if (tier) tier.limits.maxMemoryGiB = 256;
  },
  "netlify": (data) => {
    // Personal credit pack is $5/500, not $10/500
    const personal = data.tiers.find((t: any) => t.slug === "personal");
    if (personal) {
      for (const m of personal.usageMetrics) {
        if (m.name === "credits" && m.pricePerUnit === 10) {
          m.pricePerUnit = 5;
        }
      }
    }
  },
  "vercel": (data) => {
    // Fix log drains unit from "drains" to "GB"
    for (const tier of data.tiers) {
      for (const m of tier.usageMetrics) {
        if (m.name === "log-drains" && m.unit === "drains") {
          m.unit = "GB";
        }
      }
    }
  },
  "neon": (data) => {
    // Fix storage units to GB-month
    for (const tier of data.tiers) {
      for (const m of tier.usageMetrics) {
        if (m.name === "storage" && m.unit === "GB") {
          m.unit = "GB-month";
        }
        if (m.name === "instant-restore" && m.unit === "GB") {
          m.unit = "GB-month";
        }
      }
    }
  },
  "descope": (data) => {
    // Fix billing period on Pro and Growth to annual
    const pro = data.tiers.find((t: any) => t.slug === "pro");
    if (pro) pro.billingPeriod = "annual";
    const growth = data.tiers.find((t: any) => t.slug === "growth");
    if (growth) growth.billingPeriod = "annual";
  },
  "workos": (data) => {
    // Fix 201+ connection tiers — remove the $50 fallback, cap tiered pricing at 200
    for (const tier of data.tiers) {
      for (const m of tier.usageMetrics) {
        if (m.tieredPricing) {
          // Remove the "unlimited at $50" tier if it's the fallback for 201+
          m.tieredPricing = m.tieredPricing.filter((tp: any) =>
            tp.upTo !== null || tp.pricePerUnit !== 50
          );
        }
      }
    }
  },
  "turso": (data) => {
    // Add missing syncs metric to paid tiers
    const syncsData: Record<string, { included: number; price: number }> = {
      "free": { included: 3, price: 0 },
      "developer": { included: 10, price: 0.35 },
      "scaler": { included: 24, price: 0.25 },
      "pro": { included: 100, price: 0.15 },
    };
    for (const tier of data.tiers) {
      const syncs = syncsData[tier.slug];
      if (syncs && !tier.usageMetrics.find((m: any) => m.name === "syncs")) {
        tier.usageMetrics.push({
          name: "syncs",
          unit: "GB",
          pricePerUnit: syncs.price,
          unitQuantity: 1,
          includedQuantity: syncs.included,
        });
      }
    }
  },
};

function main() {
  const files = fs.readdirSync(TOOLS_DIR).filter((f) => f.endsWith(".json"));
  let fixed = 0;
  let stripped = 0;

  for (const file of files) {
    const filePath = path.join(TOOLS_DIR, file);
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const id = data.id;

    // Apply specific fixes
    if (FIXES[id]) {
      FIXES[id](data);
      fixed++;
      console.log(`  FIXED  ${id}`);
    }

    // Strip features from all tiers
    let featuresRemoved = 0;
    for (const tier of data.tiers) {
      if (tier.features && tier.features.length > 0) {
        featuresRemoved += tier.features.length;
        tier.features = [];
      }
    }

    if (featuresRemoved > 0) {
      stripped++;
      console.log(`  STRIP  ${id} — removed ${featuresRemoved} features`);
    }

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
  }

  console.log(`\nDone. Fixed ${fixed} tools, stripped features from ${stripped} tools.`);
}

main();
