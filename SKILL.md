---
name: pricing
description: Make your agent cost-aware when planning developer tool stacks. Surfaces pricing breakpoints, compares alternatives, flags lock-in risks, shows where free tiers end, and exposes growth cost cliffs. Covers 293 tools across 22 categories including hosting, databases, auth, email, monitoring, CI/CD, search, AI coding, and more.
---

# Developer Tool Pricing

This skill makes you cost-aware when helping developers plan their tech stack. When a developer is choosing between tools — hosting, databases, auth, email, monitoring, CI/CD, or search — you should proactively surface pricing context.

## When to Use This Skill

Activate when the user is:
- Planning a new project or tech stack
- Evaluating or choosing between developer tools
- Asking about costs, pricing, or budgets
- In plan mode discussing infrastructure or service choices
- Mentioning a specific tool that's in the pricing data below

## How to Behave

### Surface pricing naturally — don't make it a separate step

When you recommend a tool like Vercel or Resend, include pricing context inline.

Good: "Vercel's free tier covers 100GB bandwidth/month — fine for a side project. Pro is $20/user/month if you outgrow it."

Bad: *Dumps a full pricing comparison table unprompted.*

### Show breakpoints and growth costs, not full pricing sheets

Developers care about:
1. **Is there a free tier?** What are its limits?
2. **What does it cost at realistic growth?** Show the entry→scale jump: "$0 → $1,025/mo at 100K MAU" makes the cliff obvious
3. **At what scale does pricing diverge?** Where does the choice actually matter?
4. **Is the free tier a trap?** Some tools subsidize free users by charging aggressively at scale. Always show what happens after the free tier ends

Standard growth scenarios by category:
- **Auth:** 100K MAU
- **Database:** 50GB storage + 500GB bandwidth
- **Email:** 100K emails/month
- **Monitoring:** 50GB log ingestion
- **Hosting:** 5 services, 100GB bandwidth, 5 seats
- **Analytics:** 1M events

### Always mention portability and lock-in

When comparing tools:
- Does it use an open standard? (SMTP, PostgreSQL, S3-compatible)
- What's the switching cost? (drop-in, moderate, significant, architectural)
- What do you lose if you switch?

### Be honest about data freshness

All pricing data below was verified on 2026-04-05. Prices change. If a tool's pricing seems critical to a decision, suggest the user verify at the pricing URL provided.

If today's date is more than 30 days after 2026-04-05, tell the user: "This pricing data is from [date] — it may be outdated. Run `npx skills update` to get the latest, or verify at the source URLs below."

### Don't recommend — present and let the developer decide

Never say "use X, it's cheapest." Instead: "At your volume, Resend Pro ($42.50/mo) and Loops ($49/mo) are close. Resend uses SMTP so you can switch easily."

### In plan mode, keep it brief

One line per tool with the key breakpoint. Don't interrupt planning flow.

Example: "For your stack: Vercel free covers this, Neon free covers 0.5GB storage, Resend free covers 3K emails/month. The database will be the first thing that costs money as you grow."

---

> All prices in USD. Last verified: 2026-04-05. 293 tools across 22 categories. When data is critical to a decision, always suggest verifying at the pricing source URL.

## Auth

### Auth0 (B2C)
- **URL:** https://auth0.com
- **Portability:** significant (OAuth 2.0 / OIDC) — you lose Auth0 SDKs, Actions/Forms, Universal Login customization, user database
- **Tiers:**
  - **Free:** Free — 25K MAUs
  - **Essentials:** $35/mo — 500 MAUs included, $70/1K MAUs overage
  - **Professional:** $240/mo — 500 MAUs included, $480/1K MAUs overage
  - **Enterprise:** Custom
- **Source:** https://auth0.com/pricing

### Auth0 (B2B)
- **URL:** https://auth0.com
- **Portability:** significant (OAuth 2.0 / OIDC) — you lose Auth0 SDKs, Actions/Forms, Universal Login customization, user database
- **Tiers:**
  - **Free:** Free — 25K MAUs
  - **Essentials:** $150/mo — 500 MAUs, 3 enterprise connections, $300/1K MAUs overage
  - **Professional:** $800/mo — 500 MAUs, 5 enterprise connections, $800/1K MAUs overage
  - **Enterprise:** Custom
