import { Router } from "express";
import { db, sources } from "../../db/index.js";
import { eq, sql, asc } from "drizzle-orm";
import { z } from "zod";

const router = Router();
const sourceSchema = z.object({
  id: z.string().min(1).regex(/^[a-z0-9-_]+$/),
  type: z.enum(["rss", "scraper", "api", "social"]),
  tier: z.number().min(1).max(3),
  url: z.string().optional(),
  rateLimitMinutes: z.number().min(1).optional(),
  enabled: z.boolean().optional(),
});

router.get("/", async (req, res) => {
  try {
    const limit = Math.min(100, parseInt(String(req.query.limit || 20), 10));
    const offset = parseInt(String(req.query.offset || 0), 10);
    const [[{ total }], list] = await Promise.all([
      db.select({ total: sql<number>`count(*)::int` }).from(sources),
      db.select().from(sources).orderBy(asc(sources.id)).limit(limit).offset(offset),
    ]);
    res.json({ data: list, total: Number(total) });
  } catch (err) {
    res.status(500).json({ error: "Failed to list sources" });
  }
});

router.post("/", async (req, res) => {
  const parsed = sourceSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  const { id, type, tier, url, rateLimitMinutes, enabled } = parsed.data;
  try {
    await db.insert(sources).values({
      id,
      type,
      tier,
      url: url || null,
      rateLimitMinutes: rateLimitMinutes ?? 15,
      enabled: enabled ?? true,
    });
    res.json({ ok: true, id });
  } catch (err) {
    res.status(500).json({ error: "Failed to create source" });
  }
});

router.patch("/:id", async (req, res) => {
  const body = req.body as Record<string, unknown>;
  const allowed = ["url", "tier", "rateLimitMinutes", "enabled"];
  const updates: Record<string, unknown> = {};
  for (const k of allowed) {
    if (body[k] !== undefined) updates[k] = body[k];
  }
  if (Object.keys(updates).length === 0) return res.status(400).json({ error: "No valid fields" });

  try {
    await db
      .update(sources)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(sources.id, req.params.id));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to update source" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await db.delete(sources).where(eq(sources.id, req.params.id));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete source" });
  }
});

export const sourcesRoutes = router;
