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
      .filter((s) => /^[a-z0-9][a-z0-9-]*$/.test(s)) // only valid slugs
      .slice(0, 5);

    const tools = registry.compare(toolIds).filter((t) => t !== null);
    const allTools = registry.allTools().map((t) => ({ id: t.id, name: t.name, category: t.category }));

    const toolNames = tools.filter((t) => t !== null).map((t) => t!.name);
    const desc = toolNames.length > 0
      ? `Side-by-side pricing comparison of ${toolNames.join(", ")}. Compare tiers, free plans, and switching costs.`
      : "Compare developer tool pricing side-by-side. Select up to 5 tools to compare tiers, free plans, and switching costs.";

    res.render("compare", {
      title: "Compare Pricing",
      description: desc,
      path: "/compare",
      tools,
      toolIds,
      allTools,
    });
  });

  return router;
}
