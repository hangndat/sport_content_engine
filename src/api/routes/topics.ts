import { Router } from "express";
import { db, topics, topicRules } from "../../db/index.js";
import { eq, asc } from "drizzle-orm";
import { invalidateTopicCache } from "../../services/TopicService.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(topics)
      .orderBy(asc(topics.sortOrder), asc(topics.id));
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: "Failed to list topics" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { id, label, sortOrder } = req.body as { id?: string; label?: string; sortOrder?: number };
    if (!id || !label) {
      return res.status(400).json({ error: "id, label required" });
    }
    await db.insert(topics).values({
      id: id.trim().toLowerCase().replace(/\s+/g, "_"),
      label,
      sortOrder: sortOrder ?? 0,
    });
    invalidateTopicCache();
    res.json({ ok: true, id: id.trim().toLowerCase().replace(/\s+/g, "_") });
  } catch (err) {
    res.status(500).json({ error: "Failed to create topic" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const { label, sortOrder } = req.body as { label?: string; sortOrder?: number };
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (label != null) updates.label = label;
    if (sortOrder != null) updates.sortOrder = sortOrder;
    await db.update(topics).set(updates).where(eq(topics.id, req.params.id));
    invalidateTopicCache();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to update topic" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const tid = req.params.id;
    if (tid === "other") {
      return res.status(400).json({ error: "Cannot delete topic 'other'" });
    }
    await db.delete(topicRules).where(eq(topicRules.topicId, tid));
    await db.delete(topics).where(eq(topics.id, tid));
    invalidateTopicCache();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete topic" });
  }
});

export const topicsRoutes = router;
