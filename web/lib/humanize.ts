import { ToolEntry, PricingModel, SwitchingCost } from "../../src/schema/pricing.js";
import crypto from "crypto";

/**
 * Deterministic string to number hash for consistent template selection
 */
function deterministicHash(str: string): number {
  const hash = crypto.createHash("md5").update(str).digest("hex");
  return parseInt(hash.substring(0, 8), 16);
}

/**
 * Get lowest non-free tier base price for a tool
 */
function getLowestBasePrice(tool: ToolEntry): number | null {
  const nonFreeTiers = tool.tiers.filter(
    t => t.pricingModel !== "free" && t.basePrice !== null && t.basePrice > 0
  );
  if (nonFreeTiers.length === 0) return null;
  return Math.min(...nonFreeTiers.map(t => t.basePrice!));
}

/**
 * Helper to check if tool has a free tier
 */
function hasFreeTier(tool: ToolEntry): boolean {
  return tool.tiers.some(
    t => t.pricingModel === "free" || t.basePrice === 0
  );
}

/**
 * Helper to get primary pricing model (most common non-free model)
 */
function getPrimaryPricingModel(tool: ToolEntry): PricingModel | null {
  const nonFreeModels = tool.tiers
    .filter(t => t.pricingModel !== "free" && t.pricingModel !== "custom")
    .map(t => t.pricingModel);
  if (nonFreeModels.length === 0) return null;
  
  const countMap = new Map<PricingModel, number>();
  nonFreeModels.forEach(model => countMap.set(model, (countMap.get(model) || 0) + 1));
  
  return Array.from(countMap.entries())
    .sort((a, b) => b[1] - a[1])[0][0];
}

/**
 * Sentence variation pools for different data points
 */
const priceGapTemplates = [
  "The cost difference is substantial — {toolA} runs about {priceDifference}x what {toolB} charges.",
  "Budget-wise, {toolB} is clearly more affordable at roughly a {priceDifference}x price difference.",
  "You're paying a premium for {toolA} — expect around a {priceDifference}x higher bill compared to {toolB}.",
  "Price sensitivity favors {toolB}, which costs about {priceDifference}x less than {toolA}.",
  "The pricing gap between {toolB} and {toolA} runs about {priceDifference}x — significant consideration for scaling.",
];

const freeTierTemplates: string[] = [
  "The free tier advantage goes to {hasFreeTool}, which offers a no-cost entry point that {noFreeTool} lacks.",
  "Startups take note: {hasFreeTool} provides a free tier, while {noFreeTool} requires payment from day one.",
  "For experimentation and testing, {hasFreeTool} wins with its free tier option — something {noFreeTool} doesn't offer.",
];

const pricingModelTemplates: string[] = [
  "Their pricing models diverge: {modelATool} uses {modelAModel}, while {modelBTool} operates on a {modelBModel} basis.",
  "Pricing philosophy differs — {modelATool} charges {modelAModel}, but {modelBTool} takes a {modelBModel} approach.",
  "You'll notice different pricing structures: {modelAModel} for {modelATool} versus {modelBModel} for {modelBTool}.",
  "Cost modeling varies: {modelAModel} drives {modelATool} pricing, while {modelBTool} uses {modelBModel}.",
];

const switchingCostTemplates: string[] = [
  "Switching costs favor {easierTool}: {easierCost} migration compared to {harderTool}'s {harderCost} effort.",
  "If you value flexibility, {easierTool} offers {easierCost} switching versus {harderTool}'s {harderCost} requirements.",
  "Migration considerations lean toward {easierTool} — expect {easierCost} effort versus {harderTool}'s {harderCost} approach.",
];

const verdictTemplatesByAdvantage: Record<string, string[]> = {
  price: [
    "Price-conscious teams should choose {winner} — the cost advantage is hard to ignore, especially for growing workloads.",
    "If budget is your primary constraint, {winner} is the clear winner with its more wallet-friendly pricing structure.",
  ],
  free_tier: [
    "{winner} stands out for teams needing a free tier — zero upfront costs for prototyping and testing is a genuine advantage.",
    "For early-stage teams or experimental projects, {winner}'s free tier provides valuable runway without commitment.",
  ],
  features: [
    "Feature-rich teams should consider {winner} — the additional capabilities justify the investment for comprehensive deployments.",
    "If feature depth matters most, {winner} delivers more value despite potentially higher costs.",
  ],
  switching: [
    "{winner} wins on flexibility — easier switching means less lock-in and more options for your long-term strategy.",
    "Teams prioritizing vendor flexibility should choose {winner} — lower switching costs preserve your future options.",
  ],
  balanced: [
    "Both tools have compelling strengths — choose {winner} if you value {coreAdvantage}, otherwise {loser} offers advantages in {loserAdvantage}.",
    "It's a toss-up based on priorities — {winner} excels at {coreAdvantage}, while {loser} shines on {loserAdvantage}.",
  ],
};

