import crypto from "crypto";
import fs from "fs";
import path from "path";
import { Router, Request, Response, NextFunction } from "express";
import { Registry } from "../../src/registry/registry.js";
import { TOOL_METADATA, SERVER_INFO, SERVER_INSTRUCTIONS } from "../../src/server.js";
import { API_RATE_LIMIT } from "../lib/rate-limit.js";

const BASE = "https://latest.sh";

// AI agents that should get markdown instead of HTML when they fetch a page.
// Search crawlers (Googlebot, Bingbot) are deliberately excluded — they must see
// exactly what a human browser sees.
const MARKDOWN_AGENT_UA = /GPTBot|ChatGPT-User|OAI-SearchBot|ClaudeBot|Claude-User|Claude-SearchBot|anthropic-ai|PerplexityBot|Perplexity-User|ora-agent|CCBot|cohere-ai|YouBot/i;

function today(): string {
  return new Date().toISOString().split("T")[0] as string;
}

function wantsMarkdown(req: Request): boolean {
  if (req.query.mode === "agent") return true;
  if (req.accepts(["text/html", "text/markdown"]) === "text/markdown") return true;
  const ua = req.get("user-agent") || "";
  return MARKDOWN_AGENT_UA.test(ua);
}

function sendMarkdown(res: Response, body: string) {
  res.set("Content-Type", "text/markdown; charset=utf-8");
  res.set("Vary", "Accept, User-Agent");
  res.send(body);
}

function frontmatter(fields: Record<string, string>): string {
  const lines = Object.entries(fields).map(([k, v]) => `${k}: ${JSON.stringify(v)}`);
  return `---\n${lines.join("\n")}\n---\n`;
}

/** The homepage, as markdown — same content an agent would otherwise scrape out of the HTML. */
function homepageMarkdown(registry: Registry): string {
  const categories = registry.categories().filter((c) => c !== "ai-api");
  const tools = registry.allTools().filter((t) => t.category !== "ai-api");

  const categoryLines = categories.map((cat) => {
    const inCategory = registry.search({ category: cat as never });
    const display = cat.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return `- [${display}](${BASE}/browse/${cat}) — ${inCategory.length} tools`;
  });

  return `${frontmatter({
    title: "latest.sh — developer tool pricing registry",
    description: `Verified pricing for ${tools.length} developer tools across ${categories.length} categories.`,
    url: `${BASE}/`,
    updated: today(),
  })}
# latest.sh

> Machine-readable pricing for ${tools.length} developer tools across ${categories.length} categories.
> Every tool has verified tiers, free-tier limits, usage rates, switching cost, and a transparency score.

## Ask an agent-native interface instead of scraping

- **MCP server (Streamable HTTP):** \`${BASE}/mcp\` — six read-only tools: ${Object.keys(TOOL_METADATA).join(", ")}
- **REST API:** [${BASE}/api/tools](${BASE}/api/tools) · [OpenAPI 3.1 spec](${BASE}/openapi.json)
- **Per-tool pricing.md:** \`${BASE}/tool/{id}/pricing.md\`
- **Agent guide:** [${BASE}/AGENTS.md](${BASE}/AGENTS.md) · **Site index:** [${BASE}/llms.txt](${BASE}/llms.txt)
- **Developer portal:** [${BASE}/developers](${BASE}/developers)

## Categories

${categoryLines.join("\n")}

## What the data answers

- Where a free tier ends and what the first paid bill looks like
- What a tool costs at realistic scale, not at signup (the free-tier cliff)
- Which tool in a category is cheapest at a given volume
- How hard a tool is to leave: switching cost, open standards, what you lose

## Pricing of latest.sh itself

Free and public. See [${BASE}/pricing.md](${BASE}/pricing.md).
`;
}