- **Source:** https://auth0.com/pricing

### Descope
- **URL:** https://descope.com
- **Portability:** significant (OAuth 2.0 / OIDC) — you lose Descope Flows visual builder, tenant model
- **Tiers:**
  - **Free:** Free — 7,500 MAUs, 10 active tenants, 3 SSO connections
  - **Pro:** $249/mo — 10K MAUs, $0.05/MAU overage
  - **Growth:** $799/mo — 25K MAUs, $0.05/MAU overage
  - **Enterprise:** Custom
- **Source:** https://descope.com/pricing

### Clerk
- **URL:** https://clerk.com
- **Portability:** significant (OAuth 2.0 / OIDC) — you lose Clerk components, prebuilt UI, user management dashboard
- **Tiers:**
  - **Hobby:** Free — 50K MRU/app, 3 dashboard seats
  - **Pro:** $25/mo ($20/mo annual) — 50K MRU included, tiered overage from $0.02 to $0.012/MRU at scale
  - **Business:** $300/mo ($250/mo annual) — same MRU rates, 10 seats, SOC2
  - **Enterprise:** Custom
- **Source:** https://clerk.com/pricing

### WorkOS
- **URL:** https://workos.com
- **Portability:** significant (OAuth 2.0 / OIDC) — you lose AuthKit UI, SSO/directory sync configs, audit log pipeline
- **Tiers:**
  - **Pay as You Go:** Free up to 1M MAUs, then $2,500/1M MAUs overage
  - **Annual Credits:** Custom
- **Source:** https://workos.com/pricing

## CI/CD

### Buildkite
- **URL:** https://buildkite.com
- **Portability:** moderate (YAML) — you lose Buildkite agents, Test Engine, Package Registries
- **Tiers:**
  - **Personal:** Free — 1 user, 500 hosted minutes, 50K test executions
  - **Pro:** $30/seat/mo — 2K minutes, 10 agents included
  - **Enterprise:** Custom
- **Source:** https://buildkite.com/pricing

### Depot
- **URL:** https://depot.dev
- **Portability:** drop-in (Docker/OCI) — you lose Depot build cache, managed runners
- **Tiers:**
  - **Developer:** $20/mo — 500 Docker build min, 2K CI min, 25GB cache, 1 user
  - **Startup:** $200/mo — 5K build min, 20K CI min, 250GB cache, unlimited users
  - **Business:** Custom
- **Source:** https://depot.dev/pricing

### CircleCI
- **URL:** https://circleci.com
- **Portability:** moderate (YAML) — you lose CircleCI orbs, credit system, Docker layer caching
- **Tiers:**
  - **Free:** Free — 30K credits/mo, 5 users
  - **Performance:** $15/seat/mo — 30K credits included, $15/25K credits overage
  - **Scale:** Custom (annual)
- **Source:** https://circleci.com/pricing

### GitHub Actions
- **URL:** https://github.com
- **Portability:** moderate (YAML) — you lose GitHub-native triggers, marketplace actions, PR integration
- **Tiers:**
  - **Free:** Free — 2,000 min/mo, 500MB packages storage
  - **Team:** $4/user/mo — 3,000 min/mo, 2GB packages
  - **Enterprise:** $21/user/mo — 50,000 min/mo, 50GB packages
- **Source:** https://github.com/pricing

## Database

### Neon
- **URL:** https://neon.tech
- **Portability:** drop-in (PostgreSQL wire protocol) — you lose serverless autoscaling, scale-to-zero, database branching
- **Tiers:**
  - **Free:** Free — 100 CU-hours, 0.5GB storage, 10 branches
  - **Launch:** Pay-as-you-go — $0.106/CU-hour, $0.35/GB-month storage
  - **Scale:** Pay-as-you-go — $0.222/CU-hour, up to 56 CU, IP allow, HIPAA, SOC 2
- **Source:** https://neon.tech/pricing

### Supabase
- **URL:** https://supabase.com
- **Portability:** drop-in (PostgreSQL wire protocol) — you lose Supabase Auth, Realtime, Edge Functions, Storage, Dashboard
- **Tiers:**
  - **Free:** Free — 500MB database, 1GB file storage, 50K MAUs, 500MB bandwidth, 2 projects
  - **Pro:** $25/mo — 8GB database, 100GB file storage, 100K MAUs, 250GB bandwidth. Overage: $0.125/GB database, $0.021/GB storage
  - **Team:** $599/mo — same as Pro with SOC2, HIPAA, priority support
  - **Enterprise:** Custom
