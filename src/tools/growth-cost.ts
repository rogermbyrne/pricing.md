import { z } from "zod";
import { CategoryEnum } from "../schema/pricing.js";
import type { Registry } from "../registry/registry.js";
import { GROWTH_SCENARIOS, computeGrowthCost } from "../../web/lib/growth-scenarios.js";

export const growthCostSchema = z.object({
  category: CategoryEnum.describe("Tool category to compare growth costs for"),
});

export function handleGrowthCost(registry: Registry, params: z.infer<typeof growthCostSchema>) {
  const scenario = GROWTH_SCENARIOS[params.category];

  if (!scenario) {
    const available = Object.keys(GROWTH_SCENARIOS).join(", ");
    return { error: `No growth scenario defined for "${params.category}". Available: ${available}` };
  }

  const tools = registry.search({ category: params.category });

  if (tools.length === 0) {
    return { error: `No tools found in category "${params.category}".` };
  }

  const results = tools
    .map((tool) => {
      const hasFree = tool.tiers.some((t) => t.pricingModel === "free" || t.basePrice === 0);
      const paidTiers = tool.tiers.filter((t) => t.basePrice !== null && t.basePrice > 0);
      const entryPrice = hasFree ? 0 : paidTiers.length > 0 ? Math.min(...paidTiers.map((t) => t.basePrice!)) : null;
      const growth = computeGrowthCost(registry, tool.id, scenario);

      return {
        toolId: tool.id,
        toolName: tool.name,
        entryPrice,
        growthCost: growth.cost,
        growthTier: growth.tierName,
        exceedsLimits: growth.exceedsLimits,
        switchingCost: tool.portability.switchingCost,
        openStandard: tool.portability.openStandard,
      };
    })
    .filter((r) => r.growthCost !== null)
    .sort((a, b) => a.growthCost! - b.growthCost!);

  return {
    category: params.category,
    scenario: scenario.label,
    results,
  };
}