/** latest.sh's own pricing, in the same machine-readable format the registry asks tools to publish. */
function ownPricingMarkdown(registry: Registry): string {
  const tools = registry.allTools().filter((t) => t.category !== "ai-api");

  return `${frontmatter({
    title: "latest.sh pricing",
    description: "latest.sh is free: the registry, the API, and the MCP server are all public and unmetered.",
    url: `${BASE}/pricing.md`,
    updated: today(),
  })}
# latest.sh Pricing

> Source: Official pricing.md published by latest.sh | Last verified: ${today()}

A pricing registry for ${tools.length} developer tools, readable by humans on the web and by agents over MCP, REST, and markdown.

## Tiers

### Free

- **Price:** Free
- **Model:** free
- **Billing:** none — no account, no API key, no signup

**Includes:**

- Full registry: all ${tools.length} tools, all tiers, all usage metrics
- REST API (\`/api/tools\`, \`/api/tools/{id}\`, \`/api/stats\`, \`/api/changelog\`)
- MCP server over Streamable HTTP at \`${BASE}/mcp\` and over stdio via \`npx pricing.md\`
- Per-tool machine-readable pricing at \`/tool/{id}/pricing.md\`
- Transparency scores, badges, changelog, and comparison guides

**Limits:**

- Rate limiting: fair-use only, applied per IP to write endpoints
- No SLA — this is a public good, not a paid service

## Usage Metrics

None. Nothing on latest.sh is metered or billed.

## Portability

- **Switching cost:** drop-in
- **Open standards:** MCP, OpenAPI 3.1, llms.txt, Agentic Resource Discovery, JSON-LD
- **What you lose:** nothing — the underlying data is open JSON in a public GitHub repo, and the MCP server ships as an npm package you can self-host

## Data license

Pricing data is MIT-licensed and mirrored at https://github.com/rogermbyrne/pricing.md.
`;
}

/** When-to-use guidance for coding agents that land on the site. */
function agentsMarkdown(registry: Registry): string {
  const tools = registry.allTools().filter((t) => t.category !== "ai-api");
  const categories = registry.categories().filter((c) => c !== "ai-api");
  const toolList = Object.entries(TOOL_METADATA)
    .map(([name, meta]) => `- \`${name}\` — ${meta.description}`)
    .join("\n");

  return `${frontmatter({
    title: "AGENTS.md — how agents should use latest.sh",
    description: "When to call latest.sh, which interface to use, and what the data does and does not cover.",
    url: `${BASE}/AGENTS.md`,
    updated: today(),
  })}
# AGENTS.md

latest.sh is a pricing registry for ${tools.length} developer tools across ${categories.length} categories.
It exists so agents can answer cost questions from verified data instead of guessing or scraping vendor pages.

## When to use this site

Use it when a user is:

- planning a tech stack, or choosing between two tools
- asking what something costs, whether a free tier is enough, or when it runs out
- comparing hosting, databases, auth, email, monitoring, CI/CD, search, or AI coding tools
- worried about lock-in and wants switching cost before committing

Do not use it for: current account balances, negotiated enterprise quotes, or a vendor's
unpublished pricing. Everything here is public list pricing with a \`lastVerified\` date.

## How to read it (best interface first)

1. **MCP — \`${BASE}/mcp\`** (Streamable HTTP, no auth). Preferred: structured, typed, read-only.
${toolList}
2. **REST — \`${BASE}/api/tools\`**, spec at \`${BASE}/openapi.json\`. Use when you cannot speak MCP.
3. **Markdown — \`${BASE}/tool/{id}/pricing.md\`** for one tool, \`${BASE}/llms.txt\` for the site index.
   Any page also returns markdown if you send \`Accept: text/markdown\` or append \`?mode=agent\`.

## Rules of the road

- Cite the \`lastVerified\` date when you quote a price. Prices move; volatile categories move monthly.
- Prefer \`growth_cost\` over \`search_tools\` when the user's real question is "what will this cost later".
- No API key, no signup, no rate limit on reads. Please do not scrape the HTML — the API is cheaper for both of us.
- Data is MIT-licensed: https://github.com/rogermbyrne/pricing.md
`;
}

function mcpServerCard() {
  return {
    name: SERVER_INFO.name,
    version: SERVER_INFO.version,
    kind: "product",
    description:
      "Machine-readable pricing for 300+ developer tools. Search, compare, and estimate what tools cost at real usage — including what they cost after the free tier ends.",
    url: `${BASE}/mcp`,
    transport: "streamable-http",
    documentationUrl: `${BASE}/developers`,
    icon: `${BASE}/favicon.svg`,
    instructions: SERVER_INSTRUCTIONS,
    capabilities: { tools: true, resources: false },
    authentication: { type: "none" },
    tools: Object.entries(TOOL_METADATA).map(([name, meta]) => ({
      name,
      title: meta.title,
      description: meta.description,
      annotations: { readOnlyHint: true, idempotentHint: true, destructiveHint: false, openWorldHint: false },
    })),
  };
}

