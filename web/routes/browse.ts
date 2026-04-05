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

    const allTools = registry.allTools().filter((t) => t.category !== "ai-api");
    const lastVerified = allTools.reduce((latest, t) => {
      return t.lastVerified > latest ? t.lastVerified : latest;
    }, "");

    res.render("browse", {
      title: "Browse Developer Tool Pricing",
      description: "Compare pricing across " + categoryData.reduce((sum, c) => sum + c.count, 0) + " developer tools in " + categoryData.length + " categories. Find free tiers, switching costs, and the cheapest options.",
      path: "/browse",
      categories: categoryData,
      lastVerified,
    });
  });

  router.get("/browse/:category", (req: Request, res: Response) => {
    const category = req.params.category as string;

    let tools = registry.search({ category: category as any });

    if (tools.length === 0) {
      res.status(404).render("error", {
        title: "Category Not Found",
        message: `No tools found in category "${category}".`,
      });
      return;
    }

    const sort = (req.query.sort as string) || "verified";

    if (sort === "lowest-paid") {
      tools = [...tools].sort((a, b) => {
        const aPrice = Math.min(...a.tiers.filter(t => t.basePrice !== null && t.basePrice > 0).map(t => t.basePrice!));
        const bPrice = Math.min(...b.tiers.filter(t => t.basePrice !== null && t.basePrice > 0).map(t => t.basePrice!));
        const aVal = isFinite(aPrice) ? aPrice : 999999;
        const bVal = isFinite(bPrice) ? bPrice : 999999;
        return aVal - bVal;
      });
    } else if (sort === "name") {
      tools = [...tools].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === "free-first") {
      tools = [...tools].sort((a, b) => {
        const aFree = a.tiers.some(t => t.pricingModel === "free" || t.basePrice === 0) ? 0 : 1;
        const bFree = b.tiers.some(t => t.pricingModel === "free" || t.basePrice === 0) ? 0 : 1;
        return aFree - bFree || a.name.localeCompare(b.name);
      });
    } else if (sort === "verified") {
      tools = [...tools].sort((a, b) => {
        const aVerified = a.pricingUrl.endsWith("/pricing.md") ? 0 : 1;
        const bVerified = b.pricingUrl.endsWith("/pricing.md") ? 0 : 1;
        return aVerified - bVerified || a.name.localeCompare(b.name);
      });
    }

    const displayName = category.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());

    res.render("category", {
      title: `${displayName} Pricing Comparison`,
      description: `Compare ${displayName.toLowerCase()} tool pricing side-by-side. ${tools.length} tools with free tier details, switching costs, and verified prices.`,
      path: `/browse/${category}`,
      category: displayName,
      categorySlug: category,
      tools,
      currentSort: sort,
    });
  });

  return router;
}
