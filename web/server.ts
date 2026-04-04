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

// Resolve project root — works whether running via tsx (source) or node (compiled dist/)
const projectRoot = __dirname.includes("dist")
  ? path.join(__dirname, "..", "..")
  : path.join(__dirname, "..");

const dataDir = path.join(projectRoot, "data", "tools");
const dbPath = path.join(projectRoot, "data", "changelog.db");
const viewsDir = path.join(projectRoot, "web", "views");
const lpDir = path.join(projectRoot, "web", "lp");
const publicDir = path.join(projectRoot, "web", "public");

// Initialize registry and changelog DB
const registry = new Registry(dataDir);
console.log(`Registry loaded: ${registry.size} tools`);

const changelogDB = new ChangelogDB(dbPath);
console.log("Changelog DB initialized");

const app = express();

// View engine
app.set("view engine", "ejs");
app.set("views", viewsDir);

// Static files
app.use("/public", express.static(publicDir));

// Landing page at root
app.use(express.static(lpDir));

// Mount routes
app.use(createBrowseRouter(registry));
app.use(createToolRouter(registry, changelogDB));
app.use(createCompareRouter(registry));
app.use(createChangelogRouter(registry, changelogDB));
app.use(createApiRouter(registry, changelogDB));

app.listen(PORT, () => {
  console.log(`Pricing.md web server running at http://localhost:${PORT}`);
});