function aiCatalog() {
  const trustManifest = { identity: "did:web:latest.sh", identityType: "did" };
  return {
    specVersion: "1.0",
    host: {
      displayName: "latest.sh",
      identifier: "did:web:latest.sh",
      documentationUrl: `${BASE}/developers`,
    },
    entries: [
      {
        identifier: "urn:air:latest.sh:mcp:pricing-md",
        displayName: "pricing.md MCP server",
        type: "application/mcp-server-card+json",
        url: `${BASE}/.well-known/mcp/server-card.json`,
        description:
          "Six read-only tools for developer tool pricing: search, full pricing, side-by-side compare, cost estimate, cheapest-in-category, and growth cost.",
        tags: ["pricing", "developer-tools", "cost", "mcp"],
        capabilities: Object.keys(TOOL_METADATA),
        representativeQueries: [
          "what does Vercel cost at 500GB bandwidth",
          "cheapest auth provider at 100K monthly active users",
          "compare Supabase and PlanetScale pricing",
          "what happens when this free tier runs out",
        ],
        trustManifest,
      },
      {
        identifier: "urn:air:latest.sh:api:pricing-md",
        displayName: "latest.sh REST API",
        type: "application/vnd.oai.openapi+json;version=3.1",
        url: `${BASE}/openapi.json`,
        description: "Public REST API over the full pricing registry. No key, no signup.",
        tags: ["api", "rest", "openapi", "pricing"],
        trustManifest,
      },
      {
        identifier: "urn:air:latest.sh:skill:pricing",
        displayName: "pricing skill",
        type: "application/ai-skill+md",
        url: `${BASE}/.well-known/agent-skills/pricing/SKILL.md`,
        description:
          "Makes a coding agent cost-aware when planning a stack: surfaces breakpoints, free-tier cliffs, and lock-in risk.",
        tags: ["skill", "pricing", "cost-awareness"],
        representativeQueries: [
          "help me pick a stack without a surprise bill",
          "is this free tier a trap",
        ],
        trustManifest,
      },
      {
        identifier: "urn:air:latest.sh:doc:agents",
        displayName: "Agent guide",
        type: "text/markdown",
        url: `${BASE}/AGENTS.md`,
        description: "When to use latest.sh, which interface to reach for, and what the data does not cover.",
        tags: ["documentation", "agents"],
        trustManifest,
      },
    ],
  };
}

function apiCatalog() {
  return {
    linkset: [
      {
        anchor: `${BASE}/`,
        item: [
          {
            href: `${BASE}/openapi.json`,
            type: "application/vnd.oai.openapi+json;version=3.1",
            title: "latest.sh API",
          },
        ],
        "service-desc": [
          {
            href: `${BASE}/openapi.json`,
            type: "application/vnd.oai.openapi+json;version=3.1",
            title: "latest.sh OpenAPI specification",
          },
        ],
        "service-doc": [{ href: `${BASE}/developers`, type: "text/html", title: "Developer portal" }],
      },
    ],
  };
}

const SKILL_PATH = "/.well-known/agent-skills/pricing/SKILL.md";

function agentSkillsIndex(skillDigest: string | null) {
  return {
    $schema: "https://schemas.agentskills.io/discovery/0.2.0/schema.json",
    version: "0.2.0",
    skills: [
      {
        name: "pricing",
        description:
          "Make your agent cost-aware when planning developer tool stacks. Surfaces pricing breakpoints, compares alternatives, flags lock-in risks, and shows where free tiers end.",
        version: SERVER_INFO.version,
        type: "skill-md",
        url: `${BASE}${SKILL_PATH}`,
        path: SKILL_PATH,
        // sha256 over the raw bytes served at `url`, so a client can verify what it fetched.
        ...(skillDigest ? { digest: `sha256:${skillDigest}` } : {}),
        license: "MIT",
        homepage: `${BASE}/developers`,
      },
    ],
  };
}

