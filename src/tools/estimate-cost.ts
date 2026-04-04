import { z } from "zod";
import type { Registry } from "../registry/registry.js";

export const estimateCostSchema = z.object({
  toolId: z.string().max(100).regex(/^[a-z0-9][a-z0-9-]*$/).describe("The tool ID to estimate cost for"),
  usage: z.record(z.string().max(100), z.number().nonnegative().max(999_999_999_999)).describe("Usage quantities by metric name, e.g. {emails: 50000, storage: 10}"),
  seats: z.number().int().min(1).max(10_000).optional().describe("Number of team seats (default 1). Affects per-seat pricing on tools like Vercel, Buildkite, etc."),
  tierSlug: z.string().max(100).regex(/^[a-z0-9][a-z0-9-]*$/).optional().describe("Estimate for a specific tier only"),
});

export function handleEstimateCost(registry: Registry, params: z.infer<typeof estimateCostSchema>) {
  const tool = registry.get(params.toolId);
  if (!tool) {
    return { error: "Tool not found. Use search_tools to find available tools." };
  }

  const estimates = registry.estimateCost(params);

  if (estimates.length === 0) {
    return { error: "No estimable tiers found. Enterprise/custom tiers cannot be estimated." };
  }

  const STALE_DAYS = 90;
  const now = new Date();
  const lastVerified = new Date(tool.lastVerified);
  const daysSinceVerified = Math.floor((now.getTime() - lastVerified.getTime()) / (1000 * 60 * 60 * 24));
  const isStale = daysSinceVerified > STALE_DAYS;

  // Find the cheapest viable tier (exclude tiers that exceed limits)
  const viableEstimates = estimates.filter((est) => !est.exceedsLimits);
  const cheapest = viableEstimates.length > 0
    ? viableEstimates.reduce((min, est) => est.totalMonthly < min.totalMonthly ? est : min)
    : estimates.reduce((min, est) => est.totalMonthly < min.totalMonthly ? est : min);

  // Find breakpoints — where does the next tier become cheaper?
  const breakpoints = findBreakpoints(estimates);

  return {
    toolId: tool.id,
    toolName: tool.name,
    currency: tool.currency,
    estimates: estimates.map((est) => ({
      ...est,
      isCheapest: est.tierSlug === cheapest.tierSlug,
    })),
    cheapestTier: cheapest.tierSlug,
    ...(breakpoints.length > 0 ? { breakpoints } : {}),
    ...(isStale ? { warning: `Pricing last verified ${daysSinceVerified} days ago — confirm at ${tool.pricingUrl}` } : {}),
  };
}

interface Breakpoint {
  fromTier: string;
  toTier: string;
  note: string;
}

function findBreakpoints(estimates: ReturnType<Registry["estimateCost"]>): Breakpoint[] {
  const breakpoints: Breakpoint[] = [];
  const sorted = [...estimates].sort((a, b) => a.basePrice - b.basePrice);

  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];

    if (current.totalMonthly > next.totalMonthly) {
      breakpoints.push({
        fromTier: current.tierSlug,
        toTier: next.tierSlug,
        note: `${next.tierName} ($${next.totalMonthly.toFixed(2)}/mo) is cheaper than ${current.tierName} ($${current.totalMonthly.toFixed(2)}/mo) at this usage level`,
      });
    }
  }

  return breakpoints;
}
