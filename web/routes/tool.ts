import { Router, Request, Response } from "express";
import { Registry } from "../../src/registry/registry.js";
import { ChangelogDB } from "../changelog-db.js";

export function createToolRouter(registry: Registry, changelogDB: ChangelogDB): Router {
  const router = Router();

  router.get("/tool/:id", (req: Request, res: Response) => {
    const tool = registry.get(req.params.id as string);

    if (!tool) {
      res.status(404).render("error", {
        title: "Tool Not Found",
        message: `Tool "${req.params.id as string}" was not found in the registry.`,
      });
      return;
    }

    const changes = changelogDB.getToolChanges(tool.id);

    res.render("tool", {
      title: `${tool.name} Pricing`,
      tool,
      changes,
    });
  });

  return router;
}