function openApiSpec(registry: Registry) {
  const categories = registry.categories();
  const toolIdExample = registry.allTools()[0]?.id ?? "vercel";

  const errorSchema = {
    type: "object",
    required: ["error"],
    properties: { error: { type: "string", description: "Human-readable failure reason." } },
  };
  const errorResponse = (description: string) => ({
    description,
    content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
  });
  // Redocly (and most agent tooling) expects every operation to document a failure path.
  const genericError = errorResponse("Request could not be served — malformed parameters or unknown path.");

  const rateLimitHeaders = {
    "RateLimit": {
      description: "Structured rate-limit field, e.g. `\"api\";r=599;t=42` — requests remaining and seconds until the window resets.",
      schema: { type: "string" },
    },
    "RateLimit-Policy": {
      description: "The quota and window in force, e.g. `\"api\";q=600;w=60`.",
      schema: { type: "string" },
    },
    "API-Version": { description: "Version serving this response.", schema: { type: "string", examples: ["1"] } },
  };

  const pagingHeaders = {
    ...rateLimitHeaders,
    "X-Total-Count": {
      description: "Total items matching the query, before limit/offset.",
      schema: { type: "integer" },
    },
    Link: {
      description: "RFC 8288 pagination links: first, prev, next, last. Present only when `limit` is supplied.",
      schema: { type: "string" },
    },
  };

  const pagingParams = [
    {
      name: "limit",
      in: "query",
      required: false,
      description: "Page size. Omit to receive the whole collection.",
      schema: { type: "integer", minimum: 1, maximum: 500 },
    },
    {
      name: "offset",
      in: "query",
      required: false,
      description: "Items to skip before the page starts. Follow the `Link` header rather than computing this yourself.",
      schema: { type: "integer", minimum: 0, default: 0 },
    },
  ];

  const tooManyRequests = {
    description: "Rate limit exceeded.",
    headers: {
      ...rateLimitHeaders,
      "Retry-After": { description: "Seconds to wait before retrying.", schema: { type: "integer" } },
    },
    content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
  };

  return {
    openapi: "3.1.0",
    info: {
      title: "latest.sh API",
      version: SERVER_INFO.version,
      summary: "Public pricing data for developer tools.",
      description:
        "Read-only REST access to the latest.sh pricing registry. No API key and no signup. " +
        "Agents that speak MCP should prefer the Streamable HTTP endpoint at /mcp.\n\n" +
        "**Versioning.** Every path is served under a version prefix (`/api/v1/...`) and under the " +
        "unversioned alias (`/api/...`). Integrate against `/api/v1`: breaking changes ship as a new " +
        "prefix (`/api/v2`) rather than changing v1 responses underneath you. Additive changes — new " +
        "fields, new endpoints — can land in v1 at any time, so parse leniently. A retired version is " +
        "announced with `Deprecation` and `Sunset` response headers (RFC 9745 / RFC 8594) and stays " +
        "reachable for at least 6 months after the `Sunset` date. Responses carry the serving version " +
        "in an `API-Version` header.\n\n" +
        "**Rate limits.** " + String(API_RATE_LIMIT.limit) + " requests per " +
        String(API_RATE_LIMIT.windowMs / 1000) + "s per IP. Every response carries `RateLimit`, " +
        "`RateLimit-Policy`, and the discrete `RateLimit-Limit`/`-Remaining`/`-Reset` headers; a 429 " +
        "adds `Retry-After`.\n\n" +
        "**Pagination.** List endpoints accept `limit` and `offset`. Omit `limit` and you get the whole " +
        "collection. Paged responses carry `X-Total-Count` and RFC 8288 `Link` headers " +
        "(`first`, `prev`, `next`, `last`).",
      license: { name: "MIT", identifier: "MIT" },
      contact: { name: "latest.sh", url: `${BASE}/developers` },
    },
    servers: [{ url: BASE, description: "Production" }],
    // Empty array = no authentication on any operation. Deliberate, not an omission.
    security: [],
    externalDocs: { description: "Developer portal", url: `${BASE}/developers` },
    tags: [
      { name: "tools", description: "Pricing entries" },
      { name: "meta", description: "Registry statistics and change history" },
      { name: "votes", description: "Community demand signal for pricing transparency" },
    ],
    paths: {
      "/api/v1/tools": {
        get: {
          tags: ["tools"],
          operationId: "listTools",
          summary: "List every tool in the registry",
          description: "Returns full pricing entries. Filter to one category with the `category` query parameter.",
          parameters: [
            {
              name: "category",
              in: "query",
              required: false,
              description: "Restrict results to a single category.",
              schema: { type: "string", enum: categories },
            },
            ...pagingParams,
          ],
          responses: {
            "200": {
              description: "Matching tools.",
              headers: pagingHeaders,
              content: {
                "application/json": {
                  schema: { type: "array", items: { $ref: "#/components/schemas/Tool" } },
                },
              },
            },
            "400": errorResponse("Invalid limit or offset."),
            "429": tooManyRequests,
            "4XX": genericError,
          },
        },
      },
      "/api/v1/tools/{id}": {
        get: {
          tags: ["tools"],
          operationId: "getTool",
          summary: "Get one tool's full pricing entry",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "Tool slug, e.g. `vercel`.",
              schema: { type: "string", examples: [toolIdExample] },
            },
          ],
          responses: {
            "200": {
              description: "The tool.",
              content: { "application/json": { schema: { $ref: "#/components/schemas/Tool" } } },
            },
            "404": errorResponse("No tool with that id."),
          },
        },
      },
      "/api/v1/stats": {
        get: {
          tags: ["meta"],
          operationId: "getStats",
          summary: "Registry size and freshness",
          responses: {
            "200": {
              description: "Counts and the most recent verification date.",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["tools", "categories", "lastVerified"],
                    properties: {
                      tools: { type: "integer" },
                      categories: { type: "integer" },
                      lastVerified: { type: "string", format: "date" },
                    },
                  },
                },
              },
            },
            "4XX": genericError,
          },
        },
      },
      "/api/v1/changelog": {
        get: {
          tags: ["meta"],
          operationId: "getChangelog",
          summary: "Detected pricing changes",
          parameters: [
            { name: "tool", in: "query", required: false, description: "Limit to one tool id.", schema: { type: "string" } },
            {
              name: "since",
              in: "query",
              required: false,
              description: "ISO date; only changes detected on or after this date.",
              schema: { type: "string", format: "date" },
            },
            ...pagingParams,
          ],
          responses: {
            "200": {
              description: "Change records, newest first. Defaults to the 100 most recent when `limit` is omitted.",
              headers: pagingHeaders,
              content: {
                "application/json": {
                  schema: { type: "array", items: { $ref: "#/components/schemas/Change" } },
                },
              },
            },
            "400": errorResponse("Invalid limit or offset."),
            "429": tooManyRequests,
            "4XX": genericError,
          },
        },
      },
      "/api/v1/vote/{id}": {
        get: {
          tags: ["votes"],
          operationId: "getVotes",
          summary: "Vote count for a tool",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: {
            "200": {
              description: "Current count.",
              content: {
                "application/json": {
                  schema: { type: "object", required: ["count"], properties: { count: { type: "integer" } } },
                },
              },
            },
            "4XX": genericError,
          },
        },
        post: {
          tags: ["votes"],
          operationId: "castVote",
          summary: "Vote for a tool to publish an official pricing.md",
          description: "One vote per IP per day.",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: {
            "200": {
              description: "Vote recorded.",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["success", "count"],
                    properties: { success: { type: "boolean" }, count: { type: "integer" } },
                  },
                },
              },
            },
            "404": errorResponse("No tool with that id."),
            "429": errorResponse("Already voted today."),
          },
        },
      },
      "/tool/{id}/pricing.md": {
        get: {
          tags: ["tools"],
          operationId: "getToolPricingMarkdown",
          summary: "Machine-readable pricing.md for one tool",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: {
            "200": {
              description: "Markdown pricing document.",
              content: { "text/markdown": { schema: { type: "string" } } },
            },
            "404": { description: "No tool with that id.", content: { "text/plain": { schema: { type: "string" } } } },
          },
        },
      },
    },
    components: {
      schemas: {
        Error: errorSchema,
        Tier: {
          type: "object",
          required: ["name", "slug", "pricingModel", "basePrice"],
          properties: {
            name: { type: "string" },
            slug: { type: "string" },
            pricingModel: {
              type: "string",
              enum: ["free", "flat_rate", "per_seat", "usage_based", "tiered", "hybrid", "custom"],
            },
            basePrice: { type: ["number", "null"], description: "Monthly base price; null means contact sales." },
            billingPeriod: { type: ["string", "null"] },
            annualDiscount: { type: ["number", "null"], description: "Percent off when billed annually." },
            seatPrice: { type: ["number", "null"] },
            usageMetrics: { type: "array", items: { type: "object", additionalProperties: true } },
            features: { type: "array", items: { type: "string" } },
            limits: { type: "object", additionalProperties: true },
          },
        },
        Tool: {
          type: "object",
          required: ["id", "name", "category", "tiers", "lastVerified"],
          properties: {
            id: { type: "string", description: "Stable slug used in every URL." },
            name: { type: "string" },
            description: { type: "string" },
            url: { type: "string", format: "uri" },
            pricingUrl: { type: "string", format: "uri" },
            category: { type: "string", enum: categories },
            tags: { type: "array", items: { type: "string" } },
            lastVerified: { type: "string", format: "date" },
            freshnessCategory: { type: "string", enum: ["volatile", "stable", "static"] },
            currency: { type: "string", examples: ["USD"] },
            portability: {
              type: "object",
              properties: {
                switchingCost: { type: "string", enum: ["drop-in", "moderate", "significant", "architectural"] },
                openStandard: { type: ["string", "null"] },
                whatYouLose: { type: ["string", "null"] },
              },
            },
            tiers: { type: "array", items: { $ref: "#/components/schemas/Tier" } },
          },
        },
        Change: {
          type: "object",
          properties: {
            tool_id: { type: "string" },
            detected_at: { type: "string", format: "date-time" },
            field: { type: "string" },
            old_value: { type: ["string", "null"] },
            new_value: { type: ["string", "null"] },
          },
        },
      },
    },
  };
}

