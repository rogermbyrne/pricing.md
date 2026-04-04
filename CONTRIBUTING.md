# Contributing to Pricing.md

Pricing.md is a community-maintained pricing registry for developer tools. Anyone can submit pricing data via pull request.

## What you can contribute

- **Add a new tool** — a developer tool that's missing from the registry
- **Update existing pricing** — prices change; if you notice stale data, submit a fix
- **Fix errors** — wrong tier names, incorrect limits, broken URLs

## How to contribute

### 1. Fork and clone the repo

```bash
git clone https://github.com/<your-username>/pricing.md.git
cd pricing.md
npm install
```

### 2. Create a JSON file in `data/tools/`

Each tool is a single JSON file named `<tool-slug>.json`. Use an existing file as a reference — `resend.json` is a good example.

```bash
cp data/tools/resend.json data/tools/your-tool.json
```

### 3. Fill in the pricing data

Every file must conform to the schema in `src/schema/pricing.ts`. Here's the structure:

```jsonc
{
  "id": "your-tool",                        // lowercase slug, must match filename
  "name": "Your Tool",                      // display name
  "description": "One-line description",
  "url": "https://yourtool.com",            // homepage
  "pricingUrl": "https://yourtool.com/pricing", // where you got the data
  "category": "email",                      // see categories below
  "tags": ["transactional-email", "smtp"],  // freeform, for search
  "lastVerified": "2026-04-04",             // date you checked the pricing page
  "freshnessCategory": "volatile",          // "stable" or "volatile"
  "currency": "USD",
  "portability": {
    "switchingCost": "drop-in",             // "drop-in" | "moderate" | "significant" | "architectural"
    "openStandard": "SMTP",                 // or null if proprietary
    "whatYouLose": "Dashboard analytics, template editor"
  },
  "tiers": [
    {
      "name": "Free",
      "slug": "free",
      "pricingModel": "free",               // see pricing models below
      "basePrice": 0,
      "billingPeriod": "monthly",
      "annualDiscount": null,
      "seatPrice": null,
      "usageMetrics": [
        {
          "name": "emails",
          "unit": "emails",
          "pricePerUnit": 0,
          "unitQuantity": 1000,             // denominator for "per 1K"
          "includedQuantity": 3000
        }
      ],
      "features": [],
      "limits": {
        "emailsPerDay": 100,
        "domains": 1
      }
    }
    // ... more tiers
  ]
}
```

### 4. Validate your file

```bash
npm run validate
```

This checks every JSON file against the Zod schema. Your PR won't be merged if validation fails.

### 5. Submit your PR

Create a branch, commit, and open a pull request. In the PR description, include:

- A link to the pricing page you used as source
- The date you verified the pricing
- Any notes about ambiguous pricing (e.g., "overage rate isn't published, estimated from calculator")

## Categories

Use one of these values for the `category` field:

| Category | Examples |
|----------|----------|
| `hosting` | Vercel, Railway, Render |
| `database` | Neon, PlanetScale, Turso |
| `auth` | Auth0, WorkOS, Clerk |
| `email` | Resend, Postmark, SendGrid |
| `payments` | Stripe, Paddle |
| `monitoring` | Sentry, Datadog, Checkly |
| `ai-api` | OpenAI, Anthropic |
| `storage` | Tigris, Cloudflare R2, Mux |
| `ci-cd` | CircleCI, Buildkite |
| `search` | Algolia, Pinecone, Weaviate |
| `analytics` | PostHog, Mixpanel |
| `feature-flags` | LaunchDarkly, Statsig |
| `cms` | Sanity, Contentful |
| `queues` | Inngest, Trigger.dev |
| `edge` | Cloudflare, Fastly |
| `testing` | BrowserStack, LambdaTest |
| `scheduling` | Mergent |
| `notifications` | Courier, Novu |

Need a new category? Propose it in your PR — it requires a one-line addition to `src/schema/pricing.ts`.

## Pricing models

| Model | When to use |
|-------|-------------|
| `free` | No-cost tier |
| `flat_rate` | Fixed monthly price, no usage component |
| `per_seat` | Price scales with number of users |
| `usage_based` | Pure pay-per-use, no base fee |
| `tiered` | Base price + included quantity + overage |
| `hybrid` | Combines seat pricing with usage |
| `custom` | Contact sales / enterprise only |

## Portability ratings

Be honest about lock-in. The `switchingCost` field should reflect the real migration effort:

| Rating | Meaning | Example |
|--------|---------|---------|
| `drop-in` | Uses an open standard; swap providers with config change | SMTP email, S3-compatible storage, PostgreSQL |
| `moderate` | Standard protocol but proprietary features on top | Vercel (Next.js deploys anywhere, but ISR/edge don't) |
| `significant` | Proprietary API; migration requires code changes | Auth0 (OIDC is standard, but SDKs/Actions aren't) |
| `architectural` | Deep integration; migration is a project in itself | Firebase (auth + db + hosting + functions) |

## Guidelines

- **Use the pricing page as your source.** Don't guess or use third-party comparison sites.
- **Set `lastVerified` to the date you actually checked.** Don't backdate it.
- **When pricing is ambiguous**, add a note in your PR. Some tools hide overage rates, bundle features oddly, or have region-specific pricing. Call it out.
- **USD only.** Convert if needed and note the original currency in your PR.
- **Don't add tools you work for** without disclosing it. We welcome vendor submissions — just be transparent.
- **`freshnessCategory`**: Use `"volatile"` for tools that change pricing frequently or have usage-based components. Use `"stable"` for tools with simple, rarely-changing pricing.

## Using Claude Code to research pricing

If you have Claude Code installed, you can use it to help research and generate the JSON file:

```
Add pricing data for [tool name] to data/tools/. Research their pricing page
at [url], generate a JSON file matching the schema in src/schema/pricing.ts,
and run npm run validate to check it.
```

## Review process

1. Maintainers will check your JSON against the tool's actual pricing page
2. If pricing is ambiguous, we may ask for clarification
3. Once merged, the SKILL.md and MCP server data update automatically

## Questions?

Open an issue if you're unsure about how to represent a tool's pricing model. Some pricing structures are genuinely weird — we're happy to help figure out the right schema mapping.
