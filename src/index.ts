#!/usr/bin/env node
import path from "path";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Registry } from "./registry/registry.js";
import { createServer } from "./server.js";

// __dirname is dist/src/ when compiled, so go up two levels to project root
const DATA_DIR = path.join(__dirname, "..", "..", "data", "tools");

async function main() {
  const registry = new Registry(DATA_DIR);
  console.error(`PricingMD: loaded ${registry.size} tools across ${registry.categories().length} categories`);

  const server = createServer(registry);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
