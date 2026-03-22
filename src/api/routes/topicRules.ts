import { Router } from "express";
import { db, topicRules } from "../../db/index.js";
import { eq, asc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { invalidateTopicCache, RULE_TYPES } from "../../services/TopicService.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const topicId = req.query.topicId as string | undefined;
    let query = db.select().from(topicRules).orderBy(asc(topicRules.priority), asc(topicRules.id));
    if (topicId) {
      const rows = await db
        .select()
        .from(topicRules)
        .where(eq(topicRules.topicId, topicId))
        .orderBy(asc(topicRules.priority), asc(topicRules.id));
      return res.json({ data: rows });
    }
    const rows = await db.select().from(topicRules).orderBy(asc(topicRules.priority), asc(topicRules.id));
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: "Failed to list topic rules" });
  }
});

router.get("/types", (_req, res) => {
  res.json({ data: RULE_TYPES });
});

router.post("/", async (req, res) => {
  try {
    const { topicId, ruleType, ruleValue, priority } = req.body as {
      topicId?: string;
      ruleType?: string;
      ruleValue?: object;
      priority?: number;
    };
    if (!topicId || !ruleType || !ruleValue) {
      return res.status(400).json({ error: "topicId, ruleType, ruleValue required" });
    }
    if (!(RULE_TYPES as readonly string[]).includes(ruleType)) {
      return res.status(400).json({ error: `ruleType must be one of: ${RULE_TYPES.join(", ")}` });
    }
    const id = randomUUID();
    await db.insert(topicRules).values({
      id,
      topicId,
      ruleType,
      ruleValue: ruleValue as object,
      priority: priority ?? 0,
    });
    invalidateTopicCache();
    res.json({ ok: true, id });
  } catch (err) {
    res.status(500).json({ error: "Failed to create topic rule" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const { topicId, ruleType, ruleValue, priority } = req.body as {
      topicId?: string;
      ruleType?: string;
      ruleValue?: object;
      priority?: number;
    };
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (topicId != null) updates.topicId = topicId;
    if (ruleType != null) updates.ruleType = ruleType;
    if (ruleValue != null) updates.ruleValue = ruleValue;
    if (priority != null) updates.priority = priority;
    await db.update(topicRules).set(updates).where(eq(topicRules.id, req.params.id));
    invalidateTopicCache();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to update topic rule" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await db.delete(topicRules).where(eq(topicRules.id, req.params.id));
    invalidateTopicCache();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete topic rule" });
  }
});

export const topicRulesRoutes = router;