- **Source:** https://supabase.com/pricing

### Convex
- **URL:** https://convex.dev
- **Portability:** significant (proprietary) — you lose reactive queries, real-time sync, server functions, scheduling
- **Tiers:**
  - **Starter:** Free — 6 devs, 1M function calls/mo, 0.5GB database, 1GB files
  - **Professional:** $25/dev/mo — 25M function calls, 50GB database, 100GB files
  - **Business:** From $2,500/mo
- **Source:** https://convex.dev/pricing

### PlanetScale Postgres
- **URL:** https://planetscale.com
- **Portability:** moderate (PostgreSQL wire protocol) — you lose managed HA clustering, metal storage tiers
- **Tiers:**
  - **EBS Non-HA:** From $5/mo (single node)
  - **EBS HA:** From $15/mo (3-node HA)
  - **Metal:** From $50/mo (with included storage, up to 192 vCPU / 1536 GiB)
- **Source:** https://planetscale.com/pricing

### PlanetScale Vitess
- **URL:** https://planetscale.com
- **Portability:** moderate (MySQL wire protocol) — you lose Vitess horizontal sharding, managed HA
- **Tiers:**
  - **Non-Metal:** From $39/mo (MySQL-compatible, 3-node)
  - **Metal:** From $609/mo (with included storage, up to 64 vCPU / 512 GiB)
- **Source:** https://planetscale.com/pricing

### Turso
- **URL:** https://turso.tech
- **Portability:** moderate (SQLite/libSQL) — you lose edge replication, embedded replicas
- **Tiers:**
  - **Free:** Free — 100 databases, 5GB storage, 500M rows read/mo
  - **Developer:** $5.99/mo — 9GB storage, 2.5B rows read, overage: $1/B rows
  - **Scaler:** $29/mo — 24GB storage, 100B rows read, teams, DPA
  - **Pro:** $499/mo — 50GB storage, SSO, HIPAA, SOC2
  - **Enterprise:** Custom
- **Source:** https://turso.tech/pricing

### Upstash
- **URL:** https://upstash.com
- **Portability:** drop-in (Redis protocol) — you lose serverless scaling, global replication, per-request pricing
- **Tiers:**
  - **Free:** Free — 256MB, 10K commands/sec, 10GB bandwidth/mo
  - **Pay as You Go:** $0.20/100K commands, up to 100GB
  - **Fixed 250MB:** $10/mo flat rate
  - **Enterprise:** Custom
- **Source:** https://upstash.com/pricing

## Email

### Resend
- **URL:** https://resend.com
- **Portability:** drop-in (SMTP) — you lose React Email integration, dashboard analytics
- **Tiers:**
  - **Free:** Free — 3,000 emails/mo, 100/day limit, 1 domain
  - **Pro:** $20/mo — 50K emails, $0.90/1K overage, 10 domains
  - **Scale:** $90/mo — 100K emails, volume discounts down to $0.46/1K, dedicated IP
  - **Enterprise:** Custom (3M+ emails/mo)
- **Source:** https://resend.com/pricing

### Unosend
- **URL:** https://www.unosend.co
- **Portability:** drop-in (SMTP) — you lose Unosend dashboard, analytics, contact management
- **Tiers:**
  - **Free:** Free — 5,000 emails/mo, 1,000 contacts
  - **Pro:** $20/mo — 60K emails
  - **Scale:** $100/mo — 200K emails
  - **1M:** $600/mo — 1M emails
  - **Enterprise:** Custom — unlimited, dedicated IP included
- **Source:** https://www.unosend.co/pricing

### Postmark
- **URL:** https://postmarkapp.com
- **Portability:** drop-in (SMTP) — you lose message streams, delivery analytics, template system
- **Tiers:**
  - **Free:** Free — 100 emails/mo
  - **Basic:** $15/mo — 10K emails, $1.80/1K overage
  - **Pro:** $16.50/mo — 10K emails, $1.30/1K overage
  - **Platform:** $18/mo — 10K emails, $1.20/1K overage
