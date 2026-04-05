import { Router, Request, Response } from "express";
import { Registry } from "../../src/registry/registry.js";
import { ChangelogDB } from "../changelog-db.js";

export function createApiRouter(registry: Registry, changelogDB: ChangelogDB): Router {
  const router = Router();

  router.get("/api/tools", (req: Request, res: Response) => {
    const category = req.query.category as string | undefined;
    let tools;

    if (category) {
      tools = registry.search({ category: category as any });
    } else {
      tools = registry.allTools();
    }

    res.json(tools);
  });

  router.get("/api/tools/:id", (req: Request, res: Response) => {
    const tool = registry.get(req.params.id as string);
    if (!tool) {
      res.status(404).json({ error: "Tool not found" });
      return;
    }
    res.json(tool);
  });

  router.get("/api/stats", (req: Request, res: Response) => {
    const categories = registry.categories();
    const allTools = registry.allTools();
    const lastVerified = allTools.reduce((latest, t) => {
      return t.lastVerified > latest ? t.lastVerified : latest;
    }, "");
    res.json({
      tools: allTools.length,
      categories: categories.length,
      lastVerified,
    });
  });

  router.get("/api/changelog", (req: Request, res: Response) => {
    const toolId = req.query.tool as string | undefined;
    const since = req.query.since as string | undefined;

    let changes;
    if (toolId) {
      changes = changelogDB.getToolChanges(toolId);
    } else {
      changes = changelogDB.getRecentChanges(100, 0);
    }

    if (since) {
      changes = changes.filter((c) => c.detected_at >= since);
    }

    res.json(changes);
  });

  return router;
}
