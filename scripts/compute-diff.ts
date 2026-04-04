import type { ToolEntry } from "../src/schema/pricing.js";

export interface PricingChange {
  changeType: "price_change" | "tier_added" | "tier_removed" | "limit_change" | "metric_change";
  summary: string;
  details: Record<string, unknown>;
}

export function computeDiff(before: ToolEntry, after: ToolEntry): PricingChange[] {
  const changes: PricingChange[] = [];

  const beforeTiers = new Map(before.tiers.map((t) => [t.slug, t]));
  const afterTiers = new Map(after.tiers.map((t) => [t.slug, t]));

  // Check for removed tiers
  for (const [slug, tier] of beforeTiers) {
    if (!afterTiers.has(slug)) {
      changes.push({
        changeType: "tier_removed",
        summary: `${tier.name} tier removed`,
        details: { tierSlug: slug, tierName: tier.name },
      });
    }
  }

  // Check for added tiers
  for (const [slug, tier] of afterTiers) {
    if (!beforeTiers.has(slug)) {
      const priceStr = tier.basePrice === null
        ? "Contact Sales"
        : tier.basePrice === 0
          ? "Free"
          : `$${tier.basePrice}/mo`;
      changes.push({
        changeType: "tier_added",
        summary: `${tier.name} tier added at ${priceStr}`,
        details: { tierSlug: slug, tierName: tier.name, basePrice: tier.basePrice },
      });
    }
  }

  // Compare matching tiers
  for (const [slug, beforeTier] of beforeTiers) {
    const afterTier = afterTiers.get(slug);
    if (!afterTier) continue;

    // Base price change
    if (beforeTier.basePrice !== afterTier.basePrice) {
      const formatP = (p: number | null) =>
        p === null ? "Contact Sales" : p === 0 ? "Free" : `$${p}/mo`;
      changes.push({
        changeType: "price_change",
        summary: `${afterTier.name} tier: ${formatP(beforeTier.basePrice)} \u2192 ${formatP(afterTier.basePrice)}`,
        details: {
          tierSlug: slug,
          field: "basePrice",
          before: beforeTier.basePrice,
          after: afterTier.basePrice,
        },
      });
    }

    // Seat price change
    if (beforeTier.seatPrice !== afterTier.seatPrice) {
      changes.push({
        changeType: "price_change",
        summary: `${afterTier.name} seat price: $${beforeTier.seatPrice ?? 0}/mo \u2192 $${afterTier.seatPrice ?? 0}/mo`,
        details: {
          tierSlug: slug,
          field: "seatPrice",
          before: beforeTier.seatPrice,
          after: afterTier.seatPrice,
        },
      });
    }

    // Compare usage metrics
    const beforeMetrics = new Map(beforeTier.usageMetrics.map((m) => [m.name, m]));
    const afterMetrics = new Map(afterTier.usageMetrics.map((m) => [m.name, m]));

    for (const [name, bm] of beforeMetrics) {
      const am = afterMetrics.get(name);
      if (!am) {
        changes.push({
          changeType: "metric_change",
          summary: `${afterTier.name}: ${name} metric removed`,
          details: { tierSlug: slug, metric: name, type: "removed" },
        });
        continue;
      }

      if (bm.pricePerUnit !== am.pricePerUnit) {
        changes.push({
          changeType: "metric_change",
          summary: `${afterTier.name} ${name}: $${bm.pricePerUnit} \u2192 $${am.pricePerUnit} per ${am.unitQuantity > 1 ? am.unitQuantity.toLocaleString() + " " : ""}${am.unit}`,
          details: {
            tierSlug: slug,
            metric: name,
            field: "pricePerUnit",
            before: bm.pricePerUnit,
            after: am.pricePerUnit,
          },
        });
      }

      if (bm.includedQuantity !== am.includedQuantity) {
        changes.push({
          changeType: "metric_change",
          summary: `${afterTier.name} ${name}: included ${bm.includedQuantity.toLocaleString()} \u2192 ${am.includedQuantity.toLocaleString()} ${am.unit}`,
          details: {
            tierSlug: slug,
            metric: name,
            field: "includedQuantity",
            before: bm.includedQuantity,
            after: am.includedQuantity,
          },
        });
      }
    }

    for (const [name] of afterMetrics) {
      if (!beforeMetrics.has(name)) {
        changes.push({
          changeType: "metric_change",
          summary: `${afterTier.name}: ${name} metric added`,
          details: { tierSlug: slug, metric: name, type: "added" },
        });
      }
    }

    // Compare limits
    const allLimitKeys = new Set([
      ...Object.keys(beforeTier.limits),
      ...Object.keys(afterTier.limits),
    ]);

    for (const key of allLimitKeys) {
      const bv = beforeTier.limits[key];
      const av = afterTier.limits[key];

      if (bv !== av) {
        if (bv === undefined) {
          changes.push({
            changeType: "limit_change",
            summary: `${afterTier.name}: ${key} limit added (${av!.toLocaleString()})`,
            details: { tierSlug: slug, limit: key, before: null, after: av },
          });
        } else if (av === undefined) {
          changes.push({
            changeType: "limit_change",
            summary: `${afterTier.name}: ${key} limit removed (was ${bv.toLocaleString()})`,
            details: { tierSlug: slug, limit: key, before: bv, after: null },
          });
        } else {
          changes.push({
            changeType: "limit_change",
            summary: `${afterTier.name}: ${key} ${bv.toLocaleString()} \u2192 ${av.toLocaleString()}`,
            details: { tierSlug: slug, limit: key, before: bv, after: av },
          });
        }
      }
    }
  }

  return changes;
}
