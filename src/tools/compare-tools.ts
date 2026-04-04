import { z } from "zod";
import type { Registry } from "../registry/registry.js";
import type { ToolEntry } from "../schema/pricing.js";

export const compareToolsSchema = z.object({
  toolIds: z.array(z.string().max(100).regex(/^[a-z0-9][a-z0-9-]*$/)).min(2).max(5).refine((ids) => new Set(ids).size === ids.length, "Duplicate tool IDs not allowed").describe("Tool IDs to compare (2-5)"),
  tierFilter: z.string().max(100).regex(/^[a-z0-9][a-z0-9-]*$/).optional().describe("Only show tiers matching this slug (e.g., 'free', 'pro')"),
  usage: z.record(z.string().max(100), z.number().nonnegative().max(999_999_999_999)).optional().describe("Usage quantities to estimate cost for each tool, e.g. {emails: 75000}"),
  seats: z.number().int().min(1).max(10_000).optional().describe("Number of team seats for cost estimation (default 1)"),
});

export function handleCompareTools(registry: Registry, params: z.infer<typeof compareToolsSchema>) {
  const tools = registry.compare(params.toolIds);
  const STALE_DAYS = 90;
  const now = new Date();

  // Detect mixed currencies
  const currencies = new Set<string>();
  for (const tool of tools) {
    if (tool) currencies.add(tool.currency);
  }
  const hasMixedCurrencies = currencies.size > 1;

  const comparison = params.toolIds.map((id, i) => {
    const tool = tools[i];
    if (!tool) return { id, error: "Tool not found" };

    const lastVerified = new Date(tool.lastVerified);
    const daysSinceVerified = Math.floor((now.getTime() - lastVerified.getTime()) / (1000 * 60 * 60 * 24));
    const isStale = daysSinceVerified > STALE_DAYS;

    let tiers = tool.tiers;
    if (params.tierFilter) {
      tiers = tiers.filter((t) => t.slug === params.tierFilter);
    }

    // Build cost estimates if usage was provided
    let costEstimate = undefined;
    if (params.usage && Object.keys(params.usage).length > 0) {
      const estimates = registry.estimateCost({
        toolId: tool.id,
        usage: params.usage,
        seats: params.seats,
        tierSlug: params.tierFilter,
      });
      const viable = estimates.filter((e) => !e.exceedsLimits);
      const cheapest = viable.length > 0
        ? viable.reduce((min, e) => e.totalMonthly < min.totalMonthly ? e : min)
        : estimates.length > 0
          ? estimates.reduce((min, e) => e.totalMonthly < min.totalMonthly ? e : min)
          : null;

      if (cheapest) {
        costEstimate = {
          cheapestTier: cheapest.tierName,
          cheapestTierSlug: cheapest.tierSlug,
          totalMonthly: cheapest.totalMonthly,
          basePrice: cheapest.basePrice,
          seatCost: cheapest.seatCost,
          usageCosts: cheapest.usageCosts,
          exceedsLimits: cheapest.exceedsLimits,
          ...(cheapest.limitWarnings.length > 0 ? { limitWarnings: cheapest.limitWarnings } : {}),
        };
      }
    }

    return {
      id: tool.id,
      name: tool.name,
      category: tool.category,
      currency: tool.currency,
      portability: tool.portability,
      tiers: tiers.map((tier) => ({
        name: tier.name,
        slug: tier.slug,
        pricingModel: tier.pricingModel,
        basePrice: tier.basePrice,
        seatPrice: tier.seatPrice,
        annualDiscount: tier.annualDiscount,
        usageMetrics: tier.usageMetrics.map((m) => ({
          name: m.name,
          unit: m.unit,
          pricePerUnit: m.pricePerUnit,
          unitQuantity: m.unitQuantity,
          includedQuantity: m.includedQuantity,
        })),
        keyFeatures: tier.features.filter((f) => f.included).map((f) => f.name),
        limits: tier.limits,
      })),
      ...(costEstimate ? { costEstimate } : {}),
      lastVerified: tool.lastVerified,
      ...(isStale ? { warning: `Pricing last verified ${daysSinceVerified} days ago — confirm at ${tool.pricingUrl}` } : {}),
    };
  });

  // Generate a quick summary of free tier differences
  const freeTierSummary = buildFreeTierSummary(tools.filter((t): t is ToolEntry => t !== null));

  return {
    tools: comparison,
    ...(freeTierSummary ? { freeTierSummary } : {}),
    ...(hasMixedCurrencies ? {
      currencyWarning: `Tools use different currencies (${[...currencies].join(", ")}). Costs are NOT directly comparable without conversion.`,
    } : {}),
  };
}

function buildFreeTierSummary(tools: ToolEntry[]): string | null {
  const freeInfo = tools
    .map((tool) => {
      const freeTier = tool.tiers.find((t) => t.pricingModel === "free" || t.basePrice === 0);
      if (!freeTier) return null;
      const limitStr = Object.entries(freeTier.limits)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");
      return `${tool.name}: ${freeTier.name}${limitStr ? ` (${limitStr})` : ""}`;
    })
    .filter(Boolean);

  if (freeInfo.length === 0) return null;
  return freeInfo.join(" | ");
}
