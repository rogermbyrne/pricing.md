/**
 * Sanity checks for pricing data — catches logical inconsistencies
 * without needing external data. Run after any data changes.
 */
import fs from "fs";
import path from "path";
import { ToolEntrySchema, type ToolEntry, type PricingTier } from "../src/schema/pricing.js";

const TOOLS_DIR = path.join(__dirname, "..", "data", "tools");

interface Issue {
  tool: string;
  severity: "error" | "warning";
  check: string;
  message: string;
}

function checkTool(tool: ToolEntry): Issue[] {
  const issues: Issue[] = [];
  const nonCustomTiers = tool.tiers.filter((t) => t.pricingModel !== "custom");

  // 1. Cross-tier price ordering — each tier should cost >= the previous
  for (let i = 1; i < nonCustomTiers.length; i++) {
    const prev = nonCustomTiers[i - 1];
    const curr = nonCustomTiers[i];
    if (prev.basePrice !== null && curr.basePrice !== null && curr.basePrice < prev.basePrice) {
      issues.push({
        tool: tool.id,
        severity: "error",
        check: "price-ordering",
        message: `${curr.name} ($${curr.basePrice}) is cheaper than ${prev.name} ($${prev.basePrice}) — tiers should increase in price`,
      });
    }
  }

  // 2. Free tier should be $0
  const freeTiers = tool.tiers.filter((t) => t.pricingModel === "free");
  for (const ft of freeTiers) {
    if (ft.basePrice !== null && ft.basePrice !== 0) {
      issues.push({
        tool: tool.id,
        severity: "error",
        check: "free-tier-price",
        message: `${ft.name} has pricingModel "free" but basePrice is $${ft.basePrice}, should be 0`,
      });
    }
  }

  // 3. Base prices should be non-negative (or null for custom)
  for (const tier of tool.tiers) {
    if (tier.basePrice !== null && tier.basePrice < 0) {
      issues.push({
        tool: tool.id,
        severity: "error",
        check: "negative-price",
        message: `${tier.name} has negative basePrice: $${tier.basePrice}`,
      });
    }
    if (tier.seatPrice !== null && tier.seatPrice < 0) {
      issues.push({
        tool: tool.id,
        severity: "error",
        check: "negative-seat-price",
        message: `${tier.name} has negative seatPrice: $${tier.seatPrice}`,
      });
    }
  }

  // 4. Overage rates should decrease or stay equal as tiers go up
  const metricNames = new Set<string>();
  for (const tier of nonCustomTiers) {
    for (const m of tier.usageMetrics) {
      metricNames.add(m.name);
    }
  }

  for (const metricName of metricNames) {
    let prevRate: number | null = null;
    let prevTierName = "";
    for (const tier of nonCustomTiers) {
      const metric = tier.usageMetrics.find((m) => m.name === metricName);
      if (!metric || metric.pricePerUnit === 0) continue;

      if (prevRate !== null && metric.pricePerUnit > prevRate) {
        issues.push({
          tool: tool.id,
          severity: "warning",
          check: "overage-rate-ordering",
          message: `${metricName} overage increases from ${prevTierName} ($${prevRate}) to ${tier.name} ($${metric.pricePerUnit}) — higher tiers usually have lower overage rates`,
        });
      }
      prevRate = metric.pricePerUnit;
      prevTierName = tier.name;
    }
  }

  // 5. Included quantities should increase with tier
  // Exception: free-to-paid drop is a known pattern (generous free tier, then paid with overage)
  for (const metricName of metricNames) {
    let prevQty: number | null = null;
    let prevTierName = "";
    let prevTierModel = "";
    for (const tier of nonCustomTiers) {
      const metric = tier.usageMetrics.find((m) => m.name === metricName);
      if (!metric) continue;

      const isFreeToPaidDrop = prevTierModel === "free" && tier.pricingModel !== "free" && metric.pricePerUnit > 0;

      if (prevQty !== null && metric.includedQuantity < prevQty && !isFreeToPaidDrop) {
        issues.push({
          tool: tool.id,
          severity: "error",
          check: "included-quantity-ordering",
          message: `${metricName} included quantity decreases from ${prevTierName} (${prevQty.toLocaleString()}) to ${tier.name} (${metric.includedQuantity.toLocaleString()})`,
        });
      }
      prevQty = metric.includedQuantity;
      prevTierName = tier.name;
      prevTierModel = tier.pricingModel;
    }
  }

  // 6. Usage metric units should be consistent across tiers
  for (const metricName of metricNames) {
    const units = new Set<string>();
    for (const tier of tool.tiers) {
      const metric = tier.usageMetrics.find((m) => m.name === metricName);
      if (metric) units.add(metric.unit);
    }
    if (units.size > 1) {
      issues.push({
        tool: tool.id,
        severity: "error",
        check: "unit-consistency",
        message: `${metricName} has inconsistent units across tiers: ${[...units].join(", ")}`,
      });
    }
  }

  // 7. Annual discount should be 0-50%
  for (const tier of tool.tiers) {
    if (tier.annualDiscount !== null) {
      if (tier.annualDiscount < 0 || tier.annualDiscount > 50) {
        issues.push({
          tool: tool.id,
          severity: "warning",
          check: "annual-discount-range",
          message: `${tier.name} has annual discount of ${tier.annualDiscount}% — expected 0-50%`,
        });
      }
    }
  }

  // 8. Limits should be stricter on lower tiers (for matching limit keys)
  const limitKeys = new Set<string>();
  for (const tier of nonCustomTiers) {
    for (const key of Object.keys(tier.limits)) {
      limitKeys.add(key);
    }
  }

  for (const key of limitKeys) {
    let prevVal: number | null = null;
    let prevTierName = "";
    for (const tier of nonCustomTiers) {
      const val = tier.limits[key];
      if (val === undefined) continue;

      if (prevVal !== null && val < prevVal) {
        issues.push({
          tool: tool.id,
          severity: "warning",
          check: "limit-ordering",
          message: `${key} limit decreases from ${prevTierName} (${prevVal}) to ${tier.name} (${val}) — higher tiers should have equal or higher limits`,
        });
      }
      prevVal = val;
      prevTierName = tier.name;
    }
  }

  // 9. unitQuantity should be consistent across tiers for the same metric
  for (const metricName of metricNames) {
    const unitQuantities = new Set<number>();
    for (const tier of tool.tiers) {
      const metric = tier.usageMetrics.find((m) => m.name === metricName);
      if (metric) unitQuantities.add(metric.unitQuantity);
    }
    if (unitQuantities.size > 1) {
      issues.push({
        tool: tool.id,
        severity: "warning",
        check: "unit-quantity-consistency",
        message: `${metricName} has different unitQuantity values across tiers: ${[...unitQuantities].join(", ")} — this may cause incorrect cost estimates`,
      });
    }
  }

  // 10. Tiered pricing should be sorted by upTo ascending
  for (const tier of tool.tiers) {
    for (const metric of tier.usageMetrics) {
      if (!metric.tieredPricing || metric.tieredPricing.length < 2) continue;
      for (let i = 1; i < metric.tieredPricing.length; i++) {
        const prev = metric.tieredPricing[i - 1];
        const curr = metric.tieredPricing[i];
        if (prev.upTo !== null && curr.upTo !== null && curr.upTo <= prev.upTo) {
          issues.push({
            tool: tool.id,
            severity: "error",
            check: "tiered-pricing-order",
            message: `${tier.name} ${metric.name}: tiered pricing not sorted — ${prev.upTo} should be less than ${curr.upTo}`,
          });
        }
      }
      // Last tier should have upTo: null (unlimited)
      const last = metric.tieredPricing[metric.tieredPricing.length - 1];
      if (last.upTo !== null) {
        issues.push({
          tool: tool.id,
          severity: "warning",
          check: "tiered-pricing-cap",
          message: `${tier.name} ${metric.name}: last tiered pricing entry has upTo: ${last.upTo} instead of null (unlimited) — usage beyond this won't be priced`,
        });
      }
    }
  }

  return issues;
}

