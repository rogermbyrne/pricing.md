import { z } from "zod";
import type { Registry } from "../registry/registry.js";

export const getPricingSchema = z.object({
  toolId: z.string().max(100).regex(/^[a-z0-9][a-z0-9-]*$/).describe("The tool ID (slug) to get full pricing for"),
});

export function handleGetPricing(registry: Registry, params: z.infer<typeof getPricingSchema>) {
  const tool = registry.get(params.toolId);
  if (!tool) {
    return { error: "Tool not found. Use search_tools to find available tools." };
  }

  const STALE_DAYS = 90;
  const now = new Date();
  const lastVerified = new Date(tool.lastVerified);
  const daysSinceVerified = Math.floor((now.getTime() - lastVerified.getTime()) / (1000 * 60 * 60 * 24));
  const isStale = daysSinceVerified > STALE_DAYS;

  return {
    ...tool,
    ...(isStale ? { warning: `Pricing last verified ${daysSinceVerified} days ago — confirm at ${tool.pricingUrl}` } : {}),
  };
}