/**
 * Comparison data structure
 */
export interface ComparisonData {
  toolA: ToolEntry;
  toolB: ToolEntry;
  shouldNoindex: boolean;
  priceGap?: { ratio: number; cheaper: "A" | "B"; absoluteDiff: number };
  freeTierAdvantage?: "A" | "B";
  pricingModelDiffer?: boolean;
  switchingCostWinner?: "A" | "B";
  verdict?: {
    winner: "A" | "B";
    advantage: string;
    reasoning: string;
  };
}

/**
 * Analyze two tools for comparison
 */
export function compareTools(toolA: ToolEntry, toolB: ToolEntry): ComparisonData {
  const data: ComparisonData = {
    toolA,
    toolB,
    shouldNoindex: false,
  };

  // Check for noindex criteria
  const primaryModelA = getPrimaryPricingModel(toolA);
  const primaryModelB = getPrimaryPricingModel(toolB);
  const basePriceA = getLowestBasePrice(toolA);
  const basePriceB = getLowestBasePrice(toolB);

  if (
    primaryModelA === primaryModelB &&
    basePriceA === basePriceB &&
    toolA.portability.switchingCost === toolB.portability.switchingCost
  ) {
    data.shouldNoindex = true;
  }

  // Calculate price gap
  if (basePriceA !== null && basePriceB !== null && basePriceA !== basePriceB) {
    const ratio = basePriceA > basePriceB ? basePriceA / basePriceB : basePriceB / basePriceA;
    data.priceGap = {
      ratio: Math.round(ratio * 10) / 10,
      cheaper: basePriceA < basePriceB ? "A" : "B",
      absoluteDiff: Math.abs(basePriceA - basePriceB),
    };
  }

  // Free tier advantage
  const hasFreeA = hasFreeTier(toolA);
  const hasFreeB = hasFreeTier(toolB);
  if (hasFreeA !== hasFreeB) {
    data.freeTierAdvantage = hasFreeA ? "A" : "B";
  }

  // Pricing model difference
  if (primaryModelA !== primaryModelB && primaryModelA && primaryModelB) {
    data.pricingModelDiffer = true;
  }

  // Switching cost comparison
  const costCompare = compareSwitchingCost(toolA.portability.switchingCost, toolB.portability.switchingCost);
  if (costCompare !== "equal") {
    data.switchingCostWinner = costCompare === "lower" ? "A" : "B";
  }

  // Compute verdict
  data.verdict = computeVerict(data);

  return data;
}

/**
 * Compare switching costs
 */
function compareSwitchingCost(costA: SwitchingCost, costB: SwitchingCost): "lower" | "higher" | "equal" {
  const costRank: Record<string, number> = { "drop-in": 1, moderate: 2, significant: 3, architectural: 4 };
  const rankA = costRank[costA];
  const rankB = costRank[costB];
  
  if (rankA < rankB) return "lower";
  if (rankA > rankB) return "higher";
  return "equal";
}

/**
 * Compute data-driven verdict
 */