- **Source:** https://postmarkapp.com/pricing

### SendGrid
- **URL:** https://sendgrid.com
- **Portability:** drop-in (SMTP) — you lose templates, analytics, dedicated IPs, subuser management
- **Tiers:**
  - **Free:** Free — 100 emails/day (60-day trial)
  - **Essentials:** $19.95/mo — up to 50K emails/mo
  - **Pro:** $89.95/mo — 100K+ emails, dedicated IPs, SSO
  - **Premier:** Custom — 2.5M+ emails
- **Source:** https://sendgrid.com/en-us/pricing

## Hosting

### Netlify
- **URL:** https://netlify.com
- **Portability:** moderate (proprietary) — you lose Netlify Functions, deploy previews, form handling
- **Tiers:**
  - **Free:** Free — 300 credits
  - **Personal:** $9/mo — 1K credits
  - **Pro:** $20/seat/mo — 3K credits
  - **Enterprise:** Custom
- **Source:** https://netlify.com/pricing

### Railway
- **URL:** https://railway.com
- **Portability:** moderate (proprietary) — you lose railway.toml config, built-in databases
- **Tiers:**
  - **Free:** $0 — $1 of free resources
  - **Hobby:** $5/mo (subscription counts toward usage)
  - **Pro:** $20/mo (subscription counts toward usage)
  - **Enterprise:** Custom
- **Resource pricing:** RAM $10/GB/mo, CPU $20/vCPU/mo, Egress $0.05/GB, Storage $0.15/GB/mo
- **Source:** https://railway.com/pricing

### Fly.io
- **URL:** https://fly.io
- **Portability:** moderate (proprietary) — you lose Machines API, global Anycast networking, WireGuard, fly.toml config
- **Tiers:**
  - **Pay As You Go:** Usage-based — shared-cpu-1x from $2.02/mo, volumes $0.15/GB/mo, bandwidth $0.02/GB (NA/EU)
- **Source:** https://fly.io/docs/about/pricing

### Render
- **URL:** https://render.com
- **Portability:** moderate (PostgreSQL wire protocol for databases) — you lose Render infra config, managed Postgres
- **Tiers:**
  - **Hobby:** Free — 100GB bandwidth, 500 build minutes
  - **Professional:** $19/seat/mo — 500GB bandwidth, up to 10 team members
  - **Organization:** $29/seat/mo — 1TB bandwidth, full features
  - **Enterprise:** Custom
- **Source:** https://render.com/pricing

### Vercel
- **URL:** https://vercel.com
- **Portability:** moderate (proprietary) — you lose ISR, Fluid compute, image optimization, edge functions
- **Tiers:**
  - **Hobby:** Free — 1M edge requests, 100GB data transfer, 1M function invocations, 1 developer
  - **Pro:** $20/seat/mo — 10M edge requests, 1TB data transfer, $2/1M requests overage
  - **Enterprise:** Custom
- **Source:** https://vercel.com/pricing

## Monitoring

### Sentry
- **URL:** https://sentry.io
- **Portability:** moderate (proprietary) — you lose Sentry SDKs, session replay, dashboards, alerts
- **Tiers:**
  - **Developer:** Free — 5K errors, 5M spans, 50 replays, 1 user
  - **Team:** $26/mo — 50K errors, 5M spans, 50 replays, volume discounts on overage
  - **Business:** $80/mo — 50K errors, 5M spans, 50 replays, advanced features
  - **Enterprise:** Custom
- **Source:** https://sentry.io/pricing

### Checkly
- **URL:** https://www.checklyhq.com
- **Portability:** moderate (Playwright) — you lose monitoring dashboards, alert integrations, global check locations
- **Tiers:**
  - **Hobby:** Free — 1 user, 10 uptime monitors, 1K browser check runs, 10K API check runs
  - **Starter:** $60/mo — 3 users, 50 monitors, 3K browser runs, 25K API runs, ~20% annual discount
  - **Team:** $163/mo — 10 users, 75 monitors, 12K browser runs, 100K API runs, ~20% annual discount
  - **Enterprise:** Custom
- **Source:** https://www.checklyhq.com/pricing