function main() {
  const files = fs.readdirSync(TOOLS_DIR).filter((f) => f.endsWith(".json"));
  console.log(`Running sanity checks on ${files.length} tools...\n`);

  let totalErrors = 0;
  let totalWarnings = 0;
  let cleanTools = 0;

  for (const file of files) {
    const raw = fs.readFileSync(path.join(TOOLS_DIR, file), "utf-8");
    const result = ToolEntrySchema.safeParse(JSON.parse(raw));
    if (!result.success) {
      console.log(`  SKIP  ${file} — schema validation failed`);
      continue;
    }

    const issues = checkTool(result.data);
    const errors = issues.filter((i) => i.severity === "error");
    const warnings = issues.filter((i) => i.severity === "warning");

    if (issues.length === 0) {
      console.log(`  CLEAN ${result.data.id}`);
      cleanTools++;
    } else {
      console.log(`  CHECK ${result.data.id} — ${errors.length} errors, ${warnings.length} warnings`);
      for (const issue of issues) {
        const icon = issue.severity === "error" ? "    ERROR" : "    WARN ";
        console.log(`${icon} [${issue.check}] ${issue.message}`);
      }
    }

    totalErrors += errors.length;
    totalWarnings += warnings.length;
  }

  console.log(`\n========================================`);
  console.log(`SANITY CHECK SUMMARY`);
  console.log(`========================================\n`);
  console.log(`Tools checked: ${files.length}`);
  console.log(`Clean:         ${cleanTools}`);
  console.log(`Errors:        ${totalErrors}`);
  console.log(`Warnings:      ${totalWarnings}`);

  process.exit(totalErrors > 0 ? 1 : 0);
}

main();
