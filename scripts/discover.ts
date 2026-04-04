import Database from "better-sqlite3";
import path from "path";
import { isSafeUrl } from "./lib/safe-url.js";

const DB_PATH = path.join(__dirname, "..", "data", "discovery.db");

interface ToolSeed {
  id: string;
  name: string;
  domain: string;
  category: string;
}

const TOOLS: ToolSeed[] = [
  // Hosting / Deployment
  { id: "vercel", name: "Vercel", domain: "vercel.com", category: "hosting" },
  { id: "railway", name: "Railway", domain: "railway.com", category: "hosting" },
  { id: "netlify", name: "Netlify", domain: "netlify.com", category: "hosting" },
  { id: "fly-io", name: "Fly.io", domain: "fly.io", category: "hosting" },
  { id: "render", name: "Render", domain: "render.com", category: "hosting" },
  { id: "cloudflare-pages", name: "Cloudflare Pages", domain: "cloudflare.com", category: "hosting" },
  { id: "digitalocean-app-platform", name: "DigitalOcean App Platform", domain: "digitalocean.com", category: "hosting" },
  { id: "aws-amplify", name: "AWS Amplify", domain: "aws.amazon.com", category: "hosting" },
  { id: "coolify", name: "Coolify", domain: "coolify.io", category: "hosting" },
  { id: "zeabur", name: "Zeabur", domain: "zeabur.com", category: "hosting" },
  { id: "koyeb", name: "Koyeb", domain: "koyeb.com", category: "hosting" },
  { id: "porter", name: "Porter", domain: "porter.run", category: "hosting" },
  { id: "coherence", name: "Coherence", domain: "withcoherence.com", category: "hosting" },

  // Databases
  { id: "supabase", name: "Supabase", domain: "supabase.com", category: "database" },
  { id: "planetscale", name: "PlanetScale", domain: "planetscale.com", category: "database" },
  { id: "neon", name: "Neon", domain: "neon.tech", category: "database" },
  { id: "turso", name: "Turso", domain: "turso.tech", category: "database" },
  { id: "mongodb-atlas", name: "MongoDB Atlas", domain: "mongodb.com", category: "database" },
  { id: "cockroachdb", name: "CockroachDB", domain: "cockroachlabs.com", category: "database" },
  { id: "upstash", name: "Upstash", domain: "upstash.com", category: "database" },
  { id: "firebase", name: "Firebase", domain: "firebase.google.com", category: "database" },
  { id: "fauna", name: "Fauna", domain: "fauna.com", category: "database" },
  { id: "xata", name: "Xata", domain: "xata.io", category: "database" },
  { id: "convex", name: "Convex", domain: "convex.dev", category: "database" },
  { id: "tigris", name: "Tigris", domain: "tigrisdata.com", category: "database" },
  { id: "redis-cloud", name: "Redis Cloud", domain: "redis.io", category: "database" },
  { id: "aiven", name: "Aiven", domain: "aiven.io", category: "database" },
  { id: "timescale", name: "Timescale", domain: "timescale.com", category: "database" },

  // Auth
  { id: "clerk", name: "Clerk", domain: "clerk.com", category: "auth" },
  { id: "auth0", name: "Auth0", domain: "auth0.com", category: "auth" },
  { id: "workos", name: "WorkOS", domain: "workos.com", category: "auth" },
  { id: "stytch", name: "Stytch", domain: "stytch.com", category: "auth" },
  { id: "kinde", name: "Kinde", domain: "kinde.com", category: "auth" },
  { id: "descope", name: "Descope", domain: "descope.com", category: "auth" },
  { id: "frontegg", name: "Frontegg", domain: "frontegg.com", category: "auth" },
  { id: "propelauth", name: "PropelAuth", domain: "propelauth.com", category: "auth" },
  { id: "stack-auth", name: "Stack Auth", domain: "stack-auth.com", category: "auth" },

  // Email
  { id: "resend", name: "Resend", domain: "resend.com", category: "email" },
  { id: "sendgrid", name: "SendGrid", domain: "sendgrid.com", category: "email" },
  { id: "postmark", name: "Postmark", domain: "postmarkapp.com", category: "email" },
  { id: "mailgun", name: "Mailgun", domain: "mailgun.com", category: "email" },
  { id: "aws-ses", name: "AWS SES", domain: "aws.amazon.com", category: "email" },
  { id: "loops", name: "Loops", domain: "loops.so", category: "email" },
  { id: "plunk", name: "Plunk", domain: "useplunk.com", category: "email" },
  { id: "customer-io", name: "Customer.io", domain: "customer.io", category: "email" },
  { id: "mailchimp", name: "Mailchimp", domain: "mailchimp.com", category: "email" },
  { id: "brevo", name: "Brevo", domain: "brevo.com", category: "email" },

  // Payments
  { id: "stripe", name: "Stripe", domain: "stripe.com", category: "payments" },
  { id: "paddle", name: "Paddle", domain: "paddle.com", category: "payments" },
  { id: "lemon-squeezy", name: "Lemon Squeezy", domain: "lemonsqueezy.com", category: "payments" },
  { id: "chargebee", name: "Chargebee", domain: "chargebee.com", category: "payments" },
  { id: "recurly", name: "Recurly", domain: "recurly.com", category: "payments" },

  // Monitoring / Observability
  { id: "datadog", name: "Datadog", domain: "datadoghq.com", category: "monitoring" },
  { id: "sentry", name: "Sentry", domain: "sentry.io", category: "monitoring" },
  { id: "logrocket", name: "LogRocket", domain: "logrocket.com", category: "monitoring" },
  { id: "axiom", name: "Axiom", domain: "axiom.co", category: "monitoring" },
  { id: "betterstack", name: "BetterStack", domain: "betterstack.com", category: "monitoring" },
  { id: "highlight", name: "Highlight.io", domain: "highlight.io", category: "monitoring" },
  { id: "new-relic", name: "New Relic", domain: "newrelic.com", category: "monitoring" },
  { id: "grafana-cloud", name: "Grafana Cloud", domain: "grafana.com", category: "monitoring" },
  { id: "honeycomb", name: "Honeycomb", domain: "honeycomb.io", category: "monitoring" },
  { id: "pagerduty", name: "PagerDuty", domain: "pagerduty.com", category: "monitoring" },
  { id: "checkly", name: "Checkly", domain: "checklyhq.com", category: "monitoring" },
  { id: "cronitor", name: "Cronitor", domain: "cronitor.io", category: "monitoring" },

  // AI APIs
  { id: "openai", name: "OpenAI", domain: "openai.com", category: "ai-api" },
  { id: "anthropic", name: "Anthropic", domain: "anthropic.com", category: "ai-api" },
  { id: "google-ai", name: "Google AI", domain: "ai.google.dev", category: "ai-api" },
  { id: "mistral", name: "Mistral", domain: "mistral.ai", category: "ai-api" },
  { id: "groq", name: "Groq", domain: "groq.com", category: "ai-api" },
  { id: "replicate", name: "Replicate", domain: "replicate.com", category: "ai-api" },
  { id: "together-ai", name: "Together AI", domain: "together.ai", category: "ai-api" },
  { id: "fireworks-ai", name: "Fireworks AI", domain: "fireworks.ai", category: "ai-api" },
  { id: "perplexity", name: "Perplexity", domain: "perplexity.ai", category: "ai-api" },
  { id: "cohere", name: "Cohere", domain: "cohere.com", category: "ai-api" },
  { id: "deepseek", name: "DeepSeek", domain: "deepseek.com", category: "ai-api" },
  { id: "openrouter", name: "OpenRouter", domain: "openrouter.ai", category: "ai-api" },

  // Storage / CDN
  { id: "cloudflare-r2", name: "Cloudflare R2", domain: "cloudflare.com", category: "storage" },
  { id: "aws-s3", name: "AWS S3", domain: "aws.amazon.com", category: "storage" },
  { id: "uploadthing", name: "UploadThing", domain: "uploadthing.com", category: "storage" },
  { id: "cloudinary", name: "Cloudinary", domain: "cloudinary.com", category: "storage" },
  { id: "bunny-net", name: "Bunny.net", domain: "bunny.net", category: "storage" },
  { id: "backblaze-b2", name: "Backblaze B2", domain: "backblaze.com", category: "storage" },
  { id: "imagekit", name: "ImageKit", domain: "imagekit.io", category: "storage" },
  { id: "mux", name: "Mux", domain: "mux.com", category: "storage" },

  // CI/CD
  { id: "github-actions", name: "GitHub Actions", domain: "github.com", category: "ci-cd" },
  { id: "circleci", name: "CircleCI", domain: "circleci.com", category: "ci-cd" },
  { id: "buildkite", name: "Buildkite", domain: "buildkite.com", category: "ci-cd" },
  { id: "depot", name: "Depot", domain: "depot.dev", category: "ci-cd" },
  { id: "gitlab-ci", name: "GitLab CI", domain: "gitlab.com", category: "ci-cd" },
  { id: "dagger", name: "Dagger", domain: "dagger.io", category: "ci-cd" },
  { id: "earthly", name: "Earthly", domain: "earthly.dev", category: "ci-cd" },

  // Search / Vector DB
  { id: "algolia", name: "Algolia", domain: "algolia.com", category: "search" },
  { id: "typesense", name: "Typesense", domain: "typesense.org", category: "search" },
  { id: "meilisearch", name: "Meilisearch", domain: "meilisearch.com", category: "search" },
  { id: "pinecone", name: "Pinecone", domain: "pinecone.io", category: "search" },
  { id: "weaviate", name: "Weaviate", domain: "weaviate.io", category: "search" },
  { id: "qdrant", name: "Qdrant", domain: "qdrant.tech", category: "search" },
  { id: "chroma", name: "Chroma", domain: "trychroma.com", category: "search" },
  { id: "orama", name: "Orama", domain: "orama.com", category: "search" },

  // Analytics
  { id: "posthog", name: "PostHog", domain: "posthog.com", category: "analytics" },
  { id: "mixpanel", name: "Mixpanel", domain: "mixpanel.com", category: "analytics" },
  { id: "amplitude", name: "Amplitude", domain: "amplitude.com", category: "analytics" },
  { id: "plausible", name: "Plausible", domain: "plausible.io", category: "analytics" },
  { id: "fathom", name: "Fathom", domain: "usefathom.com", category: "analytics" },
  { id: "june", name: "June", domain: "june.so", category: "analytics" },
  { id: "pirsch", name: "Pirsch", domain: "pirsch.io", category: "analytics" },

  // Feature Flags / Experimentation
  { id: "launchdarkly", name: "LaunchDarkly", domain: "launchdarkly.com", category: "feature-flags" },
  { id: "statsig", name: "Statsig", domain: "statsig.com", category: "feature-flags" },
  { id: "flagsmith", name: "Flagsmith", domain: "flagsmith.com", category: "feature-flags" },
  { id: "growthbook", name: "GrowthBook", domain: "growthbook.io", category: "feature-flags" },
  { id: "flipt", name: "Flipt", domain: "flipt.io", category: "feature-flags" },

  // CMS / Content
  { id: "sanity", name: "Sanity", domain: "sanity.io", category: "cms" },
  { id: "contentful", name: "Contentful", domain: "contentful.com", category: "cms" },
  { id: "strapi-cloud", name: "Strapi Cloud", domain: "strapi.io", category: "cms" },
  { id: "payload", name: "Payload", domain: "payloadcms.com", category: "cms" },
  { id: "hygraph", name: "Hygraph", domain: "hygraph.com", category: "cms" },
  { id: "storyblok", name: "Storyblok", domain: "storyblok.com", category: "cms" },
  { id: "builder-io", name: "Builder.io", domain: "builder.io", category: "cms" },

  // Queues / Background Jobs / Workflows
  { id: "inngest", name: "Inngest", domain: "inngest.com", category: "queues" },
  { id: "trigger-dev", name: "Trigger.dev", domain: "trigger.dev", category: "queues" },
  { id: "qstash", name: "QStash", domain: "upstash.com", category: "queues" },
  { id: "temporal", name: "Temporal", domain: "temporal.io", category: "queues" },
  { id: "windmill", name: "Windmill", domain: "windmill.dev", category: "queues" },

  // DNS / Domains / Edge
  { id: "cloudflare", name: "Cloudflare", domain: "cloudflare.com", category: "edge" },
  { id: "fastly", name: "Fastly", domain: "fastly.com", category: "edge" },
  { id: "deno-deploy", name: "Deno Deploy", domain: "deno.com", category: "edge" },

  // Testing
  { id: "playwright-cloud", name: "Playwright (Microsoft)", domain: "playwright.dev", category: "testing" },
  { id: "browserstack", name: "BrowserStack", domain: "browserstack.com", category: "testing" },
  { id: "sauce-labs", name: "Sauce Labs", domain: "saucelabs.com", category: "testing" },
  { id: "lambdatest", name: "LambdaTest", domain: "lambdatest.com", category: "testing" },

  // Cron / Scheduling
  { id: "mergent", name: "Mergent", domain: "mergent.co", category: "scheduling" },

  // Notifications
  { id: "novu", name: "Novu", domain: "novu.co", category: "notifications" },
  { id: "knock", name: "Knock", domain: "knock.app", category: "notifications" },
  { id: "courier", name: "Courier", domain: "courier.com", category: "notifications" },
  { id: "engagespot", name: "Engagespot", domain: "engagespot.co", category: "notifications" },
];

