import { z } from "zod";
import { CategoryEnum } from "../schema/pricing.js";
import type { Registry, CostEstimate } from "../registry/registry.js";

export const findCheapestSchema = z.object({
  category: CategoryEnum.describe("Tool category to search within"),
  usage: z.record(z.string().max(100), z.number().nonnegative().max(999_999_999_999)).describe("Usage quantities by metric name, e.g. {emails: 75000}"),
  seats: z.number().int().min(1).max(10_000).optional().describe("Number of team seats (default 1)"),
});

interface RankedTool {
  toolId: string;
  toolName: string;
  tierName: string;
  tierSlug: string;
  currency: string;
  totalMonthly: number;
  seatCost: number;
  basePrice: number;
  usageCosts: CostEstimate["usageCosts"];
  portability: { switchingCost: string; openStandard: string | null };
  exceedsLimits: boolean;
  limitWarnings: string[];
}

export function handleFindCheapest(registry: Registry, params: z.infer<typeof findCheapestSchema>) {
  const tools = registry.search({ category: params.category });

  if (tools.length === 0) {
    return { error: `No tools found in category "${params.category}".` };
  }

  const ranked: RankedTool[] = [];

  for (const tool of tools) {
    const estimates = registry.estimateCost({
      toolId: tool.id,
      usage: params.usage,
      seats: params.seats,
    });

    // Pick the cheapest viable tier per tool
    const viable = estimates.filter((e) => !e.exceedsLimits);
    const best = viable.length > 0
      ? viable.reduce((min, e) => e.totalMonthly < min.totalMonthly ? e : min)
      : null;

    if (best) {
      ranked.push({
        toolId: best.toolId,
        toolName: best.toolName,
        tierName: best.tierName,
        tierSlug: best.tierSlug,
        currency: best.currency,
        totalMonthly: best.totalMonthly,
        seatCost: best.seatCost,
        basePrice: best.basePrice,
        usageCosts: best.usageCosts,
        portability: {
          switchingCost: tool.portability.switchingCost,
          openStandard: tool.portability.openStandard,
        },
        exceedsLimits: false,
        limitWarnings: [],
      });
    } else if (estimates.length > 0) {
      // All tiers exceed limits — show the least-bad option
      const leastBad = estimates.reduce((min, e) => e.totalMonthly < min.totalMonthly ? e : min);
      ranked.push({
        toolId: leastBad.toolId,
        toolName: leastBad.toolName,
        tierName: leastBad.tierName,
        tierSlug: leastBad.tierSlug,
        currency: leastBad.currency,
        totalMonthly: leastBad.totalMonthly,
        seatCost: leastBad.seatCost,
        basePrice: leastBad.basePrice,
        usageCosts: leastBad.usageCosts,
        portability: {
          switchingCost: tool.portability.switchingCost,
          openStandard: tool.portability.openStandard,
        },
        exceedsLimits: true,
        limitWarnings: leastBad.limitWarnings,
      });
    }
  }

  ranked.sort((a, b) => a.totalMonthly - b.totalMonthly);

  const STALE_DAYS = 90;
  const now = new Date();
  const staleTools = tools.filter((t) => {
    const days = Math.floor((now.getTime() - new Date(t.lastVerified).getTime()) / (1000 * 60 * 60 * 24));
    return days > STALE_DAYS;
  });

  const currencies = new Set(tools.map((t) => t.currency));
  const hasMixedCurrencies = currencies.size > 1;

  const warnings: string[] = [];
  if (staleTools.length > 0) {
    warnings.push(`${staleTools.length} tool(s) have pricing data older than 90 days: ${staleTools.map((t) => t.id).join(", ")}`);
  }
  if (hasMixedCurrencies) {
    warnings.push(`Tools use different currencies (${[...currencies].join(", ")}). Cost ranking may be misleading without conversion.`);
  }

  return {
    category: params.category,
    usage: params.usage,
    ...(params.seats ? { seats: params.seats } : {}),
    results: ranked,
    ...(warnings.length > 0 ? { warnings } : {}),
  };
}
