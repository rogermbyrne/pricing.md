import { ToolEntry } from "../schema/pricing.js";

export interface ScoreFactor {
  name: string;
  earned: number;
  max: number;
  description: string;
}

export interface TransparencyScore {
  grade: "A" | "B" | "C" | "D" | "F";
  score: number;
  factors: ScoreFactor[];
}

export function computeTransparencyScore(tool: ToolEntry): TransparencyScore {
  const factors: ScoreFactor[] = [];

  // 1. Publishes pricing.md (30 pts)
  const hasPricingMd = tool.pricingUrl.endsWith("/pricing.md");
  factors.push({
    name: "Publishes pricing.md",
    earned: hasPricingMd ? 30 : 0,
    max: 30,
    description: hasPricingMd
      ? "Official machine-readable pricing file"
      : "No pricing.md file published",
  });

  // 2. Has free tier (10 pts)
  const hasFree = tool.tiers.some(
    (t) => t.pricingModel === "free" || t.basePrice === 0
  );
  factors.push({
    name: "Free tier available",
    earned: hasFree ? 10 : 0,
    max: 10,
    description: hasFree ? "Offers a free tier" : "No free tier",
  });

  // 3. All tiers have prices — no "Contact Sales" (15 pts)
  const allPriced = tool.tiers.every((t) => t.basePrice !== null);
  factors.push({
    name: "All prices public",
    earned: allPriced ? 15 : 0,
    max: 15,
    description: allPriced
      ? "Every tier has a listed price"
      : 'Some tiers require "Contact Sales"',
  });

  // 4. Usage metrics documented (15 pts)
  const hasUsageMetrics = tool.tiers.some(
    (t) => t.usageMetrics.length > 0 && t.usageMetrics.some((m) => m.pricePerUnit > 0)
  );
  factors.push({
    name: "Usage pricing documented",
    earned: hasUsageMetrics ? 15 : 0,
    max: 15,
    description: hasUsageMetrics
      ? "Overage/usage rates are documented"
      : "No usage-based pricing details",
  });

  // 5. Portability documented (10 pts)
  const hasPortability =
    tool.portability.whatYouLose.length > 0 &&
    tool.portability.switchingCost !== undefined;
  factors.push({
    name: "Portability documented",
    earned: hasPortability ? 10 : 0,
    max: 10,
    description: hasPortability
      ? "Switching costs and lock-in risks documented"
      : "No portability information",
  });

  // 6. Open standard (10 pts)
  const hasOpenStandard = tool.portability.openStandard !== null;
  factors.push({
    name: "Open standard",
    earned: hasOpenStandard ? 10 : 0,
    max: 10,
    description: hasOpenStandard
      ? `Uses ${tool.portability.openStandard}`
      : "Proprietary protocol",
  });

  // 7. Recently verified (10 pts)
  const daysSinceVerified = Math.floor(
    (Date.now() - new Date(tool.lastVerified).getTime()) / (1000 * 60 * 60 * 24)
  );
  const isRecent = daysSinceVerified <= 30;
  factors.push({
    name: "Recently verified",
    earned: isRecent ? 10 : 0,
    max: 10,
    description: isRecent
      ? `Verified ${daysSinceVerified} day${daysSinceVerified !== 1 ? "s" : ""} ago`
      : `Last verified ${daysSinceVerified} days ago`,
  });

  const score = factors.reduce((sum, f) => sum + f.earned, 0);
  const grade = scoreToGrade(score);

  return { grade, score, factors };
}

function scoreToGrade(score: number): TransparencyScore["grade"] {
  if (score >= 80) return "A";
  if (score >= 60) return "B";
  if (score >= 40) return "C";
  if (score >= 20) return "D";
  return "F";
}

export function gradeColor(grade: TransparencyScore["grade"]): string {
  switch (grade) {
    case "A": return "emerald";
    case "B": return "blue";
    case "C": return "amber";
    case "D": return "orange";
    case "F": return "red";
  }
}
