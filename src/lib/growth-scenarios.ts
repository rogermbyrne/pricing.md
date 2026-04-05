import type { Registry } from "../registry/registry.js";
import type { Category } from "../schema/pricing.js";

export interface GrowthScenario {
  label: string;
  usage: Record<string, number>;
  seats?: number;
}

// Standard "you've outgrown the free tier" scenarios per category.
// Metric names include all known aliases across tools in that category
// so estimateCost() matches at least one per tool. Unrecognized keys are silently ignored.
export const GROWTH_SCENARIOS: Partial<Record<Category, GrowthScenario>> = {
  auth: {
    label: "100K MAU",
    usage: {
      MAUs: 100_000,
      MAU: 100_000,
      "Monthly Active Users (MRU)": 100_000,
      "additional-mau": 100_000,
      aDAU: 3_300,
      tokens: 500_000,
    },
  },
  database: {
    label: "50GB + 500GB BW",
    usage: {
      storage: 50,
      "Database Storage Overage": 50,
      compute: 730,
      bandwidth: 500,
      "Bandwidth Overage": 500,
      egress: 500,
      "cluster-node": 3,
      "rows-read": 10_000_000,
      "rows-written": 1_000_000,
      "request-units": 100_000_000,
      commands: 10_000_000,
    },
  },
  email: {
    label: "100K emails/mo",
    usage: {
      emails: 100_000,
      "outbound-emails": 100_000,
      contacts: 10_000,
      profiles: 10_000,
    },
  },
  monitoring: {
    label: "50GB ingest",
    usage: {
      "data-ingest": 50,
      ingestion: 50,
      "log-ingestion": 50,
      "data-loading": 50,
      hosts: 10,
      sessions: 100_000,
      errors: 1_000_000,
      spans: 10_000_000,
      monitors: 50,
      logs: 50,
      metrics: 50_000,
    },
  },
  hosting: {
    label: "5 services",
    usage: {
      "network-egress": 100,
      services: 5,
      "build-minutes": 3_000,
      resources: 5,
      "volume-storage": 20,
      ram: 8,
      cpu: 4,
    },
    seats: 5,
  },
  analytics: {
    label: "1M events",
    usage: {
      events: 1_000_000,
      "Product Analytics Events": 1_000_000,
      sessions: 100_000,
      MTUs: 10_000,
    },
  },
  storage: {
    label: "1TB stored",
    usage: {
      storage: 1_000,
      "Storage": 1_000,
      "Standard Storage": 1_000,
      bandwidth: 5_000,
      "Bandwidth": 5_000,
    },
  },
  search: {
    label: "1M searches/mo",
    usage: {
      "search-requests": 1_000_000,
      records: 1_000_000,
    },
  },
  "ci-cd": {
    label: "10K minutes",
    usage: {
      "build-minutes": 10_000,
      credits: 100_000,
      "workflow-minutes": 10_000,
    },
    seats: 5,
  },
  payments: {
    label: "10K transactions",
    usage: {
      transactions: 10_000,
    },
  },
  "feature-flags": {
    label: "1M requests",
    usage: {
      "flag-checks": 1_000_000,
      events: 1_000_000,
      MTUs: 10_000,
    },
    seats: 5,
  },
  queues: {
    label: "1M executions",
    usage: {
      executions: 1_000_000,
      tasks: 1_000_000,
    },
  },
  notifications: {
    label: "100K notifications",
    usage: {
      notifications: 100_000,
      events: 100_000,
    },
  },
};

export interface GrowthCostResult {
  cost: number | null;
  tierName: string | null;
  exceedsLimits: boolean;
}

export function computeGrowthCost(
  registry: Registry,
  toolId: string,
  scenario: GrowthScenario
): GrowthCostResult {
  const estimates = registry.estimateCost({
    toolId,
    usage: scenario.usage,
    seats: scenario.seats,
  });

  if (estimates.length === 0) {
    return { cost: null, tierName: null, exceedsLimits: false };
  }

  const viable = estimates.filter((e) => !e.exceedsLimits);
  const pool = viable.length > 0 ? viable : estimates;

  // "Cost at Scale" should reflect real pricing, not free-tier illusions.
  // A tool is "genuinely free" only if ALL its non-custom tiers are free with
  // no usage-based charges. Otherwise, prefer the estimate with the highest
  // total — free tiers that silently exceed limits show $0 but aren't viable.
  const tool = registry.get(toolId);
  const genuinelyFree =
    !!tool &&
    tool.tiers
      .filter((t) => t.pricingModel !== "custom")
      .every(
        (t) =>
          (t.pricingModel === "free" || t.basePrice === 0) &&
          t.usageMetrics.every((m) => m.pricePerUnit === 0)
      );

  let finalPool: typeof pool;
  if (genuinelyFree) {
    finalPool = pool;
  } else {
    // Pick tiers that actually cost something — these reflect real scale pricing
    const nonZero = pool.filter((e) => e.totalMonthly > 0);
    finalPool = nonZero.length > 0 ? nonZero : pool;
  }

  const best = finalPool.reduce((min, e) =>
    e.totalMonthly < min.totalMonthly ? e : min
  );

  return {
    cost: Math.round(best.totalMonthly),
    tierName: best.tierName,
    exceedsLimits: best.exceedsLimits,
  };
}
