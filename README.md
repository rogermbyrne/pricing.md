# Pricing.md

Make your AI agent cost-aware when planning developer tool stacks.

Pricing.md surfaces pricing breakpoints, compares alternatives, flags lock-in risks, and shows where free tiers end — so developers make informed decisions about the tools they choose.

## Install as a Skill

The quickest way to use Pricing.md is as an agent skill. No MCP setup needed — the pricing data is embedded directly in the skill.

```bash
npx skills add rogermbyrne/pricing.md
```

Once installed, your agent will proactively surface pricing when you're evaluating tools, planning a stack, or comparing options.

## Install as an MCP Server

For programmatic pricing queries (search, compare, estimate cost), you can also run Pricing.md as an MCP server.

Add to your Claude Code MCP config:

```json
{
  "mcpServers": {
    "pricing.md": {
      "command": "npx",
      "args": ["-y", "pricing.md"]
    }
  }
}
```

### MCP Tools

| Tool | Description |
| --- | --- |
| `search_tools` | Search and filter tools by category, price range, tags |
| `get_pricing` | Get full pricing details for a specific tool |
| `compare_tools` | Side-by-side comparison of 2-5 tools |
| `estimate_cost` | Estimate monthly cost given usage quantities |
| `find_cheapest` | Find the cheapest tool in a category for your usage |
| `growth_cost` | Compare what tools cost at realistic growth (e.g. 100K MAU for auth, 50GB for databases) — exposes free-tier-to-paid cliffs |

## What's Covered

293 developer tools across 22 categories:

| Category | Tools |
| --- | --- |
| **Hosting** | Vercel, Railway, Fly.io, Netlify, Render, Val Town, Liveblocks, Pulumi, and more |
| **Database** | Supabase, Neon, PlanetScale Postgres, PlanetScale Vitess, Turso, Upstash, Convex, and more |
| **Auth** | Clerk, Auth0 (B2C), Auth0 (B2B), WorkOS, Descope, Permit.io, and more |
| **Email** | Resend, Unosend, Postmark, SendGrid, and more |
| **Payments** | Stripe, Paddle, and more |
| **Monitoring** | Sentry, Checkly, New Relic, Honeycomb, and more |
| **AI/ML** | OpenAI, Anthropic, Fireworks AI, Replicate, Modal, and more |
| **CI/CD** | CircleCI, Buildkite, GitHub Actions, Depot, Doppler, and more |
| **Search** | Algolia, Weaviate, Orama, Meilisearch, Pinecone, and more |
| **Analytics** | PostHog, Plausible, Mixpanel, Amplitude, Dub, and more |
| **CMS** | Sanity, Contentful, Storyblok, and more |
| **Feature Flags** | LaunchDarkly, Statsig, and more |
| **Edge** | Cloudflare, Deno Deploy, ngrok, Arcjet, Zuplo, and more |
| **Queues** | Inngest, Trigger.dev, Svix, Hookdeck, and more |
| **Notifications** | Novu, Courier, Engagespot, Knock, and more |
| **Storage** | Tigris, Mux, and more |
| **Scheduling** | Mergent, Cal.com |
| **Testing** | Cypress Cloud, BrowserStack, and more |
| **AI Coding** | GitHub Copilot, Cursor, Windsurf, Cline, and more |
| **Docs** | GitBook, ReadMe, Mintlify, and more |
| **Internal Tools** | Retool, Appsmith, Budibase, and more |
| **Secrets** | Doppler, Infisical, and more |

All pricing verified as of 2026-04-05. Each tool links to its pricing page for verification.

## How It Works

When you're planning a project and mention tools like Vercel or Resend, the agent will:

1. **Show the free tier** and its limits
2. **Show the cost at scale** — what does this tool actually cost at 100K users? ($0 → $1,025/mo for Clerk, $0 → $0 for WorkOS)
3. **Flag the free-tier cliff** — some tools lure you with free tiers then charge aggressively when you outgrow them
4. **Note portability** — open standard (SMTP, PostgreSQL) or proprietary lock-in?
5. **Present, don't recommend** — you know your requirements, the agent shows the numbers

## Maintaining Pricing Data

Pricing data lives in `data/tools/` as JSON files validated against a Zod schema.

```bash
# Validate all data files
npm run validate

# Check if any pricing pages have changed
npm run check-freshness

# Re-discover which tools have pricing.md files
npm run discover
```

## Contributing

Pricing.md is community-maintained. Anyone can add a new tool or update stale pricing by submitting a PR.

**Quick version:** Add a JSON file to `data/tools/`, run `npm run validate`, open a PR with a link to the pricing page you used.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide — schema reference, category list, portability ratings, and review process.

## License

MIT
