import { Router, Request, Response } from "express";
import { Registry } from "../../src/registry/registry.js";
import { ChangelogDB } from "../changelog-db.js";
import { VoteDB } from "../vote-db.js";
import { generatePricingMarkdown } from "../../src/lib/pricing-markdown.js";
import { computeTransparencyScore } from "../../src/lib/transparency-score.js";

export function createToolRouter(registry: Registry, changelogDB: ChangelogDB, voteDB: VoteDB): Router {
  const router = Router();

  router.get("/tool/:id", (req: Request, res: Response) => {
    const tool = registry.get(req.params.id as string);

    if (!tool) {
      res.status(404).render("error", {
        title: "Tool Not Found",
        message: `Tool "${req.params.id as string}" was not found in the registry.`,
        description: `Tool "${req.params.id as string}" was not found in the registry.`,
        path: req.originalUrl,
        metaRobots: "noindex, follow",
      });
      return;
    }

    const changes = changelogDB.getToolChanges(tool.id);
    const voteCount = voteDB.getVoteCount(tool.id);
    const transparency = computeTransparencyScore(tool);

    res.render("tool", {
      title: `${tool.name} Pricing`,
      description: `Compare ${tool.name} pricing tiers, free tier limits, and switching costs. Verified ${tool.lastVerified}.`,
      path: `/tool/${tool.id}`,
      tool,
      changes,
      voteCount,
      transparency,
    });
  });

  router.get("/tool/:id/badge.svg", (req: Request, res: Response) => {
    const tool = registry.get(req.params.id as string);

    if (!tool) {
      res.status(404).set("Content-Type", "text/plain; charset=utf-8").send("Tool not found.");
      return;
    }

    const { grade, score } = computeTransparencyScore(tool);
    const colorMap: Record<string, string> = {
      A: "#10b981", B: "#3b82f6", C: "#f59e0b", D: "#f97316", F: "#ef4444",
    };
    const color = colorMap[grade] || "#6b7280";

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="20" role="img" aria-label="pricing transparency: ${grade}">
  <title>Pricing Transparency: ${grade} (${score}/100)</title>
  <linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient>
  <clipPath id="r"><rect width="180" height="20" rx="3" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="125" height="20" fill="#555"/>
    <rect x="125" width="55" height="20" fill="${color}"/>
    <rect width="180" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="11">
    <text x="62.5" y="14" fill="#010101" fill-opacity=".3">pricing transparency</text>
    <text x="62.5" y="13">pricing transparency</text>
    <text x="152" y="14" fill="#010101" fill-opacity=".3">${grade} (${score})</text>
    <text x="152" y="13">${grade} (${score})</text>
  </g>
</svg>`;

    res.set("Content-Type", "image/svg+xml");
    res.set("Cache-Control", "public, max-age=86400");
    res.send(svg);
  });

  router.get("/tool/:id/pricing.md", (req: Request, res: Response) => {
    const tool = registry.get(req.params.id as string);

    if (!tool) {
      res.status(404).set("Content-Type", "text/plain; charset=utf-8").send(`Tool "${req.params.id as string}" not found.`);
      return;
    }

    const markdown = generatePricingMarkdown(tool);
    res.set("Content-Type", "text/markdown; charset=utf-8");
    res.send(markdown);
  });

  return router;
}
