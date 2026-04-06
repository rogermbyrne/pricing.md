import { ToolEntry } from "../schema/pricing.js";

export function generatePricingMarkdown(tool: ToolEntry): string {
  const isOfficial = tool.pricingUrl.endsWith("/pricing.md");

  const lines: string[] = [];

  lines.push(`# ${tool.name} Pricing`);
  lines.push("");

  if (isOfficial) {
    lines.push(
      `> Source: Official pricing.md published by ${tool.name} at ${tool.pricingUrl}`
    );
  } else {
    lines.push(
      `> Source: Community-maintained by [latest.sh](https://latest.sh/tool/${tool.id}) | Last verified: ${tool.lastVerified}`
    );
    lines.push(">");
    lines.push(
      `> ${tool.name} does not publish an official pricing.md file. [Help request one](https://latest.sh/tool/${tool.id}#request-transparency).`
    );
  }

  lines.push("");
  lines.push(`${tool.description}`);
  lines.push("");

  // Tiers
  lines.push("## Tiers");
  lines.push("");

  for (const tier of tool.tiers) {
    lines.push(`### ${tier.name}`);
    lines.push("");

    // Price
    const price =
      tier.basePrice === 0
        ? "Free"
        : tier.basePrice === null
          ? "Contact Sales"
          : `$${tier.basePrice}/mo`;
    lines.push(`- **Price:** ${price}`);
    lines.push(
      `- **Model:** ${tier.pricingModel.replace(/_/g, " ")}`
    );

    if (tier.seatPrice !== null) {
      lines.push(`- **Per seat:** $${tier.seatPrice}/seat`);
    }

    if (tier.annualDiscount) {
      lines.push(`- **Annual discount:** ${tier.annualDiscount}%`);
    }

    if (tier.billingPeriod) {
      lines.push(`- **Billing:** ${tier.billingPeriod}`);
    }

    // Included quantities and limits
    const includedMetrics = tier.usageMetrics.filter(
      (m) => m.includedQuantity > 0
    );
    // Skip limit keys already represented by an included metric
    const metricWords = includedMetrics.flatMap((m) =>
      m.name.toLowerCase().replace(/overage/g, "").split(/\s+/).filter((w) => w.length > 2)
    );
    const filteredLimits = Object.entries(tier.limits).filter(
      ([key]) => !metricWords.some((w) => key.toLowerCase().includes(w))
    );

    if (includedMetrics.length > 0 || filteredLimits.length > 0) {
      lines.push("");
      lines.push("**Includes:**");
      for (const m of includedMetrics) {
        const label = m.name.replace(/ Overage$/, "");
        lines.push(
          `- ${label}: ${m.includedQuantity.toLocaleString()} ${m.unit}`
        );
      }
      for (const [key, val] of filteredLimits) {
        lines.push(`- ${humanizeKey(key)}: ${val.toLocaleString()}`);
      }
    }

    // Overage pricing
    const overageMetrics = tier.usageMetrics.filter(
      (m) => m.pricePerUnit > 0
    );
    if (overageMetrics.length > 0) {
      lines.push("");
      lines.push("**Overage:**");
      for (const m of overageMetrics) {
        const perLabel =
          m.unitQuantity > 1
            ? `$${m.pricePerUnit} per ${m.unitQuantity.toLocaleString()} ${m.unit}`
            : `$${m.pricePerUnit} per ${m.unit}`;
        lines.push(`- ${m.name}: ${perLabel}`);
      }
    }

    lines.push("");
  }

  // Portability
  lines.push("## Portability");
  lines.push("");
  lines.push(`- **Switching cost:** ${tool.portability.switchingCost}`);
  lines.push(
    `- **Open standard:** ${tool.portability.openStandard || "Proprietary"}`
  );
  lines.push(`- **What you lose:** ${tool.portability.whatYouLose}`);
  lines.push("");

  // Footer
  lines.push("---");
  lines.push("");
  lines.push(
    `Data from [latest.sh/tool/${tool.id}](https://latest.sh/tool/${tool.id}) | [Browse all tools](https://latest.sh/browse)`
  );

  return lines.join("\n");
}

function humanizeKey(key: string): string {
  return key
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([a-z])([0-9])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\b(mb|gb|tb|mau|cpu|ram|api)\b/gi, (s) => s.toUpperCase())
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}
