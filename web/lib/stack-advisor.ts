import { Registry } from "../../src/registry/registry.js";

export const SYSTEM_PROMPT = `You are the Pricing.md Stack Advisor — a developer tool pricing advisor with access to real pricing data for 197+ tools across 17 categories.

When a user describes an app they want to build:
1. Identify the categories of tools they'll need (auth, database, hosting, email, etc.)
2. Call find_cheapest for each category with realistic usage estimates
3. Present recommendations with pricing at 3 scales: 1K users, 10K users, 100K users

Rules:
- ALWAYS use tools to look up real prices. Never guess or hallucinate pricing.
- Format recommendations using markdown tables
- Flag pricing cliffs (where costs jump dramatically between tiers)
- Flag lock-in risks (proprietary APIs, data export difficulty)
- Be concise — bullet points and tables, not essays
- If a user asks about a specific tool, use estimate_cost or get_tool
- Show the cheapest viable option first, then alternatives
- Include free tier limits where relevant`;

export const TOOLS = [
  {
    name: "find_cheapest" as const,
    description:
      "Find cheapest tools in a category for given usage metrics. Returns ranked tools with total monthly cost.",
    input_schema: {
      type: "object" as const,
      properties: {
        category: {
          type: "string",
          description: "Tool category",
          enum: [
            "hosting",
            "database",
            "auth",
            "email",
            "payments",
            "monitoring",
            "storage",
            "ci-cd",
            "search",
            "analytics",
            "feature-flags",
            "cms",
            "queues",
            "edge",
            "testing",
            "notifications",
            "scheduling",
          ],
        },
        usage: {
          type: "object",
          description:
            'Usage metrics as key-value pairs, e.g. {"emails": 50000}',
        },
        seats: {
          type: "number",
          description: "Number of developer seats",
        },
      },
      required: ["category"],
    },
  },
  {
    name: "estimate_cost" as const,
    description:
      "Estimate cost for a specific tool at given usage levels. Returns all tiers with cost breakdowns.",
    input_schema: {
      type: "object" as const,
      properties: {
        tool_id: {
          type: "string",
          description: "The tool ID (slug), e.g. 'vercel' or 'supabase'",
        },
        usage: {
          type: "object",
          description:
            'Usage metrics as key-value pairs, e.g. {"requests": 1000000}',
        },
        seats: {
          type: "number",
          description: "Number of developer seats",
        },
      },
      required: ["tool_id"],
    },
  },
  {
    name: "get_tool" as const,
    description:
      "Get full data for a specific tool including all tiers, pricing, limits, and portability info.",
    input_schema: {
      type: "object" as const,
      properties: {
        tool_id: {
          type: "string",
          description: "The tool ID (slug), e.g. 'vercel' or 'supabase'",
        },
      },
      required: ["tool_id"],
    },
  },
];

type ToolName = "find_cheapest" | "estimate_cost" | "get_tool";

export function executeTool(
  registry: Registry,
  toolName: ToolName,
  toolInput: Record<string, any>
): any {
  switch (toolName) {
    case "find_cheapest": {
      const { category, usage = {}, seats } = toolInput;
      const tools = registry.search({ category });

      const results = tools
        .map((tool) => {
          const estimates = registry.estimateCost({
            toolId: tool.id,
            usage,
            seats,
          });

          // Pick the cheapest non-exceeding tier, or cheapest overall
          const viable = estimates.filter((e) => !e.exceedsLimits);
          const best =
            viable.length > 0
              ? viable.sort((a, b) => a.totalMonthly - b.totalMonthly)[0]
              : estimates.sort((a, b) => a.totalMonthly - b.totalMonthly)[0];

          if (!best) return null;

          return {
            toolId: tool.id,
            toolName: tool.name,
            tier: best.tierName,
            totalMonthly: best.totalMonthly,
            basePrice: best.basePrice,
            seatCost: best.seatCost,
            usageCosts: best.usageCosts,
            exceedsLimits: best.exceedsLimits,
            limitWarnings: best.limitWarnings,
            portability: tool.portability,
          };
        })
        .filter(Boolean)
        .sort((a: any, b: any) => a.totalMonthly - b.totalMonthly)
        .slice(0, 5);

      return { category, usage, results };
    }

    case "estimate_cost": {
      const { tool_id, usage = {}, seats } = toolInput;
      const estimates = registry.estimateCost({
        toolId: tool_id,
        usage,
        seats,
      });

      if (estimates.length === 0) {
        return { error: `Tool '${tool_id}' not found or has no estimable tiers` };
      }

      return { toolId: tool_id, estimates };
    }

    case "get_tool": {
      const { tool_id } = toolInput;
      const tool = registry.get(tool_id);

      if (!tool) {
        return { error: `Tool '${tool_id}' not found` };
      }

      return tool;
    }

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}
