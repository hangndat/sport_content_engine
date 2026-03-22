import { Router } from "express";
import { db, articles } from "../../db/index.js";
import { eq, desc, sql } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const limit = Math.min(100, parseInt(String(req.query.limit || 20), 10));
    const offset = parseInt(String(req.query.offset || 0), 10);
    const [[{ total }], list] = await Promise.all([
      db.select({ total: sql<number>`count(*)::int` }).from(articles),
      db
        .select()
        .from(articles)
        .orderBy(desc(articles.createdAt))
        .limit(limit)
        .offset(offset),
    ]);
    res.json({ data: list, total: Number(total) });
  } catch (err) {
    res.status(500).json({ error: "Failed to list articles" });
  }
});

router.get("/:id", async (req, res) => {
  const [article] = await db
    .select()
    .from(articles)
    .where(eq(articles.id, req.params.id));
  if (!article) return res.status(404).json({ error: "Article not found" });
  res.json(article);
});

export const articlesRoutes = router;
