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
import { createGuidesRouter } from "./routes/guides.js";
import { createMcpRouter } from "./routes/mcp.js";
import { createAgentRouter } from "./routes/agent.js";

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
  res.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  // carbonads/buysellads hosts are the Carbon ad unit (see partials/carbon-ad.ejs):
  // carbon.js loads from cdn.carbonads.com, JSONP-fetches ads from srv.carbonads.net,
  // and renders creatives served from cdn4.buysellads.net.
  res.set("Content-Security-Policy",
    "default-src 'self'; " +
    // TODO: Switch to build-time Tailwind to remove unsafe-eval
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://www.googletagmanager.com https://www.google-analytics.com https://cdn.jsdelivr.net https://cdn.carbonads.com https://srv.carbonads.net; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' data: https://latest.sh https://*.google-analytics.com https://www.googletagmanager.com https://cdn4.buysellads.net https://srv.carbonads.net https://srv.buysellads.com https://cdn.carbonads.com; " +
    "connect-src 'self' https://*.google-analytics.com https://analytics.google.com https://srv.carbonads.net https://cdn.carbonads.com; " +
    "frame-ancestors 'sameorigin'; " +
    "form-action 'self'; " +
    "base-uri 'self'"
  );
  // RFC 8288 discovery links — how an agent finds the MCP server, the API spec,
  // and the site index without guessing URLs.
  res.set("Link", [
    '</llms.txt>; rel="describedby"; type="text/plain"',
    '</.well-known/ai-catalog.json>; rel="ai-catalog"; type="application/json"',
    '</openapi.json>; rel="service-desc"; type="application/vnd.oai.openapi+json;version=3.1"',
    '</.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json"',
    '</developers>; rel="service-doc"; type="text/html"',
    '</mcp>; rel="mcp-server"',
  ].join(", "));

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

// MCP over Streamable HTTP — same tools as the stdio server, no install required
app.use(createMcpRouter(registry));

// SEO routes (before static so dynamic llms.txt wins over static file)
app.use(createSeoRouter(registry));

// Agent-facing discovery: well-known catalogs, OpenAPI, markdown views.
// Must precede the static landing page so "/" content negotiation wins over index.html.
app.use(createAgentRouter(registry, projectRoot));

// Landing page at root
app.use(express.static(lpDir));

// Mount routes
app.use(createBrowseRouter(registry));
app.use(createToolRouter(registry, changelogDB, voteDB));
app.use(createCompareRouter(registry));
app.use(createChangelogRouter(registry, changelogDB));

// CORS protection — reject cross-origin POST/PUT/DELETE requests to API endpoints
// Note: Non-browser clients (curl, scripts) typically don't send an Origin header,
// so they bypass this check. This is intended — the goal is to prevent browser-based
// CSRF-style attacks that drain API credits, not to lock down the API entirely.
app.use("/api", (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.method !== "GET" && req.method !== "HEAD" && req.method !== "OPTIONS") {
    const origin = req.headers.origin;
    const host = req.headers.host;
    if (origin && host) {
      try {
        const originUrl = new URL(origin);
        // Enforce same host AND same protocol (https)
        const expectedProtocol = req.headers["x-forwarded-proto"] || req.protocol;
        if (originUrl.host !== host || originUrl.protocol !== expectedProtocol + ":") {
          res.status(403).json({ error: "Cross-origin requests are not allowed" });
          return;
        }
      } catch {
        res.status(403).json({ error: "Invalid Origin header" });
        return;
      }
    }
  }
  next();
});

app.use(express.json());
app.use(createApiRouter(registry, changelogDB, voteDB));
app.use(createChatRouter(registry));
app.use(createTransparencyRouter(registry));
app.use(createGuidesRouter(registry));

// Return 410 Gone for Google's hallucinated /vs/ URLs
// These URLs don't exist - Google was auto-discovering them from content words
app.use("/vs", (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Only match /vs/* paths, not /vs (if that ever exists)
  if (req.path.startsWith("/")) {
    res.status(410).send("Gone");
  } else {
    next();
  }
});

// 404 catch-all — JSON for the API, markdown for agents, HTML for browsers
app.use((req: express.Request, res: express.Response) => {
  if (req.path.startsWith("/api/")) {
    res.status(404).json({ error: `No API endpoint at ${req.path}. See https://latest.sh/openapi.json for the full surface.` });
    return;
  }

  const wantsMarkdown =
    req.path.endsWith(".md") || req.accepts(["text/html", "text/markdown"]) === "text/markdown";

  if (wantsMarkdown) {
    res.status(404).set("Content-Type", "text/markdown; charset=utf-8").send(
      `# 404 — not found\n\n\`${req.path}\` does not exist on latest.sh.\n\n` +
        "Where to go instead:\n\n" +
        "- [/llms.txt](https://latest.sh/llms.txt) — site index\n" +
        "- [/AGENTS.md](https://latest.sh/AGENTS.md) — which interface to use\n" +
        "- [/openapi.json](https://latest.sh/openapi.json) — REST API spec\n" +
        "- `https://latest.sh/mcp` — MCP server (Streamable HTTP)\n" +
        "- [/tool/{id}/pricing.md](https://latest.sh/browse) — pricing for one tool\n"
    );
    return;
  }

  res.status(404).render("error", {
    title: "Not Found",
    message: "The page you're looking for doesn't exist.",
    description: "This page was not found.",
    path: req.originalUrl,
    metaRobots: "noindex, follow",
  });
});

// Global error handler — never leak stack traces
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Unhandled error:", err.message);
  res.status(500).render("error", {
    title: "Server Error",
    message: "Something went wrong. Please try again.",
    description: "A server error occurred.",
    path: req.originalUrl,
    metaRobots: "noindex, follow",
  });
});

app.listen(PORT, () => {
  console.log(`Pricing.md web server running at http://localhost:${PORT}`);
});
