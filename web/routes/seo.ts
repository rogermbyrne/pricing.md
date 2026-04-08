import { Router, Request, Response } from "express";
import { Registry } from "../../src/registry/registry.js";
import { compareTools } from "../lib/humanize.js";

export function createSeoRouter(registry: Registry): Router {
  const router = Router();

  router.get("/llms.txt", (req: Request, res: Response) => {
    const categories = registry.categories().filter((cat) => cat !== "ai-api");
    const allTools = registry.allTools().filter((t) => t.category !== "ai-api");
    const totalTools = allTools.length;
    const totalCategories = categories.length;

    const categoryLines = categories.map((cat) => {
      const tools = registry.search({ category: cat as any });
      const topNames = tools.slice(0, 4).map((t) => t.name).join(", ");
      const displayName = cat.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      return `- [${displayName}](/browse/${cat}): ${topNames}, and more`;
    });

    const text = `# Pricing.md

> Developer tool pricing registry with ${totalTools} tools across ${totalCategories} categories. Compare pricing, free tiers, switching costs, and portability for ${categories.map(c => c.replace(/-/g, " ")).join(", ")} tools.

## Browse Categories

${categoryLines.join("\n")}

## Pricing Markdown Files

Every tool has a machine-readable pricing.md file at \`/tool/{id}/pricing.md\`. These files contain structured pricing tiers, limits, overage rates, and portability data.

## API

- [All Tools JSON](/api/tools): Complete tool listing with pricing data
- [Single Tool](/api/tools/{id}): Full pricing details for a specific tool
- [Changelog](/api/changelog): Pricing change history

## Guides

- [Guides](/guides): 2416 VS comparisons, 303 alternatives pages, 22 best-free guides
- [Vercel vs Railway](/guides/railway-vs-vercel): Head-to-head comparison
- [Supabase vs PlanetScale](/guides/planetscale-vs-supabase): Head-to-head comparison
- [Sendgrid Alternatives](/guides/sendgrid-alternatives): Find similar email tools
- [Best Free Hosting](/guides/best-free-hosting): Free tier comparison

## Compare Tools

- [Compare](/compare): Side-by-side tool comparison (add ?tools=vercel,netlify,railway)

## Optional

- [GitHub Repository](https://github.com/rogermbyrne/pricing.md)
- [Install as Skill](https://github.com/rogermbyrne/pricing.md#install-as-a-skill): \`npx skills add rogermbyrne/pricing.md\`
`;

    res.set("Content-Type", "text/plain; charset=utf-8");
    res.send(text);
  });

  router.get("/sitemap.xml", (req: Request, res: Response) => {
    const BASE = "https://latest.sh";
    const today = new Date().toISOString().split("T")[0];

    const categories = registry.categories().filter((cat) => cat !== "ai-api");
    const allTools = registry.allTools().filter((t) => t.category !== "ai-api");

    const seen = new Set<string>();
    const entries: Array<{ loc: string; lastmod: string; changefreq: string; priority: string }> = [];

    const addUrl = (loc: string, lastmod: string, changefreq: string, priority: string) => {
      if (seen.has(loc)) return;
      seen.add(loc);
      entries.push({ loc, lastmod, changefreq, priority });
    };

    addUrl(`${BASE}/`, today, "daily", "1.0");
    addUrl(`${BASE}/browse`, today, "daily", "0.9");

    for (const cat of categories) {
      addUrl(`${BASE}/browse/${cat}`, today, "daily", "0.8");
    }

    for (const tool of allTools) {
      const lastmod = tool.lastVerified || today;
      addUrl(`${BASE}/tool/${tool.id}`, lastmod, "weekly", "0.7");
      addUrl(`${BASE}/tool/${tool.id}/pricing.md`, lastmod, "weekly", "0.6");
    }

    addUrl(`${BASE}/transparency`, today, "daily", "0.8");
    addUrl(`${BASE}/compare`, today, "daily", "0.5");
    addUrl(`${BASE}/changelog`, today, "daily", "0.5");
    addUrl(`${BASE}/guides`, today, "daily", "0.8");
    addUrl(`${BASE}/stack`, today, "daily", "0.6");

    // Add best-free pages for each category
    for (const cat of categories) {
      addUrl(`${BASE}/guides/best-free-${cat}`, today, "weekly", "0.6");
    }

    // Add VS comparison pages for all category pairs (not limited to 100)
    for (const cat of categories) {
      const tools = registry.search({ category: cat as any });
      if (tools.length >= 2) {
        for (let i = 0; i < tools.length; i++) {
          for (let j = i + 1; j < tools.length; j++) {
            const sorted = [tools[i].id, tools[j].id].sort();
            const lastmod = tools[i].lastVerified > tools[j].lastVerified ? tools[i].lastVerified : tools[j].lastVerified;
            addUrl(`${BASE}/guides/${sorted[0]}-vs-${sorted[1]}`, lastmod, "weekly", "0.5");
          }
        }
      }
    }

    // Add all alternatives pages (not just first 50)
    for (const tool of allTools) {
      addUrl(`${BASE}/guides/${tool.id}-alternatives`, tool.lastVerified || today, "weekly", "0.5");
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map(
    (entry) => `  <url>
    <loc>${entry.loc}</loc>
    <lastmod>${entry.lastmod}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;

    res.set("Content-Type", "application/xml");
    res.send(xml);
  });

  return router;
}
