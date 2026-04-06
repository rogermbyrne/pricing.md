import { Router, Request, Response } from "express";
import { Registry } from "../../src/registry/registry.js";
import { computeTransparencyScore, TransparencyScore } from "../../src/lib/transparency-score.js";

interface RankedTool {
  id: string;
  name: string;
  category: string;
  score: number;
  grade: TransparencyScore["grade"];
  hasPricingMd: boolean;
}

export function createTransparencyRouter(registry: Registry): Router {
  const router = Router();

  router.get("/transparency", (req: Request, res: Response) => {
    const allTools = registry.allTools().filter((t) => t.category !== "ai-api");

    const ranked: RankedTool[] = allTools
      .map((tool) => {
        const { grade, score } = computeTransparencyScore(tool);
        return {
          id: tool.id,
          name: tool.name,
          category: tool.category,
          score,
          grade,
          hasPricingMd: tool.pricingUrl.endsWith("/pricing.md"),
        };
      })
      .sort((a, b) => b.score - a.score);

    const grades = ["A", "B", "C", "D", "F"] as const;
    const grouped = Object.fromEntries(
      grades.map((g) => [g, ranked.filter((t) => t.grade === g)])
    );

    const stats = {
      total: ranked.length,
      withPricingMd: ranked.filter((t) => t.hasPricingMd).length,
      avgScore: Math.round(ranked.reduce((s, t) => s + t.score, 0) / ranked.length),
    };

    res.render("transparency", {
      title: "Pricing Transparency Leaderboard",
      description: `See how ${stats.total} developer tools rank on pricing transparency. ${stats.withPricingMd} tools publish official pricing.md files.`,
      path: "/transparency",
      grouped,
      grades,
      stats,
    });
  });

  return router;
}
