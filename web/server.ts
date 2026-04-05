import express from "express";
import path from "path";
import { Registry } from "../src/registry/registry.js";
import { ChangelogDB } from "./changelog-db.js";
import { createBrowseRouter } from "./routes/browse.js";
import { createToolRouter } from "./routes/tool.js";
import { createCompareRouter } from "./routes/compare.js";
import { createChangelogRouter } from "./routes/changelog.js";
import { createApiRouter } from "./routes/api.js";
import { createSeoRouter } from "./routes/seo.js";

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

// Disable X-Powered-By header
app.disable("x-powered-by");

// View engine
app.set("view engine", "ejs");
app.set("views", viewsDir);

// Make registry stats available to all templates
app.locals.toolCount = registry.size;
app.locals.categoryCount = registry.categories().length;

// Static files
app.use("/public", express.static(publicDir));

// SEO routes (before static so dynamic llms.txt wins over static file)
app.use(createSeoRouter(registry));

// Landing page at root
app.use(express.static(lpDir));

// Mount routes
app.use(createBrowseRouter(registry));
app.use(createToolRouter(registry, changelogDB));
app.use(createCompareRouter(registry));
app.use(createChangelogRouter(registry, changelogDB));
app.use(createApiRouter(registry, changelogDB));

// 404 catch-all
app.use((req: express.Request, res: express.Response) => {
  res.status(404).render("error", {
    title: "Not Found",
    message: "The page you're looking for doesn't exist.",
  });
});

// Global error handler — never leak stack traces
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Unhandled error:", err.message);
  res.status(500).render("error", {
    title: "Server Error",
    message: "Something went wrong. Please try again.",
  });
});

app.listen(PORT, () => {
  console.log(`Pricing.md web server running at http://localhost:${PORT}`);
});
