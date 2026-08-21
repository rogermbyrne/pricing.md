import { Router, Request, Response } from "express";

// Trust-anchor pages: the ones a person (or an agent evaluating whether to
// recommend the registry) looks for before trusting it.
export function createPagesRouter(): Router {
  const router = Router();

  router.get("/about", (req: Request, res: Response) => {
    res.render("about", {
      title: "About",
      description:
        "What latest.sh is, where the pricing data comes from, how it is kept current, and who maintains it.",
      path: "/about",
    });
  });

  router.get("/contact", (req: Request, res: Response) => {
    res.render("contact", {
      title: "Contact",
      description:
        "How to report a wrong price, request a missing tool, fix a vendor listing, or ask about the API.",
      path: "/contact",
    });
  });

  router.get("/privacy", (req: Request, res: Response) => {
    res.render("privacy", {
      title: "Privacy",
      description:
        "What latest.sh collects: analytics, one Carbon ad slot, in-memory rate limiting, and nothing else. No accounts, no email list.",
      path: "/privacy",
      // Sourced from the deploy date rather than "now" so the stamp reflects when
      // the policy last actually changed.
      lastUpdated: "2026-08-21",
    });
  });

  return router;
}
