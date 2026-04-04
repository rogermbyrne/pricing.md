import { z } from "zod";
import { CategoryEnum } from "../schema/pricing.js";
import type { Registry } from "../registry/registry.js";

const MAX_RESULTS = 25;

export const searchToolsSchema = z.object({
  query: z.string().max(200).optional().describe("Text search across tool names, descriptions, tags, and categories"),
  category: CategoryEnum.optional().describe("Filter by category"),
  hasFreeOption: z.boolean().optional().describe("Only show tools with a free tier"),
  maxBasePrice: z.number().nonnegative().max(999_999_999).optional().describe("Maximum base price for any tier"),
  tags: z.array(z.string().max(50)).max(10).optional().describe("Filter by tags"),
  limit: z.number().int().min(1).max(50).optional().describe("Max results to return (default 25)"),
});

export function handleSearchTools(registry: Registry, params: z.infer<typeof searchToolsSchema>) {
  const limit = params.limit ?? MAX_RESULTS;
  const allResults = registry.search(params);
  const results = allResults.slice(0, limit);

  const STALE_DAYS = 90;
  const now = new Date();

  const tools = results.map((tool) => {
    const lastVerified = new Date(tool.lastVerified);
    const daysSinceVerified = Math.floor((now.getTime() - lastVerified.getTime()) / (1000 * 60 * 60 * 24));
    const isStale = daysSinceVerified > STALE_DAYS;

    const freeTier = tool.tiers.find((t) => t.pricingModel === "free" || t.basePrice === 0);
    const lowestPaidTier = tool.tiers
      .filter((t) => t.basePrice !== null && t.basePrice > 0)
      .sort((a, b) => (a.basePrice ?? 0) - (b.basePrice ?? 0))[0];

    return {
      id: tool.id,
      name: tool.name,
      description: tool.description,
      category: tool.category,
      url: tool.url,
      currency: tool.currency,
      freeTier: freeTier
        ? { name: freeTier.name, keyLimits: freeTier.limits }
        : null,
      lowestPaidPrice: lowestPaidTier?.basePrice ?? null,
      lowestPaidTierName: lowestPaidTier?.name ?? null,
      portability: tool.portability,
      lastVerified: tool.lastVerified,
      ...(isStale ? { warning: `Pricing last verified ${daysSinceVerified} days ago — confirm at ${tool.pricingUrl}` } : {}),
    };
  });

  return {
    tools,
    total: allResults.length,
    ...(allResults.length > limit ? { truncated: true, showing: limit } : {}),
  };
}