### New Relic
- **URL:** https://newrelic.com
- **Portability:** moderate (proprietary) — you lose dashboards, NRQL queries, alert policies, APM instrumentation
- **Tiers:**
  - **Free:** Free — 1 full user, 100GB data ingest/mo, 8-day retention
  - **Standard:** From $10/mo — up to 5 full users ($99/additional), 100GB free then $0.40/GB
  - **Pro:** $349/user/mo — unlimited full users, 100GB free then $0.40/GB
  - **Enterprise:** Custom — FedRAMP/HIPAA eligible
- **Source:** https://newrelic.com/pricing

### Honeycomb
- **URL:** https://honeycomb.io
- **Portability:** moderate (OpenTelemetry) — you lose BubbleUp, SLOs, query engine, team query history
- **Tiers:**
  - **Free:** Free — 20M events/mo, 2 triggers
  - **Pro:** $130/mo — 1.5B events/mo, 100 triggers, 2 SLOs
  - **Enterprise:** Custom — 300+ triggers, 100+ SLOs
- **Source:** https://www.honeycomb.io/pricing

## Notifications

### Novu
- **URL:** https://novu.co
- **Portability:** moderate (proprietary) — you lose workflow engine, in-app notification center, digest/batching
- **Tiers:**
  - **Free:** Free — 10K workflow runs/mo, 20 workflows, 3 members
  - **Pro:** $30/mo — 30K runs, $1.20/1K overage, 7-day retention
  - **Team:** $250/mo — 250K runs, $1.20/1K overage, 90-day retention
  - **Enterprise:** Custom — 10M+ runs, HIPAA, SSO
- **Source:** https://novu.co/pricing

### Courier
- **URL:** https://courier.com
- **Portability:** moderate (proprietary) — you lose notification routing, template builder, preference center
- **Tiers:**
  - **Developer:** Free — 10K sends/mo
  - **Business:** $0.005/send (usage-based)
  - **Enterprise:** Custom
- **Source:** https://courier.com/pricing

### Engagespot
- **URL:** https://engagespot.co
- **Portability:** moderate (proprietary) — you lose in-app notification center, preference management, workflow builder
- **Tiers:**
  - **Launch:** Free — 10K event triggers/mo
  - **Growth:** $250/mo — 250K event triggers, $1.50/1K overage
  - **Enterprise:** From $2,500/mo
- **Source:** https://engagespot.co/pricing

## Scheduling

### Mergent
- **URL:** https://mergent.co
- **Portability:** moderate (proprietary) — you lose task scheduling, retry logic, dashboard
- **Tiers:**
  - **Free:** Free — 1K invocations/mo
  - **Standard:** Usage-based with tiered pricing from $0.002/invocation down to $0.000003 at volume
  - **Enterprise:** Custom
- **Source:** https://mergent.co/pricing

## Search

### Orama
- **URL:** https://orama.com
- **Portability:** moderate (proprietary) — you lose Orama Cloud, AI sessions, analytics
- **Tiers:**
  - **Base:** Free — 2 projects, 500 docs/project, 500 AI sessions
  - **Build:** $100/mo — 5 projects, 5K docs/project, 2.5K AI sessions
  - **Scale:** $1,450/mo — 25 projects, 100K docs/project, 10K AI sessions
  - **Enterprise:** Custom
- **Source:** https://orama.com/pricing

### Algolia
- **URL:** https://algolia.com
- **Portability:** moderate (proprietary) — you lose InstantSearch UI, AI Recommendations, query rules, A/B testing
- **Tiers:**
  - **Build:** Free — 10K search requests/mo, 1M records, 10K AI recommendation requests
  - **Grow:** Pay-as-you-go — $0.50/1K search requests, $0.40/1K records (10K requests + 100K records included)
  - **Grow Plus:** Pay-as-you-go — $1.75/1K search requests, $0.40/1K records (same included)
  - **Elevate:** Custom (annual contract)
- **Source:** https://www.algolia.com/pricing

### Weaviate
- **URL:** https://weaviate.io
- **Portability:** significant (proprietary) — you lose schema config, vector compression, hybrid search tuning
- **Tiers:**
  - **Free Trial:** Free — 14 days, 250 query agent requests
  - **Flex:** $45/mo — 30K query agent requests
  - **Premium:** Custom — 99.95% SLA
- **Source:** https://weaviate.io/pricing

## Storage

