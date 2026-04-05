import { Router, Request, Response } from "express";
import express from "express";
import Anthropic from "@anthropic-ai/sdk";
import { Registry } from "../../src/registry/registry.js";
import { SYSTEM_PROMPT, TOOLS, executeTool } from "../lib/stack-advisor.js";

// Simple in-memory rate limiter
const rateMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT) {
    return false;
  }

  entry.count++;
  return true;
}

export function createChatRouter(registry: Registry): Router {
  const router = Router();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  let anthropic: Anthropic | null = null;
  if (apiKey) {
    anthropic = new Anthropic({ apiKey, timeout: 30000 });
  }

  router.get("/stack", (req: Request, res: Response) => {
    res.render("chat", {
      title: "Stack Advisor",
      description:
        "Describe your app and get a recommended developer tool stack with real pricing at different user scales.",
      path: "/stack",
      hasApiKey: !!apiKey,
    });
  });

  router.post("/api/stack", express.json(), async (req: Request, res: Response) => {
    if (!anthropic) {
      res.status(503).json({
        error: "Stack Advisor requires an API key to be configured.",
      });
      return;
    }

    const ip = req.ip || req.socket.remoteAddress || "unknown";
    if (!checkRateLimit(ip)) {
      res.status(429).json({ error: "Rate limit exceeded. Try again later." });
      return;
    }

    const { message, history } = req.body;
    if (!message || typeof message !== "string") {
      res.status(400).json({ error: "Message is required." });
      return;
    }

    // Set SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    try {
      // Build messages from history
      const messages: Anthropic.MessageParam[] = [];

      if (Array.isArray(history)) {
        for (const h of history.slice(-10)) {
          if (h.role === "user" || h.role === "assistant") {
            messages.push({ role: h.role, content: h.content });
          }
        }
      }

      // Add the new message (avoid duplicate if already in history)
      const lastMsg = messages[messages.length - 1];
      if (!lastMsg || lastMsg.role !== "user" || lastMsg.content !== message) {
        messages.push({ role: "user", content: message });
      }

      // Tool use loop — limit rounds to avoid timeout
      let currentMessages = [...messages];
      const MAX_TOOL_ROUNDS = 8;
      let sentText = false;

      for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
        const response = await anthropic.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 4096,
          system: SYSTEM_PROMPT,
          tools: TOOLS,
          messages: currentMessages,
        });

        // Check if there are tool_use blocks
        const toolUseBlocks = response.content.filter(
          (block): block is Anthropic.ContentBlock & { type: "tool_use" } =>
            block.type === "tool_use"
        );

        if (toolUseBlocks.length === 0) {
          // No tool calls — extract text and send
          const textContent = response.content
            .filter(
              (block): block is Anthropic.ContentBlock & { type: "text" } =>
                block.type === "text"
            )
            .map((block) => block.text)
            .join("\n");

          res.write(`data: ${JSON.stringify({ type: "text", content: textContent })}\n\n`);
          sentText = true;
          break;
        }

        // Execute each tool call
        for (const toolBlock of toolUseBlocks) {
          res.write(
            `data: ${JSON.stringify({
              type: "tool_call",
              name: toolBlock.name,
              input: toolBlock.input,
            })}\n\n`
          );
        }

        // Append assistant response and tool results
        currentMessages.push({ role: "assistant", content: response.content });

        const toolResults: Anthropic.ToolResultBlockParam[] = toolUseBlocks.map(
          (toolBlock) => {
            const result = executeTool(
              registry,
              toolBlock.name as any,
              toolBlock.input as Record<string, any>
            );
            return {
              type: "tool_result" as const,
              tool_use_id: toolBlock.id,
              content: JSON.stringify(result),
            };
          }
        );

        currentMessages.push({ role: "user", content: toolResults });

        // If stop reason is end_turn, we're done
        if (response.stop_reason === "end_turn") {
          break;
        }
      }

      // If we exhausted tool rounds without a text response, force one
      if (!sentText) {
        const finalResponse = await anthropic.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 4096,
          system: SYSTEM_PROMPT + "\n\nIMPORTANT: You have already gathered all the data you need. Do NOT call any more tools. Summarize your findings now.",
          messages: currentMessages,
        });

        const textContent = finalResponse.content
          .filter(
            (block): block is Anthropic.ContentBlock & { type: "text" } =>
              block.type === "text"
          )
          .map((block) => block.text)
          .join("\n");

        res.write(`data: ${JSON.stringify({ type: "text", content: textContent || "I gathered pricing data but couldn't generate a summary. Please try again." })}\n\n`);
      }
    } catch (err: any) {
      console.error("Chat API error:", err.message);
      res.write(
        `data: ${JSON.stringify({ type: "error", message: "Something went wrong." })}\n\n`
      );
    }

    res.write("data: [DONE]\n\n");
    res.end();
  });

  return router;
}
