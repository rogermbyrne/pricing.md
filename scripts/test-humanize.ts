import { compareTools, humanizeComparison, generateComparisonSlug } from "../web/lib/humanize.js";
import fs from "fs";
import path from "path";

// Load sample tools
const vercelData = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data/tools/vercel.json"), "utf-8"));
const railwayData = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data/tools/railway.json"), "utf-8"));

console.log("=== Testing Humanization Engine ===\n");

// Test comparison
console.log("Comparing Vercel vs Railway...\n");
const comparisonData = compareTools(vercelData, railwayData);

console.log("Comparison Results:");
console.log("- Should Noindex:", comparisonData.shouldNoindex);
console.log("- Price Gap:", JSON.stringify(comparisonData.priceGap, null, 2));
console.log("- Free Tier Advantage:", comparisonData.freeTierAdvantage);
console.log("- Pricing Models Differ:", comparisonData.pricingModelDiffer);
console.log("- Switching Cost Winner:", comparisonData.switchingCostWinner);
console.log("- Verdict:", JSON.stringify(comparisonData.verdict, null, 2));

console.log("\n=== Humanized Text ===\n");
const humanized = humanizeComparison(comparisonData);
console.log("Generated Paragraphs:");
humanized.paragraphs.forEach((para, i) => {
  console.log(`\n${i + 1}. ${para}`);
});
console.log("\nVerdict:", humanized.verdict);

console.log("\n=== URL Slug Generation ===\n");
const slug = generateComparisonSlug("vercel", "railway");
console.log("Generated slug:", slug);