function computeVerict(data: ComparisonData): { winner: "A" | "B"; advantage: string; reasoning: string } {
  const { toolA, toolB, priceGap, freeTierAdvantage, switchingCostWinner } = data;

  // Strong signals
  if (priceGap && priceGap.ratio >= 2) {
    const winner = priceGap.cheaper === "A" ? "A" : "B";
    const templates = verdictTemplatesByAdvantage.price;
    const hash = deterministicHash(`${toolA.id}-${toolB.id}-price`);
    return {
      winner,
      advantage: "price",
      reasoning: templates[hash % templates.length].replace("{winner}", winner === "A" ? toolA.name : toolB.name),
    };
  }

  if (freeTierAdvantage) {
    const winner = freeTierAdvantage === "A" ? "A" : "B";
    const templates = verdictTemplatesByAdvantage.free_tier;
    const hash = deterministicHash(`${toolA.id}-${toolB.id}-free`);
    return {
      winner,
      advantage: "free_tier",
      reasoning: templates[hash % templates.length].replace(
        "{winner}",
        winner === "A" ? toolA.name : toolB.name
      ),
    };
  }

  if (switchingCostWinner) {
    const winner = switchingCostWinner === "A" ? "A" : "B";
    const templates = verdictTemplatesByAdvantage.switching;
    const hash = deterministicHash(`${toolA.id}-${toolB.id}-switching`);
    return {
      winner,
      advantage: "switching",
      reasoning: templates[hash % templates.length].replace(
        "{easierTool}",
        winner === "A" ? toolA.name : toolB.name
      ).replace(
        "{harderTool}",
        winner === "A" ? toolB.name : toolA.name
      ).replace(
        "{easierCost}",
        winner === "A" ? toolA.portability.switchingCost : toolB.portability.switchingCost
      ).replace(
        "{harderCost}",
        winner === "A" ? toolB.portability.switchingCost : toolA.portability.switchingCost
      ),
    };
  }

  // Balanced verdict
  const templates = verdictTemplatesByAdvantage.balanced;
  const hash = deterministicHash(`${toolA.id}-${toolB.id}-balanced`);
  const winner: "A" | "B" = hash % 2 === 0 ? "A" : "B";
  
  return {
    winner,
    advantage: "balanced",
    reasoning: templates[hash % templates.length]
      .replace("{winner}", winner === "A" ? toolA.name : toolB.name)
      .replace("{loser}", winner === "B" ? toolA.name : toolB.name)
      .replace("{coreAdvantage}", winner === "A" ? toolA.description.toLowerCase().split(" ")[0] : toolB.description.toLowerCase().split(" ")[0])
      .replace("{loserAdvantage}", winner === "B" ? toolA.description.toLowerCase().split(" ")[0] : toolB.description.toLowerCase().split(" ")[0]),
  };
}

/**
 * Get humanized comparison text for various data points
 */
export function humanizeComparison(data: ComparisonData): { paragraphs: string[]; verdict: string } {
  const paragraphs: string[] = [];
  const { toolA, toolB, priceGap, freeTierAdvantage, pricingModelDiffer, verdict } = data;

  // Price gap narrative
  if (priceGap && priceGap.ratio > 1.2) {
    const hash = deterministicHash(`${toolA.id}-${toolB.id}-price`);
    const template = priceGapTemplates[hash % priceGapTemplates.length];
    paragraphs.push(
      template.replace(
        "{priceDifference}",
        priceGap.ratio.toFixed(1)
      ).replace(
        "{toolA}",
        priceGap.cheaper === "A" ? toolB.name : toolA.name
      ).replace(
        "{toolB}",
        priceGap.cheaper === "A" ? toolA.name : toolB.name
      )
    );
  }

  // Free tier narrative
  if (freeTierAdvantage) {
    const hash = deterministicHash(`${toolA.id}-${toolB.id}-free`);
    const template = freeTierTemplates[hash % freeTierTemplates.length];
    paragraphs.push(
      template.replace(
        "{hasFreeTool}",
        freeTierAdvantage === "A" ? toolA.name : toolB.name
      ).replace(
        "{noFreeTool}",
        freeTierAdvantage === "A" ? toolB.name : toolA.name
      )
    );
  }

  // Pricing model narrative
  if (pricingModelDiffer) {
    const modelA = getPrimaryPricingModel(toolA)!;
    const modelB = getPrimaryPricingModel(toolB)!;
    const hash = deterministicHash(`${toolA.id}-${toolB.id}-model`);
    const template = pricingModelTemplates[hash % pricingModelTemplates.length];
    
    const modelLabels: Record<PricingModel, string> = {
      free: "free",
      flat_rate: "flat-rate",
      per_seat: "per-seat",
      usage_based: "usage-based",
      tiered: "tiered",
      hybrid: "hybrid",
      custom: "custom",
    };

    paragraphs.push(
      template
        .replace("{modelAModel}", modelLabels[modelA])
        .replace("{modelBModel}", modelLabels[modelB])
        .replace("{modelATool}", toolA.name)
        .replace("{modelBTool}", toolB.name)
    );
  }

  // Verdict
  if (verdict) {
    paragraphs.push(verdict.reasoning);
  }

  return {
    paragraphs,
    verdict: verdict?.reasoning || "Both tools offer compelling features — choose based on your specific needs and budget constraints.",
  };
}

/**
 * Generate URL-friendly comparison slug
 */
export function generateComparisonSlug(toolIdA: string, toolIdB: string): string {
  const sorted = [toolIdA, toolIdB].sort();
  return `${sorted[0]}-vs-${sorted[1]}`;
}

/**
 * Parse comparison slug back to tool IDs
 */
export function parseComparisonSlug(slug: string): { toolA: string; toolB: string } | null {
  const match = slug.match(/^([a-z0-9-]+)-vs-([a-z0-9-]+)$/);
  if (!match) return null;
  return { toolA: match[1], toolB: match[2] };
}
