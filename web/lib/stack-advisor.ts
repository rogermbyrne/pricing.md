import { Registry } from "../../src/registry/registry.js";

// Open-source / self-hostable alternatives mapping
// Maps commercial tools → their OSS alternatives (by tool ID in our registry)
const OSS_ALTERNATIVES: Record<string, { ossTools: string[]; note: string }> = {
  // Hosting
  hosting: {
    ossTools: ["coolify", "dokku"],
    note: "Self-host on a $5-10/mo VPS (Hetzner, DigitalOcean). Coolify gives you a Heroku-like UI. Dokku is CLI-driven.",
  },
  // Database
  database: {
    ossTools: ["pocketbase", "supabase"],
    note: "PocketBase is a single-binary backend (SQLite, auth, storage) — free forever on your own VPS. Supabase is open-source and self-hostable with PostgreSQL.",
  },
  // Auth
  auth: {
    ossTools: ["supertokens", "hanko", "ory", "zitadel", "stack-auth"],
    note: "SuperTokens, Hanko, Ory, Zitadel, and Stack Auth all offer free self-hosted options with no user limits.",
  },
  // Email
  email: {
    ossTools: ["plunk"],
    note: "Plunk is open-source (AGPL-3.0) and self-hostable via Docker. Built on AWS SES — you pay SES costs only (~$0.10/1K emails).",
  },
  // Monitoring
  monitoring: {
    ossTools: ["grafana-cloud", "highlight"],
    note: "Grafana stack (Prometheus + Loki + Tempo) is fully open-source. Highlight.io is open-source full-stack observability. Self-host for free.",
  },
  // Search
  search: {
    ossTools: ["typesense", "meilisearch"],
    note: "Both Typesense and Meilisearch are open-source and self-hostable. No per-search fees when self-hosted.",
  },
  // CMS
  cms: {
    ossTools: ["ghost", "strapi-cloud", "payload", "directus"],
    note: "Ghost (MIT), Strapi (MIT), Payload (MIT), and Directus (BSL) are all self-hostable. $0/mo on your own server.",
  },
  // Feature Flags
  "feature-flags": {
    ossTools: ["unleash", "flagsmith", "growthbook", "flipt"],
    note: "Unleash, Flagsmith, GrowthBook, and Flipt are all open-source. Self-host for unlimited flags and users.",
  },
  // Analytics
  analytics: {
    ossTools: ["umami", "matomo", "plausible"],
    note: "Umami (MIT) and Matomo (GPL) are free to self-host. Plausible is open-source and self-hostable too. No per-pageview costs.",
  },
  // Queues/Workflows
  queues: {
    ossTools: ["windmill"],
    note: "Windmill is open-source (AGPL-3.0). Self-host for unlimited workflow executions.",
  },
  // Notifications
  notifications: {
    ossTools: ["novu"],
    note: "Novu is open-source and self-hostable for unlimited notifications.",
  },
  // Storage
  storage: {
    ossTools: [],
    note: "MinIO (not in registry) is the main OSS S3-compatible storage. Self-host on your own hardware.",
  },
  // CI/CD
  "ci-cd": {
    ossTools: ["earthly", "dagger"],
    note: "Earthly and Dagger cores are open-source. Combined with GitHub Actions free tier (2K minutes/mo), you can avoid paid CI.",
  },
};

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
- Include free tier limits where relevant

Migration Path Strategy:
- For each category, consider whether different tools are optimal at different growth stages
- Start with free tiers to minimize burn. If Tool A has the best free tier but Tool B is cheaper at 100K users, recommend starting with A and migrating to B later
- Only recommend migrations where switchingCost is "drop-in" or "moderate" — never recommend migrating between tools with "significant" or "architectural" switching costs unless the user explicitly asks
- When tools share an open standard (e.g., PostgreSQL wire protocol, SMTP, S3-compatible), highlight that migration is straightforward and low-risk
- Show the migration path as a timeline: "0-1K: Neon Free → 10K: Neon Launch ($30/mo) → 100K: consider PlanetScale (PostgreSQL compatible, moderate switch)"
- Flag what you lose AND what you gain when switching — e.g., "You lose: Neon branching and scale-to-zero. You gain: horizontal sharding and $15/mo savings"
- If staying with one tool across all scales is cheapest and has no lock-in issues, say so — don't force migrations for the sake of it
- The goal is to maximize free tier usage early, then optimize cost at each growth stage while keeping migrations realistic

Open Source / Self-Hosted Route:
- When presenting recommendations, always mention the self-hosted alternative if one exists. Use get_oss_alternatives to find them.
- Present it as a separate "Self-Hosted Route" section — not everyone wants to manage infrastructure, but those who do can save significantly
- For each OSS alternative, note: what it replaces, that it's free to self-host, and what the trade-off is (you manage the server, updates, backups)
- A typical self-hosted stack on a $10-20/mo VPS (Coolify + PocketBase + Plunk + Umami) can replace $200+/mo in SaaS costs
- Always mention the operational overhead honestly — self-hosting is free in $ but costs in time
- If the user asks specifically about open source or self-hosting, go deep on this route with a full self-hosted stack recommendation`;

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
  {
    name: "get_oss_alternatives" as const,
    description:
      "Get open-source/self-hostable alternatives for a category. Returns tool IDs of OSS options and notes about self-hosting.",
    input_schema: {
      type: "object" as const,
      properties: {
        category: {
          type: "string",
          description: "Tool category to find OSS alternatives for",
        },
      },
      required: ["category"],
    },
  },
];

type ToolName = "find_cheapest" | "estimate_cost" | "get_tool" | "get_oss_alternatives";

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

    case "get_oss_alternatives": {
      const { category } = toolInput;
      const mapping = OSS_ALTERNATIVES[category];

      if (!mapping) {
        return { category, ossTools: [], note: "No known open-source alternatives in this category." };
      }

      // Enrich with actual tool data from registry
      const enriched = mapping.ossTools
        .map((id) => {
          const tool = registry.get(id);
          if (!tool) return null;
          const freeTier = tool.tiers.find((t) => t.pricingModel === "free" || t.basePrice === 0);
          return {
            id: tool.id,
            name: tool.name,
            description: tool.description,
            url: tool.url,
            hasFreeOrSelfHosted: !!freeTier,
            lowestPrice: freeTier ? 0 : Math.min(...tool.tiers.filter((t) => t.basePrice !== null).map((t) => t.basePrice!)),
            portability: tool.portability,
          };
        })
        .filter(Boolean);

      return {
        category,
        ossTools: enriched,
        note: mapping.note,
      };
    }

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}
