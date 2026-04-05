import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Registry } from "./registry/registry.js";
import { searchToolsSchema, handleSearchTools } from "./tools/search-tools.js";
import { getPricingSchema, handleGetPricing } from "./tools/get-pricing.js";
import { compareToolsSchema, handleCompareTools } from "./tools/compare-tools.js";
import { estimateCostSchema, handleEstimateCost } from "./tools/estimate-cost.js";
import { findCheapestSchema, handleFindCheapest } from "./tools/find-cheapest.js";
import { growthCostSchema, handleGrowthCost } from "./tools/growth-cost.js";

function respond(result: unknown) {
  if (result && typeof result === "object" && "error" in result) {
    return {
      content: [{ type: "text" as const, text: (result as { error: string }).error }],
      isError: true,
    };
  }
  return {
    content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
  };
}

export function createServer(registry: Registry): McpServer {
  const server = new McpServer({
    name: "pricing.md",
    version: "1.0.0",
  });

  server.tool(
    "search_tools",
    "Search and filter developer tools by category, price range, tags, or text query. Returns a summary of each matching tool with free tier info, lowest paid price, and portability assessment.",
    searchToolsSchema.shape,
    async (params) => respond(handleSearchTools(registry, params))
  );

  server.tool(
    "get_pricing",
    "Get full pricing details for a specific developer tool, including all tiers, usage metrics, features, limits, and portability info.",
    getPricingSchema.shape,
    async (params) => respond(handleGetPricing(registry, params))
  );

  server.tool(
    "compare_tools",
    "Compare 2-5 developer tools side by side. Shows pricing tiers, usage metrics, limits, and portability. Optionally pass usage quantities and seats to see which tool is cheapest at your volume. Warns when comparing tools with different currencies.",
    compareToolsSchema.shape,
    async (params) => respond(handleCompareTools(registry, params))
  );

  server.tool(
    "estimate_cost",
    "Estimate monthly cost for a tool given specific usage quantities and team size. Returns cost breakdown per tier including seat costs, identifies the cheapest option, and flags breakpoints where upgrading becomes cheaper.",
    estimateCostSchema.shape,
    async (params) => respond(handleEstimateCost(registry, params))
  );

  server.tool(
    "find_cheapest",
    "Find the cheapest tool in a category for your specific usage. Compares all tools side by side, showing the best tier per tool ranked by total monthly cost. Includes portability info to weigh cost vs lock-in.",
    findCheapestSchema.shape,
    async (params) => respond(handleFindCheapest(registry, params))
  );

  server.tool(
    "growth_cost",
    "Compare what tools actually cost at realistic growth, not just their free tier or starting price. Uses standard growth scenarios per category (e.g. 100K MAU for auth, 50GB+500GB BW for databases, 100K emails for email). Shows entry price → scale price for each tool, ranked cheapest first. Exposes the free-tier-to-paid cliff.",
    growthCostSchema.shape,
    async (params) => respond(handleGrowthCost(registry, params))
  );

  return server;
}