export function createAgentRouter(registry: Registry, projectRoot: string): Router {
  const router = Router();

  const skillFile = path.join(projectRoot, "SKILL.md");
  let skillDigest: string | null = null;
  try {
    skillDigest = crypto.createHash("sha256").update(fs.readFileSync(skillFile)).digest("hex");
  } catch (err) {
    console.error("SKILL.md unreadable, publishing skills index without a digest:", err instanceof Error ? err.message : err);
  }
  // res.send() appends "; charset=utf-8" to the content type, which mangles
  // parameterised media types (…+json;version=3.1) and trips validators that
  // compare the header verbatim. JSON is UTF-8 by definition (RFC 8259), so
  // write the buffer directly and keep the type exactly as declared.
  const json = (res: Response, body: unknown, type = "application/json") => {
    const payload = Buffer.from(JSON.stringify(body, null, 2), "utf-8");
    // setHeader, not res.set: Express's setter appends a charset parameter for
    // any type its mime table recognises, including application/json.
    res.setHeader("Content-Type", type);
    res.setHeader("Content-Length", payload.byteLength);
    res.end(payload);
  };

  // Homepage content negotiation: markdown for agents, HTML for everyone else.
  //
  // Cloudflare ignores Vary (except Accept-Encoding), so the negotiated markdown
  // response must never enter the edge cache — otherwise a browser could be handed
  // raw markdown from a cached agent request. The HTML variant stays cacheable; an
  // agent served cached HTML is only losing the optimization, not breaking.
  router.get("/", (req: Request, res: Response, next: NextFunction) => {
    res.set("Vary", "Accept, User-Agent");
    if (!wantsMarkdown(req)) {
      next();
      return;
    }
    res.set("Cache-Control", "no-store");
    sendMarkdown(res, homepageMarkdown(registry));
  });

  // Developer portal — the human-readable counterpart to /openapi.json and the MCP card.
  router.get("/developers", (req: Request, res: Response) => {
    res.render("developers", {
      title: "Developer & Agent API",
      description:
        "MCP server, REST API, OpenAPI spec, and markdown endpoints for the latest.sh pricing registry. No API key required.",
      path: "/developers",
      markdownAlternate: `${BASE}/AGENTS.md`,
      mcpTools: Object.entries(TOOL_METADATA).map(([name, meta]) => ({ name, ...meta })),
    });
  });

  router.get("/index.md", (req: Request, res: Response) => sendMarkdown(res, homepageMarkdown(registry)));
  router.get("/pricing.md", (req: Request, res: Response) => sendMarkdown(res, ownPricingMarkdown(registry)));
  router.get("/AGENTS.md", (req: Request, res: Response) => sendMarkdown(res, agentsMarkdown(registry)));

  router.get("/openapi.json", (req: Request, res: Response) =>
    json(res, openApiSpec(registry), "application/vnd.oai.openapi+json;version=3.1")
  );

  router.get("/.well-known/ai-catalog.json", (req: Request, res: Response) => json(res, aiCatalog()));
  router.get("/.well-known/mcp/server-card.json", (req: Request, res: Response) => json(res, mcpServerCard()));
  router.get("/.well-known/api-catalog", (req: Request, res: Response) =>
    json(res, apiCatalog(), "application/linkset+json")
  );
  router.get("/.well-known/agent-skills/index.json", (req: Request, res: Response) =>
    json(res, agentSkillsIndex(skillDigest))
  );

  router.get(SKILL_PATH, (req: Request, res: Response) => {
    fs.readFile(skillFile, "utf-8", (err, body) => {
      if (err) {
        res.status(404).set("Content-Type", "text/plain; charset=utf-8").send("SKILL.md not found.");
        return;
      }
      res.set("Content-Type", "text/markdown; charset=utf-8");
      res.send(body);
    });
  });

  return router;
}
