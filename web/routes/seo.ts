import { Router, Request, Response } from "express";
import { Registry } from "../../src/registry/registry.js";

export function createSeoRouter(registry: Registry): Router {
  const router = Router();

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
