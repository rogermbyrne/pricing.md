import { Router, Request, Response } from "express";
import { Registry } from "../../src/registry/registry.js";
import { compareTools, humanizeComparison, generateComparisonSlug, parseComparisonSlug } from "../lib/humanize.js";

export function createGuidesRouter(registry: Registry): Router {
  const router = Router();

  // Guides hub page
  router.get("/guides", (req: Request, res: Response) => {
    const categories = registry.categories();
    
    // Count total pages by type
    const allPairs = registry.allToolPairsByCategory();
    const totalVsPages = Array.from(allPairs.values()).reduce((sum, pairs) => sum + pairs.length, 0);
    const totalAlternativesPages = registry.allTools().length;
    const totalBestFreePages = categories.length;
    
    const categoryGuideCounts = categories.map((cat) => {
      const pairs = registry.toolPairsInCategory(cat);
      const tools = registry.search({ category: cat as any });
      const freeTools = tools.filter(t => t.tiers.some(tier => tier.pricingModel === "free" || tier.basePrice === 0));
      
      return {
       slug: cat,
        displayName: cat.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        vsPages: pairs.length,
        alternativesPages: tools.length,
        bestFreePage: freeTools.length > 0 ? 1 : 0,
      };
    });

    res.render("guides-index", {
      title: "Developer Tool Pricing Guides",
      description: `Compare ${totalAlternativesPages} developer tools with ${totalVsPages} head-to-head pricing comparisons. Find alternatives, best free options, and detailed pricing analysis.`,
      path: "/guides",
      totalVsPages,
      totalAlternativesPages,
      totalBestFreePages,
      categoryGuideCounts,
      lastTools: registry.allTools().slice(0, 8),
    });
  });

  // VS comparison pages
  router.get("/guides/:slugA-vs-:slugB", (req: Request, res: Response) => {
    const { slugA, slugB } = req.params;
    const toolA = registry.get(slugA);
    const toolB = registry.get(slugB);

    if (!toolA || !toolB) {
      res.status(404).render("error", {
        title: "Tools Not Found",
        message: `One or both tools ("${slugA}", "${slugB}") were not found in the registry.`,
      });
      return;
    }

    // Verify tools are in the same category
    if (toolA.category !== toolB.category) {
      res.status(404).render("error", {
        title: "Cross-Category Comparison Not Supported",
        message: `${toolA.name} and ${toolB.name} are in different categories. Comparisons are only available within the same category.`,
      });
      return;
    }

    // Generate comparison using humanization engine
    const comparisonData = compareTools(toolA, toolB);
    const humanized = humanizeComparison(comparisonData);

    // Set noindex if needed
    const metaRobots = comparisonData.shouldNoindex ? "noindex" : "index, follow";

    res.render("guides-vs", {
      title: `${toolA.name} vs ${toolB.name}`,
      description: `Compare ${toolA.name} vs ${toolB.name} pricing side-by-side. Find which tool offers better value for your needs.`,
      path: `/guides/${generateComparisonSlug(toolA.id, toolB.id)}`,
      toolA,
      toolB,
      comparisonData,
      humanizedText: humanized.paragraphs,
      verdict: humanized.verdict,
      metaRobots,
    });
  });

  // Alternatives pages
  router.get("/guides/:tool-alternatives", (req: Request, res: Response) => {
    const toolSlug = req.params.tool.replace("-alternatives", "");
    const tool = registry.get(toolSlug);

    if (!tool) {
      res.status(404).render("error", {
        title: "Tool Not Found",
        message: `Tool "${toolSlug}" was not found in the registry.`,
      });
      return;
    }

    // Find alternatives in the same category
    const alternatives = registry
      .search({ category: tool.category as any })
      .filter((t) => t.id !== tool.id);

    res.render("guides-alternatives", {
      title: `${tool.name} Alternatives & Competitors`,
      description: `Discover ${alternatives.length} alternatives to ${tool.name} in ${tool.category.replace(/-/g, " ")}. Compare pricing, features, and free tier options.`,
      path: `/guides/${tool.id}-alternatives`,
      tool,
      alternatives,
      categoryDisplayName: tool.category.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    });
  });

  // Best-free in category pages
  router.get("/guides/best-free-:category", (req: Request, res: Response) => {
    const category = req.params.category;
    const tools = registry.search({ category: category as any });

    if (tools.length === 0) {
      res.status(404).render("error", {
        title: "Category Not Found",
        message: `No tools found in category "${category}".`,
      });
      return;
    }

    // Filter tools with free tiers
    const freeTools = tools.filter((t) =>
      t.tiers.some((tier) => tier.pricingModel === "free" || tier.basePrice === 0)
    );

    const displayName = category.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

    res.render("guides-best-free", {
      title: `Best Free ${displayName} Tools`,
      description: `Compare ${freeTools.length} free ${displayName.toLowerCase()} tools. Find the best free tiers, limits, and upgrade paths for your projects.`,
      path: `/guides/best-free-${category}`,
      category: displayName,
      categorySlug: category,
      freeTools,
      allToolsCount: tools.length,
    });
  });

  return router;
}
