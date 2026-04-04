import fs from "fs";
import path from "path";
import { ToolEntrySchema } from "../src/schema/pricing";

const TOOLS_DIR = path.join(__dirname, "..", "data", "tools");

function main() {
  const files = fs.readdirSync(TOOLS_DIR).filter((f) => f.endsWith(".json"));

  if (files.length === 0) {
    console.log("No JSON files found in data/tools/");
    process.exit(1);
  }

  console.log(`Validating ${files.length} tool files...\n`);

  let passed = 0;
  let failed = 0;

  for (const file of files) {
    const filePath = path.join(TOOLS_DIR, file);
    const raw = fs.readFileSync(filePath, "utf-8");

    try {
      const data = JSON.parse(raw);
      const result = ToolEntrySchema.safeParse(data);

      if (result.success) {
        console.log(`  PASS  ${file} (${result.data.tiers.length} tiers)`);
        passed++;
      } else {
        console.log(`  FAIL  ${file}`);
        for (const issue of result.error.issues) {
          console.log(`         ${issue.path.join(".")} — ${issue.message}`);
        }
        failed++;
      }
    } catch (e) {
      console.log(`  FAIL  ${file} — invalid JSON: ${(e as Error).message}`);
      failed++;
    }
  }

  console.log(`\n${passed} passed, ${failed} failed out of ${files.length}`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
