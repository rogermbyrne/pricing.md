import fs from "fs";
import path from "path";
import { ToolEntrySchema, type ToolEntry, type Category, type UsageMetric } from "../schema/pricing.js";

export interface SearchParams {
  query?: string;
  category?: Category;
  hasFreeOption?: boolean;
  maxBasePrice?: number;
  tags?: string[];
}

export interface EstimateCostParams {
  toolId: string;
  usage: Record<string, number>;
  seats?: number;
  tierSlug?: string;
}

export interface CostEstimate {
  toolId: string;
  toolName: string;
  tierName: string;
  tierSlug: string;
  currency: string;
  basePrice: number;
  seatCost: number;
  usageCosts: { metric: string; quantity: number; cost: number; unit: string }[];
  totalMonthly: number;
  exceedsLimits: boolean;
  limitWarnings: string[];
}

type LimitPeriod = "monthly" | "daily" | "unknown";

export class Registry {
  private tools: Map<string, ToolEntry> = new Map();
  private byCategory: Map<string, ToolEntry[]> = new Map();

  constructor(dataDir: string) {
    this.loadTools(dataDir);
  }

  private loadTools(dataDir: string): void {
    const files = fs.readdirSync(dataDir).filter((f) => f.endsWith(".json"));

    for (const file of files) {
      const raw = fs.readFileSync(path.join(dataDir, file), "utf-8");
      const data = JSON.parse(raw);
      const result = ToolEntrySchema.safeParse(data);

      if (!result.success) {
        console.warn(`Skipping ${file}: invalid schema (${result.error.issues.length} issues)`);
        continue;
      }

      const tool = result.data;
      this.tools.set(tool.id, tool);

      const catList = this.byCategory.get(tool.category) || [];
      catList.push(tool);
      this.byCategory.set(tool.category, catList);
    }
  }

  get size(): number {
    return this.tools.size;
  }

  get(id: string): ToolEntry | undefined {
    return this.tools.get(id);
  }