function initDb(): Database.Database {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS tools (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      domain TEXT NOT NULL,
      category TEXT NOT NULL,
      has_pricing_md INTEGER NOT NULL DEFAULT 0,
      pricing_md_url TEXT,
      llms_txt_url TEXT,
      pricing_page_url TEXT,
      last_checked TEXT,
      last_parsed TEXT,
      parse_status TEXT NOT NULL DEFAULT 'pending',
      notes TEXT
    )
  `);

  return db;
}

async function checkUrl(url: string): Promise<{ ok: boolean; redirectedTo?: string }> {
  if (!isSafeUrl(url)) {
    console.error(`  [warn] Blocked unsafe URL: ${url}`);
    return { ok: false };
  }
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
      headers: {
        "User-Agent": "PricingMD-Discovery/1.0",
      },
    });

    if (!res.ok) return { ok: false };

    // Check content-type — we want markdown or plain text, not HTML pricing pages
    const contentType = res.headers.get("content-type") || "";
    const body = await res.text();

    // If it's HTML but very short or looks like a redirect page, skip
    if (contentType.includes("text/html")) {
      // Some servers serve markdown with text/html content-type
      // Check if body looks like markdown (starts with # or has markdown patterns)
      if (body.startsWith("#") || body.includes("\n## ") || body.includes("\n- ")) {
        return { ok: true };
      }
      return { ok: false };
    }

    // text/markdown, text/plain, application/octet-stream with markdown content
    if (body.length > 50 && (body.startsWith("#") || body.includes("\n## ") || body.includes("\n- "))) {
      return { ok: true };
    }

    return { ok: body.length > 50 };
  } catch (e) {
    console.error(`  [warn] ${url}: ${(e as Error).message}`);
    return { ok: false };
  }
}

async function checkLlmsTxt(domain: string): Promise<{ url: string; pricingRef?: string } | null> {
  const url = `https://${domain}/llms.txt`;
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: { "User-Agent": "PricingMD-Discovery/1.0" },
    });

    if (!res.ok) return null;

    const body = await res.text();
    if (body.length < 20) return null;

    // Look for references to pricing.md or pricing in the llms.txt
    const pricingMatch = body.match(/https?:\/\/[^\s)]+pricing[^\s)]*/i);
    const pricingRef = pricingMatch?.[0];

    // Validate extracted URL before trusting it — llms.txt is untrusted content
    if (pricingRef && !isSafeUrl(pricingRef)) {
      console.error(`  [warn] Blocked unsafe URL extracted from llms.txt: ${pricingRef}`);
      return { url, pricingRef: undefined };
    }

    return { url, pricingRef };
  } catch (e) {
    console.error(`  [warn] llms.txt ${domain}: ${(e as Error).message}`);
    return null;
  }
}