### Mux
- **URL:** https://mux.com
- **Portability:** significant (proprietary) — you lose Mux Player, Data analytics, encoding pipeline, delivery CDN
- **Tiers:**
  - **Pay As You Go:** Free — 100K delivery minutes free, 6K live caption minutes free, then usage-based
  - **Launch Credits:** $20/mo — $100 in monthly credits
  - **Scale Credits:** $500/mo — $1,000 in monthly credits
  - **Enterprise:** Custom (from $3K/mo)
- **Source:** https://mux.com/pricing

### Tigris
- **URL:** https://tigrisdata.com
- **Portability:** drop-in (S3-compatible) — you lose global distribution, zero egress
- **Tiers:**
  - **Pay as You Go:** Free — 5GB storage, 10K class A requests, 100K class B requests, zero egress fees
  - **Usage:** $0.02/GB/month storage, $0.005/1K class A, $0.0005/1K class B
  - **Enterprise:** Custom
- **Source:** https://tigrisdata.com/pricing

## Analytics

### PostHog
- **URL:** https://posthog.com
- **Portability:** moderate (proprietary) — you lose autocapture, session replay, feature flags, A/B testing
- **Tiers:**
  - **Free:** Free — 1 project, 1 year retention, no credit card needed
  - **Paid:** $0/mo base — 1M analytics events free then $0.00005/event, 5K session recordings free then $0.005/recording, 1M feature flag requests free then $0.0001/request. No per-seat charges.
- **Source:** https://posthog.com/pricing

### Plausible
- **URL:** https://plausible.io
- **Portability:** drop-in (proprietary) — you lose Plausible dashboard, goal tracking, UTM analysis
- **Tiers:**
  - **Starter:** $9/mo — 10K pageviews, 30-day trial, 2 months free on annual
  - **Growth:** $14/mo — 100K pageviews
  - **Business:** $19/mo — 200K pageviews
  - **Enterprise:** Custom — 10M+ pageviews
- **Source:** https://plausible.io/pricing

### Mixpanel
- **URL:** https://mixpanel.com
- **Portability:** moderate (proprietary) — you lose reports, cohorts, funnels, session replay, Spark AI
- **Tiers:**
  - **Free:** Free — 1M events/mo, 5 saved reports, 10K session replays
  - **Growth:** $0/mo base — 1M events free, $0.28/1K events after, up to 20M. 20K session replays.
  - **Enterprise:** Custom — unlimited events, HIPAA, SSO, dedicated support
- **Source:** https://mixpanel.com/pricing

### Amplitude
- **URL:** https://amplitude.com
- **Portability:** moderate (proprietary) — you lose charts, cohorts, experiment analysis, data taxonomy
- **Tiers:**
  - **Starter:** Free — 10K MTUs, 10M events/mo
  - **Plus:** $49/mo (annual) — 300K MTUs, 25M events
  - **Growth:** Custom
  - **Enterprise:** Custom
- **Source:** https://amplitude.com/pricing

## CMS

### Sanity
- **URL:** https://sanity.io
- **Portability:** significant (proprietary) — you lose GROQ query language, Sanity Studio, Content Lake, real-time collaboration
- **Tiers:**
  - **Free:** Free — 20 seats, 10K documents, 1M CDN requests/mo, 250K API requests/mo, 100GB assets, 100GB bandwidth
  - **Growth:** $15/seat/mo — up to 50 seats, 25K documents, overage: $1/250K CDN, $1/25K API, $0.50/GB assets
  - **Enterprise:** Custom
- **Source:** https://sanity.io/pricing

### Contentful
- **URL:** https://contentful.com
- **Portability:** significant (proprietary) — you lose Content model, App Framework, rich text editor, localization workflows
- **Tiers (EUR):**
  - **Free:** Free — 10 users, 100K API calls/mo, 50GB CDN bandwidth, 25 content types, 10K records
  - **Lite:** €300/mo — 20 users, 1M API calls/mo, 100GB CDN bandwidth
  - **Premium:** Custom
- **Source:** https://www.contentful.com/pricing

