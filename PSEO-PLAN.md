---
tags:
  - SEO
  - programmatic-seo
  - humanization-engine
  - schema-markup
  - sitemap
projects:
  - latest.sh
frameworks:
  - Express
  - EJS
  - TypeScript
---
# Programmatic SEO Plan — latest.sh

## Overview

Add 800+ SEO pages to latest.sh from existing structured data (303 tool JSON files). All pages live under `/guides/*` — a single new nav item. Output uses a humanization engine to avoid robotic template prose.

## Tech Stack

Express + EJS + TypeScript. Data in `data/tools/*.json`. Registry class at `src/registry/registry.ts`.

## URL Structure

| Page Type | URL Pattern | Volume |
|-----------|------------|--------|
| VS comparisons | `/guides/vercel-vs-railway` | ~500+ (same-category pairs only) |
| Alternatives | `/guides/vercel-alternatives` | 303 (one per tool) |
| Best free | `/guides/best-free-hosting` | ~20 (one per category) |
| Index hub | `/guides` | 1 |

## Files to Create / Modify

| File | Action | Purpose |
|------|--------|---------|
| `web/lib/humanize.ts` | CREATE | Sentence variation pools + conditional block logic |
| `web/routes/guides.ts` | CREATE | Express router for all /guides/* routes |
| `web/views/guides-index.ejs` | CREATE | Hub page |
| `web/views/guides-vs.ejs` | CREATE | VS comparison template |
| `web/views/guides-alternatives.ejs` | CREATE | Alternatives template |
| `web/views/guides-best-free.ejs` | CREATE | Best-free-in-category template |
| `web/views/partials/head.ejs` | MODIFY | Add "Guides" nav link (line ~69, next to Advisor) |
| `web/server.ts` | MODIFY | Import and mount createGuidesRouter |
| `web/routes/seo.ts` | MODIFY | Add /guides/* URLs to sitemap.xml |
| `web/views/tool.ejs` | MODIFY | Add "Guides" section linking to VS + alternatives pages |
| `web/views/category.ejs` | MODIFY | Add top VS matchup links |

## Humanization Strategy

`web/lib/humanize.ts` should implement:

1. **Sentence variation pools** — 4-6 templates per data point (price gap, free tier, switching cost). Use `hash(toolA.id + toolB.id) % pool.length` to pick deterministically so the same page always renders the same sentence.

2. **Conditional narrative blocks** — prose paragraphs that only appear when data warrants:
   - Free tier advantage block (one has free tier, other doesn't)
   - Portability block (switching costs differ)
   - Pricing model block (one usage-based, other flat-rate)
   - Price gap block (>2x price difference)

3. **Data-driven verdict** — computed "Bottom line" at page end based on actual data signals, not hardcoded.

4. **noindex guard** — if two tools have identical pricing model, same base price, and same switching cost → mark page noindex to avoid thin content.

## Batch Order (resume here)

- [ ] **Batch 1** — `web/lib/humanize.ts` + any registry helpers needed (`toolPairsInCategory()` etc.)
- [ ] **Batch 2** — `web/routes/guides.ts`, `web/views/guides-index.ejs`, nav link in `head.ejs`, mount in `server.ts`, sitemap entry
- [ ] **Batch 3** — VS comparison pages (`/guides/:toolA-vs-:toolB`), `guides-vs.ejs`, ComparisonPage schema markup
- [ ] **Batch 4** — Alternatives pages (`/guides/:tool-alternatives`), `guides-alternatives.ejs`, ItemList schema, link from tool pages
- [ ] **Batch 5** — Best-free pages (`/guides/best-free-:category`), `guides-best-free.ejs`, link from category pages
- [ ] **Batch 6** — Internal linking audit, sitemap final update, verify no orphan pages

## Key Design Decisions

- Same-category pairs only for VS pages (cross-category comparisons are low-intent and thin)
- All pages route through a single `createGuidesRouter(registry)` function mirroring existing router pattern
- Use `lastVerified` field from tool JSON for schema `dateModified`
- Pages with insufficient differentiation get `<meta name="robots" content="noindex">`
- No new database needed — all data comes from existing JSON registry

## Existing Patterns to Follow

- Router factory: `export function createXRouter(registry: Registry): Router` — see `web/routes/tool.ts`
- EJS head partial: `<%- include('partials/head', { title, description, path }) %>`
- Free tier detection: `tool.tiers.some(t => t.pricingModel === 'free' || t.basePrice === 0)`
- Category list: `registry.categories()` returns string[], `registry.search({ category })` returns tools
