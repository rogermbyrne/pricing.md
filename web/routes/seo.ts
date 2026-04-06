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

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${BASE}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${BASE}/browse</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`;

    for (const cat of categories) {
      xml += `
  <url>
    <loc>${BASE}/browse/${cat}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`;
    }

    for (const tool of allTools) {
      const lastmod = tool.lastVerified || today;
      xml += `
  <url>
    <loc>${BASE}/tool/${tool.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${BASE}/tool/${tool.id}/pricing.md</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`;
    }

    xml += `
  <url>
    <loc>${BASE}/transparency</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${BASE}/compare</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>${BASE}/changelog</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>${BASE}/guides</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${BASE}/stack</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>${BASE}/transparency</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${BASE}/guides</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`;

    // Add best-free pages for each category
    for (const cat of categories) {
      xml += `
  <url>
    <loc>${BASE}/guides/best-free-${cat}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`;
    }

    // Add alternatives pages for popular tools (first 50)
    const popularTools = allTools.slice(0, 50);
    for (const tool of popularTools) {
      xml += `
  <url>
    <loc>${BASE}/guides/${tool.id}-alternatives</loc>
    <lastmod>${tool.lastVerified || today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.5</priority>
  </url>`;
    }

    // Add a sample of VS comparison pages (first 100 pairs)
    let vsCount = 0;
    const maxVsPages = 100;
    for (const cat of categories) {
      const tools = registry.search({ category: cat as any });
      if (tools.length >= 2) {
        for (let i = 0; i < Math.min(tools.length, 5) && vsCount < maxVsPages; i++) {
          for (let j = i + 1; j < Math.min(tools.length, 6) && vsCount < maxVsPages; j++) {
            const sorted = [tools[i].id, tools[j].id].sort();
            xml += `
  <url>
    <loc>${BASE}/guides/${sorted[0]}-vs-${sorted[1]}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.5</priority>
  </url>`;
            vsCount++;
          }
        }
      }
    }

    xml += `
</urlset>`;

    res.set("Content-Type", "application/xml");
    res.send(xml);
  });

  return router;
}
