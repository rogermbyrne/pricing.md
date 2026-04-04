import { Router, Request, Response } from "express";
import { Registry } from "../../src/registry/registry.js";

export function createBrowseRouter(registry: Registry): Router {
  const router = Router();

  router.get("/browse", (req: Request, res: Response) => {
    const categories = registry.categories();
    const categoryData = categories.map((cat) => {
      const tools = registry.search({ category: cat as any });
      return {
        name: cat,
        displayName: cat.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        count: tools.length,
        topTools: tools.slice(0, 3).map((t) => t.name),
      };
    });

    res.render("browse", {
      title: "Browse Developer Tool Pricing",
      categories: categoryData,
    });
  });

  router.get("/browse/:category", (req: Request, res: Response) => {
    const category = req.params.category as string;
    const tools = registry.search({ category: category as any });

    if (tools.length === 0) {
      res.status(404).render("error", {
        title: "Category Not Found",
        message: `No tools found in category "${category}".`,
      });
      return;
    }

    const displayName = category.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());

    res.render("category", {
      title: `${displayName} Pricing Comparison`,
      category: displayName,
      categorySlug: category,
      tools,
    });
  });

  return router;
}
