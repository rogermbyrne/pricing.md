import { spawn } from "child_process";
import assert from "assert/strict";
import path from "path";

const serverPath = path.join(__dirname, "..", "dist", "src", "index.js");

async function sendRequest(proc: ReturnType<typeof spawn>, request: object): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Timeout")), 5000);

    const onData = (data: Buffer) => {
      const lines = data.toString().split("\n").filter(Boolean);
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          if (parsed.id !== undefined) {
            clearTimeout(timer);
            proc.stdout!.removeListener("data", onData);
            resolve(parsed);
            return;
          }
        } catch {}
      }
    };

    proc.stdout!.on("data", onData);
    proc.stdin!.write(JSON.stringify(request) + "\n");
  });
}

function parseToolResult(response: any): any {
  return JSON.parse(response.result?.content?.[0]?.text || "{}");
}

async function main() {
  const proc = spawn("node", [serverPath], {
    stdio: ["pipe", "pipe", "pipe"],
  });

  proc.stderr!.on("data", (d) => console.error("[server]", d.toString().trim()));

  // Initialize
  console.log("\n=== Test 1: Initialize ===");
  const initResult = await sendRequest(proc, {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2025-03-26",
      capabilities: {},
      clientInfo: { name: "test", version: "1.0" },
    },
  });
  console.log("Server name:", initResult.result?.serverInfo?.name);
  console.log("Tools available:", initResult.result ? "yes" : "no");
  assert.equal(initResult.result?.serverInfo?.name, "pricing.md");

  // Send initialized notification
  proc.stdin!.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");

  // List tools
  console.log("\n=== Test 2: List Tools ===");
  const toolsResult = await sendRequest(proc, {
    jsonrpc: "2.0",
    id: 2,
    method: "tools/list",
    params: {},
  });
  const toolNames = toolsResult.result?.tools?.map((t: { name: string }) => t.name) || [];
  console.log("Tools:", toolNames.join(", "));
  assert.deepEqual(toolNames, ["search_tools", "get_pricing", "compare_tools", "estimate_cost", "find_cheapest"]);

  // Search tools - email category
  console.log("\n=== Test 3: Search (email category) ===");
  const searchResult = await sendRequest(proc, {
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: {
      name: "search_tools",
      arguments: { category: "email" },
    },
  });
  const searchData = parseToolResult(searchResult);
  console.log(`  Found ${searchData.total} tools`);
  for (const tool of searchData.tools || []) {
    console.log(`  ${tool.name}: free tier ${tool.freeTier ? "yes" : "no"}, lowest paid $${tool.lowestPaidPrice}/mo`);
  }
  assert.ok(searchData.total >= 4, `Expected at least 4 email tools, got ${searchData.total}`);

  // Get pricing - resend
  console.log("\n=== Test 4: Get Pricing (resend) ===");
  const getResult = await sendRequest(proc, {
    jsonrpc: "2.0",
    id: 4,
    method: "tools/call",
    params: {
      name: "get_pricing",
      arguments: { toolId: "resend" },
    },
  });
  const pricingData = parseToolResult(getResult);
  console.log(`  ${pricingData.name}: ${pricingData.tiers?.length} tiers`);
  for (const tier of pricingData.tiers || []) {
    console.log(`    ${tier.name}: $${tier.basePrice ?? "custom"}/mo`);
  }
  assert.equal(pricingData.name, "Resend");
  assert.equal(pricingData.tiers?.length, 4);

  // Compare tools (no usage)
  console.log("\n=== Test 5: Compare (resend vs postmark) ===");
  const compareResult = await sendRequest(proc, {
    jsonrpc: "2.0",
    id: 5,
    method: "tools/call",
    params: {
      name: "compare_tools",
      arguments: { toolIds: ["resend", "postmark"] },
    },
  });
  const compareData = parseToolResult(compareResult);
  console.log(`  Comparing ${compareData.tools?.length} tools`);
  console.log(`  Free tier summary: ${compareData.freeTierSummary}`);
  assert.equal(compareData.tools?.length, 2);

  // Compare tools with usage — "which is cheaper at 75K emails?"
  console.log("\n=== Test 5b: Compare with Usage (resend vs postmark, 75K emails) ===");
  const compareUsageResult = await sendRequest(proc, {
    jsonrpc: "2.0",
    id: 50,
    method: "tools/call",
    params: {
      name: "compare_tools",
      arguments: { toolIds: ["resend", "postmark"], usage: { emails: 75000 } },
    },
  });
  const compareUsageData = parseToolResult(compareUsageResult);
  for (const t of compareUsageData.tools || []) {
    if (t.costEstimate) {
      console.log(`  ${t.name}: ${t.costEstimate.cheapestTier} at ${t.currency} ${t.costEstimate.totalMonthly.toFixed(2)}/mo`);
    }
  }
  const postmarkUsage = compareUsageData.tools?.find((tool: { id: string }) => tool.id === "postmark");
  assert.equal(postmarkUsage?.costEstimate?.cheapestTierSlug, "platform");
  assert.equal(postmarkUsage?.costEstimate?.exceedsLimits, false);

  // tierFilter should also constrain the estimated tier
  console.log("\n=== Test 5d: Compare with Tier Filter (resend free only) ===");
  const compareFilteredResult = await sendRequest(proc, {
    jsonrpc: "2.0",
    id: 52,
    method: "tools/call",
    params: {
      name: "compare_tools",
      arguments: { toolIds: ["resend", "postmark"], tierFilter: "free", usage: { emails: 75000 } },
    },
  });
  const compareFilteredData = parseToolResult(compareFilteredResult);
  const filteredResend = compareFilteredData.tools?.find((tool: { id: string }) => tool.id === "resend");
  console.log(`  Visible tiers: ${filteredResend?.tiers?.map((tier: { slug: string }) => tier.slug).join(", ")}`);
  console.log(`  Estimated tier: ${filteredResend?.costEstimate?.cheapestTierSlug}`);
  assert.deepEqual(filteredResend?.tiers?.map((tier: { slug: string }) => tier.slug), ["free"]);
  assert.equal(filteredResend?.costEstimate?.cheapestTierSlug, "free");
  assert.equal(filteredResend?.costEstimate?.exceedsLimits, true);

  // Compare tools with mixed currencies — should warn
  console.log("\n=== Test 5c: Compare Mixed Currencies (sanity vs contentful) ===");
  const compareMixedResult = await sendRequest(proc, {
    jsonrpc: "2.0",
    id: 51,
    method: "tools/call",
    params: {
      name: "compare_tools",
      arguments: { toolIds: ["sanity", "contentful"] },
    },
  });
  const compareMixedData = parseToolResult(compareMixedResult);
  console.log(`  Currency warning: ${compareMixedData.currencyWarning ?? "none"}`);
  for (const t of compareMixedData.tools || []) {
    if (!t.error) console.log(`  ${t.name}: ${t.currency}`);
  }
  assert.ok(compareMixedData.currencyWarning);

  // Estimate cost
  console.log("\n=== Test 6: Estimate Cost (resend, 75000 emails) ===");
  const estimateResult = await sendRequest(proc, {
    jsonrpc: "2.0",
    id: 6,
    method: "tools/call",
    params: {
      name: "estimate_cost",
      arguments: { toolId: "resend", usage: { emails: 75000 } },
    },
  });
  const estimateData = parseToolResult(estimateResult);
  console.log(`  Cheapest tier: ${estimateData.cheapestTier}`);
  for (const est of estimateData.estimates || []) {
    console.log(`    ${est.tierName}: $${est.totalMonthly.toFixed(2)}/mo${est.isCheapest ? " (cheapest)" : ""}`);
  }
  assert.equal(estimateData.cheapestTier, "pro");
  assert.equal(
    estimateData.estimates.find((est: { tierSlug: string }) => est.tierSlug === "free")?.exceedsLimits,
    true
  );

  // Estimate cost with seats
  console.log("\n=== Test 7: Estimate Cost with Seats (vercel, 10 seats) ===");
  const seatResult = await sendRequest(proc, {
    jsonrpc: "2.0",
    id: 7,
    method: "tools/call",
    params: {
      name: "estimate_cost",
      arguments: { toolId: "vercel", usage: {}, seats: 10 },
    },
  });
  const seatData = parseToolResult(seatResult);
  for (const est of seatData.estimates || []) {
    console.log(`    ${est.tierName}: $${est.totalMonthly.toFixed(2)}/mo (base $${est.basePrice}, seats $${est.seatCost})`);
  }
  assert.equal(
    seatData.estimates.find((est: { tierSlug: string }) => est.tierSlug === "hobby")?.exceedsLimits,
    true
  );
  assert.equal(seatData.cheapestTier, "pro");

  // Find cheapest in category
  console.log("\n=== Test 8: Find Cheapest (email, 75K emails) ===");
  const cheapestResult = await sendRequest(proc, {
    jsonrpc: "2.0",
    id: 8,
    method: "tools/call",
    params: {
      name: "find_cheapest",
      arguments: { category: "email", usage: { emails: 75000 } },
    },
  });
  const cheapestData = parseToolResult(cheapestResult);
  console.log(`  Category: ${cheapestData.category}`);
  for (const r of cheapestData.results || []) {
    console.log(`    ${r.toolName} (${r.tierName}): $${r.totalMonthly.toFixed(2)}/mo — portability: ${r.portability.switchingCost}`);
  }
  assert.ok(cheapestData.results?.length > 0, "Expected at least one result from find_cheapest");
  assert.equal(cheapestData.results?.[0]?.exceedsLimits, false);

  // Get pricing for nonexistent tool
  console.log("\n=== Test 9: Get Pricing (nonexistent) ===");
  const notFoundResult = await sendRequest(proc, {
    jsonrpc: "2.0",
    id: 9,
    method: "tools/call",
    params: {
      name: "get_pricing",
      arguments: { toolId: "nonexistent" },
    },
  });
  const isError = notFoundResult.result?.isError;
  const errorText = notFoundResult.result?.content?.[0]?.text || "";
  console.log(`  isError: ${isError}`);
  console.log(`  Error: ${errorText}`);
  assert.equal(isError, true);
  assert.match(errorText, /Tool not found/);

  proc.kill();
  console.log("\nAll tests passed!");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
