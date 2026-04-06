import express from "express";
import path from "path";
import { Registry } from "../src/registry/registry.js";
import { ChangelogDB } from "./changelog-db.js";
import { VoteDB } from "./vote-db.js";
import { createBrowseRouter } from "./routes/browse.js";
import { createToolRouter } from "./routes/tool.js";
import { createCompareRouter } from "./routes/compare.js";
import { createChangelogRouter } from "./routes/changelog.js";
import { createApiRouter } from "./routes/api.js";
import { createSeoRouter } from "./routes/seo.js";
import { createChatRouter } from "./routes/chat.js";
import { createTransparencyRouter } from "./routes/transparency.js";

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
const voteDBPath = path.join(projectRoot, "data", "votes.db");
const voteDB = new VoteDB(voteDBPath);
console.log("Changelog DB initialized");
console.log("Vote DB initialized");

const app = express();

// Disable X-Powered-By header
app.disable("x-powered-by");

// Trust first proxy (Railway, Cloudflare, etc.) for correct req.ip
app.set("trust proxy", 1);

// Security and caching headers
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  res.set("X-Content-Type-Options", "nosniff");
  res.set("X-Frame-Options", "SAMEORIGIN");
  res.set("Referrer-Policy", "strict-origin-when-cross-origin");
  // Cache HTML pages for 5 minutes, API for 1 minute
  if (req.path.startsWith("/api/")) {
    res.set("Cache-Control", "public, max-age=60, s-maxage=60");
  } else if (req.path.endsWith(".svg")) {
    res.set("Cache-Control", "public, max-age=86400");
  } else {
    res.set("Cache-Control", "public, max-age=300, s-maxage=300");
  }
  next();
});

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
app.use(createToolRouter(registry, changelogDB, voteDB));
app.use(createCompareRouter(registry));
app.use(createChangelogRouter(registry, changelogDB));
app.use(express.json());
app.use(createApiRouter(registry, changelogDB, voteDB));
app.use(createChatRouter(registry));
app.use(createTransparencyRouter(registry));

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