  search(params: SearchParams): ToolEntry[] {
    let results = Array.from(this.tools.values());

    if (params.category) {
      results = results.filter((t) => t.category === params.category);
    }

    if (params.hasFreeOption) {
      results = results.filter((t) =>
        t.tiers.some((tier) => tier.pricingModel === "free" || tier.basePrice === 0)
      );
    }

    if (params.maxBasePrice !== undefined) {
      results = results.filter((t) =>
        t.tiers.some((tier) => tier.basePrice !== null && tier.basePrice <= params.maxBasePrice!)
      );
    }

    if (params.tags && params.tags.length > 0) {
      const searchTags = params.tags.map((t) => t.toLowerCase());
      results = results.filter((t) =>
        searchTags.some((st) => t.tags.map((tag) => tag.toLowerCase()).includes(st))
      );
    }

    if (params.query) {
      const q = params.query.toLowerCase();
      results = results.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.toLowerCase().includes(q)) ||
          t.category.toLowerCase().includes(q)
      );
    }

    return results;
  }

  compare(toolIds: string[]): (ToolEntry | null)[] {
    return toolIds.map((id) => this.tools.get(id) || null);
  }

  estimateCost(params: EstimateCostParams): CostEstimate[] {
    const tool = this.tools.get(params.toolId);
    if (!tool) return [];

    const tiersToEstimate = params.tierSlug
      ? tool.tiers.filter((t) => t.slug === params.tierSlug)
      : tool.tiers.filter((t) => t.pricingModel !== "custom");

    return tiersToEstimate.map((tier) => {
      const basePrice = tier.basePrice ?? 0;
      const seats = params.seats ?? 1;
      const seatCost = tier.seatPrice !== null ? tier.seatPrice * seats : 0;
      const usageCosts: CostEstimate["usageCosts"] = [];
      const limitWarnings: string[] = [];

      this.checkSeatLimits(tier.limits, params.seats, limitWarnings);

      for (const metric of tier.usageMetrics) {
        const quantity = params.usage[metric.name];
        if (quantity === undefined) continue;

        // Check if usage exceeds included quantity on a free/capped tier
        if (quantity > metric.includedQuantity && metric.pricePerUnit === 0 && !metric.tieredPricing) {
          limitWarnings.push(
            `${metric.name}: usage (${quantity.toLocaleString()}) exceeds included ${metric.includedQuantity.toLocaleString()} ${metric.unit} with no overage pricing — this tier won't work`
          );
        }

        const cost = this.calculateMetricCost(metric, quantity);
        usageCosts.push({
          metric: metric.name,
          quantity,
          cost,
          unit: metric.unit,
        });
      }

      this.checkUsageLimits(tier.limits, params.usage, limitWarnings);

      const totalMonthly = basePrice + seatCost + usageCosts.reduce((sum, uc) => sum + uc.cost, 0);

      return {
        toolId: tool.id,
        toolName: tool.name,
        tierName: tier.name,
        tierSlug: tier.slug,
        currency: tool.currency,
        basePrice,
        seatCost,
        usageCosts,
        totalMonthly,
        exceedsLimits: limitWarnings.length > 0,
        limitWarnings,
      };
    });
  }

  private checkSeatLimits(
    limits: Record<string, number>,
    requestedSeats: number | undefined,
    limitWarnings: string[]
  ): void {
    if (requestedSeats === undefined) return;

    const seatLimitEntries = Object.entries(limits).filter(([key]) => this.isSeatLimitKey(key));
    for (const [key, limit] of seatLimitEntries) {
      if (requestedSeats > limit) {
        limitWarnings.push(
          `seats: requested ${requestedSeats} exceeds ${key} limit of ${limit} on this tier`
        );
      }
    }
  }

  private checkUsageLimits(
    limits: Record<string, number>,
    usage: Record<string, number>,
    limitWarnings: string[]
  ): void {
    for (const [limitKey, limitValue] of Object.entries(limits)) {
      const normalized = this.normalizeLimitKey(limitKey);
      if (!normalized) continue;

      const requestedQuantity = usage[normalized.metric];
      if (requestedQuantity === undefined) continue;

      if (normalized.period === "monthly" && requestedQuantity > limitValue) {
        limitWarnings.push(
          `${normalized.metric}: requested ${requestedQuantity.toLocaleString()} exceeds ${limitKey} limit of ${limitValue.toLocaleString()} on this tier`
        );
      }

      if (normalized.period === "daily") {
        const maxMonthlyQuantity = limitValue * 31;
        if (requestedQuantity > maxMonthlyQuantity) {
          limitWarnings.push(
            `${normalized.metric}: requested ${requestedQuantity.toLocaleString()} exceeds ${limitKey} limit of ${limitValue.toLocaleString()} per day on this tier`
          );
        }
      }
    }
  }

  private isSeatLimitKey(key: string): boolean {
    return ["seats", "seat", "teammates", "teammate", "members", "users"].some(
      (token) => key.toLowerCase().includes(token)
    );
  }

  private normalizeLimitKey(key: string): { metric: string; period: LimitPeriod } | null {
    const lowerKey = key.toLowerCase();
    if (this.isSeatLimitKey(lowerKey)) return null;

    const period: LimitPeriod = lowerKey.includes("permonth") || lowerKey.includes("monthly")
      ? "monthly"
      : lowerKey.includes("perday") || lowerKey.includes("daily")
        ? "daily"
        : "unknown";

    const metric = lowerKey
      .replace(/permonth|perday|monthly|daily/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    if (!metric) return null;

    return {
      metric: this.normalizeMetricAlias(metric),
      period,
    };
  }

  private normalizeMetricAlias(metric: string): string {
    const aliases: Record<string, string> = {
      email: "emails",
      emails: "emails",
      request: "requests",
      requests: "requests",
      seat: "seats",
      seats: "seats",
      teammate: "seats",
      teammates: "seats",
      member: "seats",
      members: "seats",
      user: "seats",
      users: "seats",
    };

    return aliases[metric] ?? metric;
  }

  private calculateMetricCost(metric: UsageMetric, quantity: number): number {
    const billableQuantity = Math.max(0, quantity - metric.includedQuantity);
    if (billableQuantity === 0) return 0;

    if (metric.tieredPricing && metric.tieredPricing.length > 0) {
      return this.calculateTieredCost(metric.tieredPricing, quantity, metric.includedQuantity, metric.unitQuantity);
    }

    return (billableQuantity / metric.unitQuantity) * metric.pricePerUnit;
  }

  private calculateTieredCost(
    tiers: NonNullable<UsageMetric["tieredPricing"]>,
    quantity: number,
    includedQuantity: number,
    unitQuantity: number
  ): number {
    let cost = 0;
    let remaining = Math.max(0, quantity - includedQuantity);

    let prevUpTo = includedQuantity;

    for (const tier of tiers) {
      if (remaining <= 0) break;
      if (tier.upTo !== null && tier.upTo <= includedQuantity) continue;

      const tierCeiling = tier.upTo !== null ? Math.max(0, tier.upTo - prevUpTo) : remaining;
      const quantityInTier = Math.min(remaining, tierCeiling);

      cost += (quantityInTier / unitQuantity) * tier.pricePerUnit;
      remaining -= quantityInTier;
      if (tier.upTo !== null) prevUpTo = tier.upTo;
    }

    return cost;
  }

  categories(): string[] {
    return Array.from(this.byCategory.keys()).sort();
  }

  allTools(): ToolEntry[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get all unique tool pairs within a category for VS comparisons
   * Returns sorted pairs to avoid duplicates (A-B, not B-A, A-B)
   */
  toolPairsInCategory(category: string): [ToolEntry, ToolEntry][] {
    const tools = this.byCategory.get(category);
    if (!tools || tools.length < 2) return [];

    const pairs: [ToolEntry, ToolEntry][] = [];
    const sortedTools = [...tools].sort((a, b) => a.id.localeCompare(b.id));

    for (let i = 0; i < sortedTools.length; i++) {
      for (let j = i + 1; j < sortedTools.length; j++) {
        pairs.push([sortedTools[i], sortedTools[j]]);
      }
    }

    return pairs;
  }

  /**
   * Get all unique tool pairs across all categories
   */
  allToolPairsByCategory(): Map<string, [ToolEntry, ToolEntry][]> {
    const allPairs = new Map<string, [ToolEntry, ToolEntry][]>();
    
    for (const category of this.categories()) {
      const pairs = this.toolPairsInCategory(category);
      if (pairs.length > 0) {
        allPairs.set(category, pairs);
      }
    }

    return allPairs;
  }
}
