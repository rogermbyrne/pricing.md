import { Router, Request, Response } from "express";
import { Registry } from "../../src/registry/registry.js";

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

## API

- [All Tools JSON](/api/tools): Complete tool listing with pricing data
- [Single Tool](/api/tools/{id}): Full pricing details for a specific tool
- [Changelog](/api/changelog): Pricing change history

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
  </url>`;
    }

    xml += `
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
</urlset>`;

    res.set("Content-Type", "application/xml");
    res.send(xml);
  });

  return router;
}
