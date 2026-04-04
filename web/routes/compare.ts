import { Router, Request, Response } from "express";
import { Registry } from "../../src/registry/registry.js";

export function createCompareRouter(registry: Registry): Router {
  const router = Router();

  router.get("/compare", (req: Request, res: Response) => {
    const toolsParam = (req.query.tools as string) || "";
    const toolIds = toolsParam
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 5);

    const tools = registry.compare(toolIds).filter((t) => t !== null);
    const allTools = registry.allTools().map((t) => ({ id: t.id, name: t.name, category: t.category }));

    res.render("compare", {
      title: "Compare Pricing",
      tools,
      toolIds,
      allTools,
    });
  });

  return router;
}
