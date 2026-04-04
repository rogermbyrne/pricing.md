import { Router, Request, Response } from "express";
import { Registry } from "../../src/registry/registry.js";
import { ChangelogDB } from "../changelog-db.js";

export function createChangelogRouter(registry: Registry, changelogDB: ChangelogDB): Router {
  const router = Router();

  router.get("/changelog", (req: Request, res: Response) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const category = (req.query.category as string) || undefined;
    const limit = 50;
    const offset = (page - 1) * limit;

    const changes = changelogDB.getRecentChanges(limit, offset, category);
    const categories = registry.categories();
    const toolNames: Record<string, string> = {};
    for (const change of changes) {
      const tool = registry.get(change.tool_id);
      if (tool) toolNames[change.tool_id] = tool.name;
    }

    res.render("changelog", {
      title: "Pricing Changelog",
      description: "Track pricing changes across all developer tools. See when prices increase, tiers change, or limits are updated.",
      path: "/changelog",
      changes,
      toolNames,
      categories,
      currentCategory: category || "",
      page,
    });
  });

  router.get("/changelog/:toolId", (req: Request, res: Response) => {
    const toolId = req.params.toolId as string;
    const tool = registry.get(toolId);
    const changes = changelogDB.getToolChanges(toolId);

    res.render("changelog", {
      title: tool ? `${tool.name} Pricing Changes` : "Pricing Changes",
      description: tool ? `Track pricing changes for ${tool.name}. See when prices increase, tiers change, or limits are updated.` : "Track pricing changes across all developer tools.",
      path: `/changelog/${toolId}`,
      changes,
      toolNames: tool ? { [toolId]: tool.name } : {},
      categories: registry.categories(),
      currentCategory: "",
      page: 1,
    });
  });

  return router;
}
