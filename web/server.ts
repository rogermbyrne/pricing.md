import express from "express";
import path from "path";
import { Registry } from "../src/registry/registry.js";
import { ChangelogDB } from "./changelog-db.js";
import { createBrowseRouter } from "./routes/browse.js";
import { createToolRouter } from "./routes/tool.js";
import { createCompareRouter } from "./routes/compare.js";
import { createChangelogRouter } from "./routes/changelog.js";
import { createApiRouter } from "./routes/api.js";

const PORT = parseInt(process.env.PORT || "3001", 10);
const dataDir = path.join(__dirname, "..", "data", "tools");
const dbPath = path.join(__dirname, "..", "data", "changelog.db");

// Initialize registry and changelog DB
const registry = new Registry(dataDir);
console.log(`Registry loaded: ${registry.size} tools`);

const changelogDB = new ChangelogDB(dbPath);
console.log("Changelog DB initialized");

const app = express();

// View engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Static files
app.use("/public", express.static(path.join(__dirname, "public")));

// Landing page at root
app.use(express.static(path.join(__dirname, "lp")));

// Mount routes
app.use(createBrowseRouter(registry));
app.use(createToolRouter(registry, changelogDB));
app.use(createCompareRouter(registry));
app.use(createChangelogRouter(registry, changelogDB));
app.use(createApiRouter(registry, changelogDB));

app.listen(PORT, () => {
  console.log(`Pricing.md web server running at http://localhost:${PORT}`);
});
