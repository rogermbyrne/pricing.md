import { z } from "zod";

export const CategoryEnum = z.enum([
  "hosting",
  "database",
  "auth",
  "email",
  "payments",
  "monitoring",
  "ai-api",
  "ai-coding",
  "storage",
  "ci-cd",
  "search",
  "analytics",
  "feature-flags",
  "cms",
  "docs",
  "queues",
  "edge",
  "testing",
  "scheduling",
  "notifications",
  "internal-tools",
  "secrets",
]);
export type Category = z.infer<typeof CategoryEnum>;

export const PricingModelEnum = z.enum([
  "free",
  "flat_rate",
  "per_seat",
  "usage_based",
  "tiered",
  "hybrid",
  "custom",
]);
export type PricingModel = z.infer<typeof PricingModelEnum>;

export const SwitchingCostEnum = z.enum([
  "drop-in",
  "moderate",
  "significant",
  "architectural",
]);
export type SwitchingCost = z.infer<typeof SwitchingCostEnum>;

export const FreshnessCategoryEnum = z.enum(["stable", "volatile"]);
export type FreshnessCategory = z.infer<typeof FreshnessCategoryEnum>;

export const SlugSchema = z.string().regex(/^[a-z0-9][a-z0-9-]*$/, "Must be a lowercase slug (letters, numbers, hyphens)");

export const UsageMetricSchema = z.object({
  name: z.string(),
  unit: z.string().describe("Unit label, e.g. 'GB', 'emails', 'CU-hours', 'requests'"),
  pricePerUnit: z.number(),
  unitQuantity: z.number().positive().describe("Denominator, e.g. 1000000 for 'per 1M tokens'"),
  includedQuantity: z.number().default(0),
  tieredPricing: z
    .array(
      z.object({
        upTo: z.number().nullable().describe("null means unlimited"),
        pricePerUnit: z.number(),
      })
    )
    .optional(),
});
export type UsageMetric = z.infer<typeof UsageMetricSchema>;

export const FeatureSchema = z.object({
  name: z.string(),
  included: z.boolean(),
});
export type Feature = z.infer<typeof FeatureSchema>;

export const PricingTierSchema = z.object({
  name: z.string(),
  slug: SlugSchema,
  pricingModel: PricingModelEnum,
  basePrice: z.number().nullable().describe("Monthly base. 0 for free, null for contact-us"),
  billingPeriod: z.enum(["monthly", "annual"]).nullable().default(null),
  annualDiscount: z.number().nullable().default(null).describe("Percentage discount for annual billing"),
  seatPrice: z.number().nullable().default(null).describe("Per-seat cost for per_seat/hybrid models"),
  usageMetrics: z.array(UsageMetricSchema).default([]),
  features: z.array(FeatureSchema).default([]),
  limits: z.record(z.string(), z.number()).default({}),
});
export type PricingTier = z.infer<typeof PricingTierSchema>;

export const PortabilityInfoSchema = z.object({
  switchingCost: SwitchingCostEnum,
  openStandard: z.string().nullable().describe("e.g. 'SMTP', 'S3-compatible', 'PostgreSQL wire protocol', null if proprietary"),
  whatYouLose: z.string().describe("What's not portable when switching away"),
});
export type PortabilityInfo = z.infer<typeof PortabilityInfoSchema>;

export const ToolEntrySchema = z.object({
  id: SlugSchema,
  name: z.string(),
  description: z.string(),
  url: z.string().url().startsWith("https://"),
  pricingUrl: z.string().url().startsWith("https://"),
  category: CategoryEnum,
  tags: z.array(z.string()).default([]),
  tiers: z.array(PricingTierSchema).min(1),
  lastVerified: z.string().date().describe("ISO date YYYY-MM-DD"),
  freshnessCategory: FreshnessCategoryEnum,
  currency: z.string().default("USD"),
  portability: PortabilityInfoSchema,
  twitterHandle: z.string().regex(/^[A-Za-z0-9_]{1,15}$/, "Twitter handle: 1-15 alphanumeric/underscore chars").optional().describe("Twitter/X handle without @, e.g. 'supabase'"),
  githubOrg: z.string().regex(/^[A-Za-z0-9_.-]{1,39}$/, "GitHub org: 1-39 alphanumeric/dot/hyphen/underscore chars").optional().describe("GitHub org or user, e.g. 'supabase'"),
});
export type ToolEntry = z.infer<typeof ToolEntrySchema>;