async function discoverTool(tool: ToolSeed): Promise<{
  has_pricing_md: boolean;
  pricing_md_url: string | null;
  llms_txt_url: string | null;
  notes: string[];
}> {
  const notes: string[] = [];
  let pricing_md_url: string | null = null;
  let llms_txt_url: string | null = null;

  // Check common pricing.md locations
  const urlsToCheck = [
    `https://${tool.domain}/pricing.md`,
    `https://${tool.domain}/docs/pricing.md`,
    `https://docs.${tool.domain}/pricing.md`,
  ];

  for (const url of urlsToCheck) {
    const result = await checkUrl(url);
    if (result.ok) {
      pricing_md_url = url;
      notes.push(`Found pricing.md at ${url}`);
      break;
    }
  }

  // Check llms.txt
  const llmsResult = await checkLlmsTxt(tool.domain);
  if (llmsResult) {
    llms_txt_url = llmsResult.url;
    notes.push(`Found llms.txt at ${llmsResult.url}`);

    // If we didn't find a pricing.md directly, check if llms.txt references one
    if (!pricing_md_url && llmsResult.pricingRef) {
      const refResult = await checkUrl(llmsResult.pricingRef);
      if (refResult.ok) {
        pricing_md_url = llmsResult.pricingRef;
        notes.push(`Found pricing.md via llms.txt reference: ${llmsResult.pricingRef}`);
      }
    }
  }

  return {
    has_pricing_md: pricing_md_url !== null,
    pricing_md_url,
    llms_txt_url,
    notes,
  };
}

