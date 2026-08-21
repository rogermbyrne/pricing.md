import { Router, Request, Response } from "express";
import { Registry } from "../../src/registry/registry.js";
import { ChangelogDB } from "../changelog-db.js";
import { VoteDB } from "../vote-db.js";

const MAX_PAGE_SIZE = 500;

/**
 * Reads limit/offset off the query string. Both are optional: with no limit the
 * endpoint returns the whole collection, which is what every existing caller
 * expects. An invalid value is a client error rather than a silent default.
 */
function readPaging(req: Request): { limit: number | null; offset: number; error?: string } {
  const rawLimit = req.query.limit as string | undefined;
  const rawOffset = req.query.offset as string | undefined;

  let limit: number | null = null;
  if (rawLimit !== undefined) {
    limit = Number(rawLimit);
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_PAGE_SIZE) {
      return { limit: null, offset: 0, error: `limit must be an integer between 1 and ${MAX_PAGE_SIZE}` };
    }
  }

  let offset = 0;
  if (rawOffset !== undefined) {
    offset = Number(rawOffset);
    if (!Number.isInteger(offset) || offset < 0) {
      return { limit: null, offset: 0, error: "offset must be an integer >= 0" };
    }
  }

  return { limit, offset };
}

/**
 * Advertises the page boundaries in RFC 8288 Link headers so an agent can walk
 * the collection without reconstructing query strings itself.
 */
function setPagingHeaders(
  req: Request,
  res: Response,
  opts: { total: number; limit: number | null; offset: number; returned: number }
): void {
  res.set("X-Total-Count", String(opts.total));
  if (opts.limit === null) return;

  // Keep the caller on whichever prefix they used: /api/v1/... or /api/...
  const prefix = (res.locals.apiPrefix as string | undefined) ?? "/api";
  const base = prefix + `${req.baseUrl}${req.path}`.replace(/^\/api/, "");
  const params = new URLSearchParams(req.query as Record<string, string>);
  const link = (offset: number, rel: string) => {
    params.set("limit", String(opts.limit));
    params.set("offset", String(offset));
    return `<${base}?${params.toString()}>; rel="${rel}"`;
  };

  const links: string[] = [link(0, "first")];
  if (opts.offset > 0) {
    links.push(link(Math.max(0, opts.offset - opts.limit), "prev"));
  }
  if (opts.offset + opts.returned < opts.total) {
    links.push(link(opts.offset + opts.limit, "next"));
  }
  const lastOffset = Math.max(0, Math.floor((opts.total - 1) / opts.limit) * opts.limit);
  links.push(link(lastOffset, "last"));

  res.append("Link", links.join(", "));
}

export function createApiRouter(registry: Registry, changelogDB: ChangelogDB, voteDB: VoteDB): Router {
  const router = Router();

  router.get("/api/tools", (req: Request, res: Response) => {
    const category = req.query.category as string | undefined;
    const { limit, offset, error } = readPaging(req);
    if (error) {
      res.status(400).json({ error });
      return;
    }

    const tools = category ? registry.search({ category: category as any }) : registry.allTools();
    const page = limit === null ? tools.slice(offset) : tools.slice(offset, offset + limit);

    setPagingHeaders(req, res, { total: tools.length, limit, offset, returned: page.length });
    res.json(page);
  });

  router.get("/api/tools/:id", (req: Request, res: Response) => {
    const tool = registry.get(req.params.id as string);
    if (!tool) {
      res.status(404).json({ error: "Tool not found" });
      return;
    }
    res.json(tool);
  });

  router.get("/api/stats", (req: Request, res: Response) => {
    const categories = registry.categories();
    const allTools = registry.allTools();
    const lastVerified = allTools.reduce((latest, t) => {
      return t.lastVerified > latest ? t.lastVerified : latest;
    }, "");
    res.json({
      tools: allTools.length,
      categories: categories.length,
      lastVerified,
    });
  });

  router.get("/api/changelog", (req: Request, res: Response) => {
    const toolId = req.query.tool as string | undefined;
    const since = req.query.since as string | undefined;
    const { limit, offset, error } = readPaging(req);
    if (error) {
      res.status(400).json({ error });
      return;
    }

    let changes;
    if (toolId) {
      changes = changelogDB.getToolChanges(toolId);
    } else {
      changes = changelogDB.getRecentChanges(1000, 0);
    }

    if (since) {
      changes = changes.filter((c) => c.detected_at >= since);
    }

    const page = limit === null ? changes.slice(offset, offset + 100) : changes.slice(offset, offset + limit);
    setPagingHeaders(req, res, { total: changes.length, limit, offset, returned: page.length });
    res.json(page);
  });

  router.post("/api/vote/:id", (req: Request, res: Response) => {
    const tool = registry.get(req.params.id as string);
    if (!tool) {
      res.status(404).json({ error: "Tool not found" });
      return;
    }

    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const success = voteDB.vote(tool.id, ip);

    if (!success) {
      res.status(429).json({ error: "Already voted today", count: voteDB.getVoteCount(tool.id) });
      return;
    }

    res.json({ success: true, count: voteDB.getVoteCount(tool.id) });
  });

  router.get("/api/vote/:id", (req: Request, res: Response) => {
    const count = voteDB.getVoteCount(req.params.id as string);
    res.json({ count });
  });

  return router;
}
