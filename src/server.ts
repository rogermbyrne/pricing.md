import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { Registry } from "./registry/registry.js";
import { searchToolsSchema, handleSearchTools } from "./tools/search-tools.js";
import { getPricingSchema, handleGetPricing } from "./tools/get-pricing.js";
import { compareToolsSchema, handleCompareTools } from "./tools/compare-tools.js";
import { estimateCostSchema, handleEstimateCost } from "./tools/estimate-cost.js";
import { findCheapestSchema, handleFindCheapest } from "./tools/find-cheapest.js";
import { growthCostSchema, handleGrowthCost } from "./tools/growth-cost.js";

export const SERVER_INFO = {
  name: "pricing.md",
  version: "1.2.1",
};

export const SERVER_INSTRUCTIONS =
  "Use pricing.md to answer developer tool cost questions with verified data instead of guessing. " +
  "Start with search_tools to find candidates in a category, then get_pricing for one tool's full tiers. " +
  "Use compare_tools for a side-by-side of 2-5 tools, estimate_cost when the user gives concrete usage numbers, " +
  "find_cheapest to rank a whole category at a given volume, and growth_cost to expose the free-tier cliff — " +
  "what a tool costs at realistic scale, not just at signup. Every tool is read-only; all data comes from the " +
  "registry at https://latest.sh.";

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

// Every tool is a pure read over the in-memory registry.
const READ_ONLY: ToolAnnotations = {
  readOnlyHint: true,
  idempotentHint: true,
  destructiveHint: false,
  openWorldHint: false,
};

// Single source of truth for the tool catalog — consumed by createServer (stdio +
// Streamable HTTP) and by the MCP server card at /.well-known/mcp/server-card.json.
export const TOOL_METADATA = {
  search_tools: {
    title: "Search tools",
    description:
      "Search and filter developer tools by category, price range, tags, or text query. Returns a summary of each matching tool with free tier info, lowest paid price, and portability assessment.",
  },
  get_pricing: {
    title: "Get pricing",
    description:
      "Get full pricing details for a specific developer tool, including all tiers, usage metrics, features, limits, and portability info.",
  },
  compare_tools: {
    title: "Compare tools",
    description:
      "Compare 2-5 developer tools side by side. Shows pricing tiers, usage metrics, limits, and portability. Optionally pass usage quantities and seats to see which tool is cheapest at your volume. Warns when comparing tools with different currencies.",
  },
  estimate_cost: {
    title: "Estimate cost",
    description:
      "Estimate monthly cost for a tool given specific usage quantities and team size. Returns cost breakdown per tier including seat costs, identifies the cheapest option, and flags breakpoints where upgrading becomes cheaper.",
  },
  find_cheapest: {
    title: "Find cheapest",
    description:
      "Find the cheapest tool in a category for your specific usage. Compares all tools side by side, showing the best tier per tool ranked by total monthly cost. Includes portability info to weigh cost vs lock-in.",
  },
  growth_cost: {
    title: "Growth cost",
    description:
      "Compare what tools actually cost at realistic growth, not just their free tier or starting price. Uses standard growth scenarios per category (e.g. 100K MAU for auth, 50GB+500GB BW for databases, 100K emails for email). Shows entry price \u2192 scale price for each tool, ranked cheapest first. Exposes the free-tier-to-paid cliff.",
  },
} as const;

function annotate(name: keyof typeof TOOL_METADATA): ToolAnnotations {
  return { title: TOOL_METADATA[name].title, ...READ_ONLY };
}

export function createServer(registry: Registry): McpServer {
  const server = new McpServer(SERVER_INFO, { instructions: SERVER_INSTRUCTIONS });

  server.registerTool(
    "search_tools",
    { ...TOOL_METADATA.search_tools, inputSchema: searchToolsSchema.shape, annotations: annotate("search_tools") },
    async (params) => respond(handleSearchTools(registry, params))
  );

  server.registerTool(
    "get_pricing",
    { ...TOOL_METADATA.get_pricing, inputSchema: getPricingSchema.shape, annotations: annotate("get_pricing") },
    async (params) => respond(handleGetPricing(registry, params))
  );

  server.registerTool(
    "compare_tools",
    { ...TOOL_METADATA.compare_tools, inputSchema: compareToolsSchema.shape, annotations: annotate("compare_tools") },
    async (params) => respond(handleCompareTools(registry, params))
  );

  server.registerTool(
    "estimate_cost",
    { ...TOOL_METADATA.estimate_cost, inputSchema: estimateCostSchema.shape, annotations: annotate("estimate_cost") },
    async (params) => respond(handleEstimateCost(registry, params))
  );

  server.registerTool(
    "find_cheapest",
    { ...TOOL_METADATA.find_cheapest, inputSchema: findCheapestSchema.shape, annotations: annotate("find_cheapest") },
    async (params) => respond(handleFindCheapest(registry, params))
  );

  server.registerTool(
    "growth_cost",
    { ...TOOL_METADATA.growth_cost, inputSchema: growthCostSchema.shape, annotations: annotate("growth_cost") },
    async (params) => respond(handleGrowthCost(registry, params))
  );

  return server;
}