async function main() {
  console.log(`PricingMD Discovery — checking ${TOOLS.length} tools across ${new Set(TOOLS.map(t => t.category)).size} categories\n`);

  const db = initDb();
  const now = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  const upsert = db.prepare(`
    INSERT INTO tools (id, name, domain, category, has_pricing_md, pricing_md_url, llms_txt_url, last_checked, parse_status, notes)
    VALUES (@id, @name, @domain, @category, @has_pricing_md, @pricing_md_url, @llms_txt_url, @last_checked, @parse_status, @notes)
    ON CONFLICT(id) DO UPDATE SET
      has_pricing_md = @has_pricing_md,
      pricing_md_url = @pricing_md_url,
      llms_txt_url = @llms_txt_url,
      last_checked = @last_checked,
      notes = @notes
  `);

  let found = 0;
  let notFound = 0;
  let hasLlmsTxt = 0;
  const results: { tool: ToolSeed; has_pricing_md: boolean; llms_txt: boolean; notes: string[] }[] = [];

  // Process in batches of 5 to avoid hammering servers
  for (let i = 0; i < TOOLS.length; i += 5) {
    const batch = TOOLS.slice(i, i + 5);
    const batchResults = await Promise.all(
      batch.map(async (tool) => {
        process.stdout.write(`  Checking ${tool.name}...`);
        const result = await discoverTool(tool);

        upsert.run({
          id: tool.id,
          name: tool.name,
          domain: tool.domain,
          category: tool.category,
          has_pricing_md: result.has_pricing_md ? 1 : 0,
          pricing_md_url: result.pricing_md_url,
          llms_txt_url: result.llms_txt_url,
          last_checked: now,
          parse_status: result.has_pricing_md ? "pending" : "no_file",
          notes: result.notes.length > 0 ? result.notes.join("; ") : null,
        });

        if (result.has_pricing_md) {
          console.log(` pricing.md found`);
          found++;
        } else if (result.llms_txt_url) {
          console.log(` no pricing.md (has llms.txt)`);
          hasLlmsTxt++;
          notFound++;
        } else {
          console.log(` no pricing.md`);
          notFound++;
        }

        return { tool, has_pricing_md: result.has_pricing_md, llms_txt: !!result.llms_txt_url, notes: result.notes };
      })
    );
    results.push(...batchResults);
  }

  // Summary
  console.log("\n========================================");
  console.log("DISCOVERY SUMMARY");
  console.log("========================================\n");
  console.log(`Total tools checked: ${TOOLS.length}`);
  console.log(`With pricing.md:     ${found}`);
  console.log(`Without pricing.md:  ${notFound}`);
  console.log(`With llms.txt:       ${hasLlmsTxt + results.filter(r => r.has_pricing_md && r.llms_txt).length}`);

  // By category
  console.log("\nBy category:");
  const categories = [...new Set(TOOLS.map((t) => t.category))];
  for (const cat of categories) {
    const catResults = results.filter((r) => r.tool.category === cat);
    const catFound = catResults.filter((r) => r.has_pricing_md).length;
    console.log(`  ${cat}: ${catFound}/${catResults.length} have pricing.md`);
  }

  // Tools with pricing.md
  if (found > 0) {
    console.log("\nTools with pricing.md:");
    for (const r of results.filter((r) => r.has_pricing_md)) {
      console.log(`  ${r.tool.name} (${r.tool.category})`);
      for (const note of r.notes) {
        console.log(`    ${note}`);
      }
    }
  }

  // Tools with llms.txt but no pricing.md
  const llmsOnly = results.filter((r) => !r.has_pricing_md && r.llms_txt);
  if (llmsOnly.length > 0) {
    console.log("\nTools with llms.txt but no pricing.md:");
    for (const r of llmsOnly) {
      console.log(`  ${r.tool.name} (${r.tool.category})`);
    }
  }

  db.close();
  console.log(`\nResults saved to ${DB_PATH}`);
}

main().catch(console.error);