### Storyblok
- **URL:** https://storyblok.com
- **Portability:** significant (proprietary) — you lose Visual Editor, component-based content, release management
- **Tiers:**
  - **Starter:** Free — 1 user, 100K API requests/mo, 100GB traffic, 2 locales
  - **Growth:** $99/mo ($91/mo annual) — 5 users, 1M API requests, 400GB traffic
  - **Growth Plus:** $349/mo ($320/mo annual) — 15 users, 4M API requests, 1TB traffic
  - **Premium:** Custom
- **Source:** https://www.storyblok.com/pricing

## Edge

### Cloudflare
- **URL:** https://cloudflare.com
- **Portability:** moderate (proprietary) — you lose Cloudflare network, Workers runtime, R2 integration, DDoS protection
- **Tiers:**
  - **Free:** Free — unlimited bandwidth, basic DDoS, 100K Workers requests/day
  - **Pro:** $20/mo — WAF, image optimization
  - **Business:** $200/mo — custom SSL, advanced DDoS, SLA
  - **Enterprise:** Custom
- **Source:** https://cloudflare.com/plans

### Deno Deploy
- **URL:** https://deno.com
- **Portability:** moderate (Web Standards) — you lose Deno KV, global edge network, deploy-from-GitHub
- **Tiers:**
  - **Free:** Free — 1M requests/mo, 100GB bandwidth, 1GiB KV storage
  - **Pro:** $20/mo — 5M requests, 200GB bandwidth, 5GiB KV, overage: $2/1M requests
  - **Builder:** $200/mo — 20M requests, 300GB bandwidth, 10GiB KV
  - **Enterprise:** Custom
- **Source:** https://deno.com/deploy/pricing

## Feature Flags

### LaunchDarkly
- **URL:** https://launchdarkly.com
- **Portability:** moderate (proprietary) — you lose targeting rules, experimentation data, audit logs
- **Tiers:**
  - **Developer:** Free — 5 service connections, 1K client-side MAU, 3 environments, 5K session replays/mo
  - **Foundation:** $12/mo per service connection + $10/mo per 1K client-side MAU
  - **Enterprise:** Custom
- **Source:** https://launchdarkly.com/pricing

### Statsig
- **URL:** https://statsig.com
- **Portability:** moderate (proprietary) — you lose console, experiment analysis, metric definitions, warehouse-native integrations
- **Tiers:**
  - **Free:** Free — 1M events/mo, 5 seats, 10 flags, 3 experiments
  - **Pro:** $150/mo — 50M events, $0.03/1K events overage
  - **Enterprise:** Custom
- **Source:** https://statsig.com/pricing

## Payments

### Stripe
- **URL:** https://stripe.com
- **Portability:** significant (proprietary) — you lose Stripe.js, Elements UI, Connect, Billing, saved payment methods
- **Tiers:**
  - **Standard:** 2.9% + $0.30 per transaction, no monthly fee
  - **Enterprise:** Custom volume pricing
- **Source:** https://stripe.com/pricing

### Paddle
- **URL:** https://paddle.com
- **Portability:** significant (proprietary) — you lose checkout, subscription management, tax compliance, Merchant of Record status
- **Tiers:**
  - **Standard:** 5% + $0.50 per transaction, no monthly fee
  - **Enterprise:** Custom volume pricing
- **Source:** https://www.paddle.com/pricing

## Queues

### Inngest
- **URL:** https://www.inngest.com
- **Portability:** moderate (proprietary) — you lose event-driven orchestration, step functions, flow control, built-in retries
- **Tiers:**
  - **Hobby:** Free — 50K executions/mo, 5 concurrent steps, 3 users
  - **Pro:** $75/mo — 1M executions included, tiered overage from $0.00005 to $0.000015/execution at volume
  - **Enterprise:** Custom
- **Source:** https://www.inngest.com/pricing

### Trigger.dev
- **URL:** https://trigger.dev
- **Portability:** moderate (proprietary) — you lose task orchestration, built-in retry/scheduling, Realtime connections
- **Tiers:**
  - **Free:** Free — $5 usage credit, 20 concurrent runs, 5 members, 10 schedules
  - **Hobby:** $10/mo — $10 usage credit, 50 concurrent runs, 100 schedules, 7-day logs
  - **Pro:** $50/mo — $50 usage credit, 200 concurrent runs, 1K schedules, 30-day logs
  - **Enterprise:** Custom — SOC2, SSO, RBAC
- **Source:** https://trigger.dev/pricing
