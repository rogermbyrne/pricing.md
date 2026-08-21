import express, { Router, Request, Response } from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { Registry } from "../../src/registry/registry.js";
import { createServer } from "../../src/server.js";

// Streamable HTTP MCP endpoint at /mcp — same six tools as the stdio server,
// reachable by any agent without installing the npm package.
//
// Stateless mode: a fresh server + transport per request. The registry is
// read-only and held in memory, so there is no per-session state worth keeping,
// and stateless survives Railway restarts and multiple instances.
export function createMcpRouter(registry: Registry): Router {
  const router = Router();

  // Agents call this from browsers and from servers — allow both.
  router.use("/mcp", (req: Request, res: Response, next: express.NextFunction) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    res.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Accept, Authorization, Mcp-Session-Id, MCP-Protocol-Version, Last-Event-ID"
    );
    res.set("Access-Control-Expose-Headers", "Mcp-Session-Id, MCP-Protocol-Version");
    res.set("Cache-Control", "no-store");
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
    next();
  });

  router.use("/mcp", express.json({ limit: "1mb" }));

  router.post("/mcp", async (req: Request, res: Response) => {
    const server = createServer(registry);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    res.on("close", () => {
      void transport.close();
      void server.close();
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (err) {
      console.error("MCP request failed:", err instanceof Error ? err.message : err);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null,
        });
      }
    }
  });

  // Stateless mode has no server-initiated stream and nothing to delete.
  const methodNotAllowed = (req: Request, res: Response) => {
    res.status(405).json({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Method not allowed. POST JSON-RPC requests to /mcp." },
      id: null,
    });
  };

  router.get("/mcp", methodNotAllowed);
  router.delete("/mcp", methodNotAllowed);

  return router;
}
