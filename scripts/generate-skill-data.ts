import fs from "fs";
import path from "path";
import { ToolEntrySchema, type ToolEntry } from "../src/schema/pricing.js";

const TOOLS_DIR = path.join(__dirname, "..", "data", "tools");

function formatTool(tool: ToolEntry): string {
  const lines: string[] = [];

  lines.push(`### ${tool.name}`);
  lines.push(`- **Category:** ${tool.category}`);
  lines.push(`- **URL:** ${tool.url}`);
  lines.push(`- **Portability:** ${tool.portability.switchingCost}${tool.portability.openStandard ? ` (${tool.portability.openStandard})` : " (proprietary)"}`);
  lines.push(`- **Lock-in risk:** ${tool.portability.whatYouLose}`);

  lines.push(`- **Tiers:**`);
  for (const tier of tool.tiers) {
    let priceStr: string;
    if (tier.pricingModel === "custom") {
      priceStr = "Custom (contact sales)";
    } else if (tier.basePrice === 0) {
      priceStr = "Free";
    } else if (tier.seatPrice) {
      priceStr = `$${tier.basePrice}/seat/mo`;
    } else {
      priceStr = `$${tier.basePrice}/mo`;
    }

    const limitParts: string[] = [];
    for (const metric of tier.usageMetrics) {
      if (metric.includedQuantity > 0) {
        const qty = metric.includedQuantity >= 1_000_000_000
          ? `${(metric.includedQuantity / 1_000_000_000).toFixed(0)}B`
          : metric.includedQuantity >= 1_000_000
          ? `${(metric.includedQuantity / 1_000_000).toFixed(0)}M`
          : metric.includedQuantity >= 1_000
          ? `${(metric.includedQuantity / 1_000).toFixed(0)}K`
          : `${metric.includedQuantity}`;
        limitParts.push(`${qty} ${metric.unit}`);
      }
    }
    for (const [key, val] of Object.entries(tier.limits)) {
      limitParts.push(`${key}: ${val}`);
    }

    const limitsStr = limitParts.length > 0 ? ` — ${limitParts.join(", ")}` : "";
    lines.push(`  - **${tier.name}:** ${priceStr}${limitsStr}`);

    // Show overage pricing for key metrics
    for (const metric of tier.usageMetrics) {
      if (metric.pricePerUnit > 0 && metric.includedQuantity > 0) {
        const qtyLabel = metric.unitQuantity >= 1_000_000
          ? `${(metric.unitQuantity / 1_000_000).toFixed(0)}M`
          : metric.unitQuantity >= 1_000
          ? `${(metric.unitQuantity / 1_000).toFixed(0)}K`
          : `${metric.unitQuantity}`;
        lines.push(`    - Overage: $${metric.pricePerUnit} per ${qtyLabel} ${metric.unit}`);
      }
    }
  }

  lines.push(`- **Last verified:** ${tool.lastVerified}`);
  lines.push(`- **Pricing source:** ${tool.pricingUrl}`);

  return lines.join("\n");
}

function main() {
  const files = fs.readdirSync(TOOLS_DIR).filter((f) => f.endsWith(".json"));
  const tools: ToolEntry[] = [];

  for (const file of files) {
    const raw = fs.readFileSync(path.join(TOOLS_DIR, file), "utf-8");
    const result = ToolEntrySchema.safeParse(JSON.parse(raw));
    if (result.success) tools.push(result.data);
  }

  // Group by category
  const byCategory = new Map<string, ToolEntry[]>();
  for (const tool of tools) {
    const list = byCategory.get(tool.category) || [];
    list.push(tool);
    byCategory.set(tool.category, list);
  }

  const output: string[] = [];

  for (const [category, catTools] of [...byCategory.entries()].sort()) {
    output.push(`## ${category.charAt(0).toUpperCase() + category.slice(1).replace(/-/g, " ")}`);
    output.push("");
    for (const tool of catTools.sort((a, b) => a.name.localeCompare(b.name))) {
      output.push(formatTool(tool));
      output.push("");
    }
  }

  console.log(output.join("\n"));
}

main();
