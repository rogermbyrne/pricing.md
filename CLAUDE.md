# Pricing.md — Codebase Guide

## What This Is

A pricing registry for 303+ developer tools. Dual-mode: MCP server (stdio) + Express web app.
Deployed on Railway. Published on npm as `pricing.md`.

## Stack

- **Runtime:** Node.js + TypeScript (CommonJS, compiled via `tsc`)
- **Web:** Express 5.x + EJS templates
- **MCP:** `@modelcontextprotocol/sdk` — 6 tools (search, compare, estimate cost, find cheapest, growth cost, get pricing)
- **Data:** Flat JSON files in `data/tools/` (one per tool, validated by Zod schema)
- **DBs:** SQLite via `better-sqlite3` — `changelog.db` (pricing changes), `votes.db` (community votes), `discovery.db` (tool URLs & pricing.md status)
- **Deploy:** Railway (`railway.json` + `nixpacks.toml`), auto-deploys on main push

## Key Directories

```
data/tools/           # 303 JSON pricing files (the source of truth)
data/raw/             # Downloaded pricing.md files from tool websites
data/snapshots/       # SHA256 hashes for change detection
src/schema/pricing.ts # Zod schema — ToolEntry, PricingTier, UsageMetric, etc.
src/registry/         # In-memory registry, loads all JSON on startup
src/tools/            # MCP tool handlers
src/lib/              # Utilities: transparency-score, pricing-markdown, growth-scenarios
web/routes/           # Express route handlers (browse, tool, api, compare, changelog, etc.)
web/views/            # EJS templates
scripts/              # discover.ts, check-freshness.ts, validate.ts, parse.ts, etc.
.github/workflows/    # freshness-check.yml — weekly Sunday 3:07 AM UTC
```

## Categories (22)

hosting, database, auth, email, payments, monitoring, ai-api, **ai-coding**, storage, ci-cd, search, analytics, feature-flags, cms, docs, queues, edge, testing, scheduling, notifications, internal-tools, secrets

## Tool JSON Schema (simplified)

Each file in `data/tools/{id}.json`:
```json
{
  "id": "slug",
  "name": "Display Name",
  "description": "...",
  "url": "https://...",
  "pricingUrl": "https://.../pricing",
  "category": "ai-coding",
  "tags": ["ai-coding", "..."],
  "lastVerified": "2026-04-15",
  "freshnessCategory": "volatile",
  "currency": "USD",
  "portability": { "switchingCost": "drop-in|moderate|significant|architectural", "openStandard": null, "whatYouLose": "..." },
  "tiers": [
    { "name": "Free", "slug": "free", "pricingModel": "free|flat_rate|per_seat|usage_based|tiered|hybrid|custom",
      "basePrice": 0, "billingPeriod": "monthly", "annualDiscount": null, "seatPrice": null,
      "usageMetrics": [], "features": [], "limits": {} }
  ]
}
```

Full Zod schema: `src/schema/pricing.ts`

## Scripts

| Command | What it does |
|---------|-------------|
| `npm run validate` | Validates all JSON against Zod schema |
| `npm run discover` | Checks tools for pricing.md files, updates discovery.db |
| `npm run parse` | Downloads pricing.md content from discovered tools |
| `npm run check-freshness` | SHA256 comparison for pricing page changes |
| `npm run sanity-check` | Integrity checks |
| `npm run pre-push` | Pre-commit validation |
| `npm run web` | Dev server (tsx, hot) |
| `npm run web:build` | Production build + start |
| `npm run record-snapshot` | Save current pricing page hashes |

## Transparency Score

Tools scored 0-100 (A-F grades) on 7 factors. The big one: **+30 points** if `pricingUrl` ends with `/pricing.md`. Other factors: free tier, public prices, usage docs, portability, open standards, recency.

See `src/lib/transparency-score.ts`.

## Workflows

- **Adding a tool:** Create `data/tools/{id}.json`, run `npm run validate`, commit
- **Batch rule:** Push new tools in batches of 10+, update README with each push
- **Freshness:** GitHub Actions runs weekly, hashes pricing pages, flags changes in `data/pending-changes.txt`
- **Discovery:** `scripts/discover.ts` has a hardcoded TOOLS array — add new entries there to check for pricing.md files

## Existing AI Coding Tools (6)

Already in `data/tools/`: augment-code, cerebras, cursor, github-copilot, mistral, windsurf

## Web Routes

- `/` — Browse categories
- `/tool/{id}` — Tool detail page
- `/tool/{id}/pricing.md` — Machine-readable pricing
- `/tool/{id}/badge.svg` — Transparency badge
- `/compare?tools=a,b,c` — Side-by-side (up to 5)
- `/api/tools`, `/api/tools/{id}`, `/api/stats`, `/api/changelog`
- `/changelog` — Pricing change history
- `/transparency` — Leaderboard

## Important Conventions

- Always run `npm run validate` before committing
- Test UI changes locally with `npm run web` before pushing
- Don't ask to push — just push when checks pass and 10+ tools are batched
- Fetch 10+ pricing pages in parallel when doing research iterations
- `freshnessCategory: "volatile"` for AI/coding tools (prices change often)
