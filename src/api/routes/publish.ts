import { Router } from "express";
import { eq, desc, sql } from "drizzle-orm";
import { db, drafts, posts } from "../../db/index.js";
import { FacebookPublisher } from "../../publishers/FacebookPublisher.js";
import { ToneController } from "../../agents/index.js";
import { randomUUID } from "crypto";

const router = Router();
const facebook = new FacebookPublisher();
const toneController = new ToneController();

router.post("/", async (req, res) => {
  const { draftId, platform = "facebook" } = req.body as {
    draftId?: string;
    platform?: string;
  };

  if (!draftId) {
    return res.status(400).json({ error: "draftId required" });
  }

  const [draft] = await db.select().from(drafts).where(eq(drafts.id, draftId));

  if (!draft) {
    return res.status(404).json({ error: "Draft not found" });
  }

  if (draft.status !== "approved") {
    return res.status(400).json({ error: "Draft must be approved first" });
  }

  const tone = (draft as { tone?: string }).tone ?? "neutral";
  const contentToPublish = toneController.adjust(draft.content, tone as "neutral" | "humorous" | "fan_light" | "debate_hot" | "news_style");

  let result;
  if (platform === "facebook") {
    result = await facebook.publish(contentToPublish);
  } else {
    return res.status(400).json({ error: "Unsupported platform" });
  }

  if (!result.success) {
    return res.status(500).json({ error: result.error });
  }

  const postId = randomUUID();
  await db.insert(posts).values({
    id: postId,
    draftId,
    platform,
    externalId: result.externalId,
    publishedAt: new Date(),
    status: "published",
  });

  res.json({ ok: true, postId, externalId: result.externalId });
});

router.get("/posts", async (req, res) => {
  try {
    const limit = Math.min(100, parseInt(String(req.query.limit || 20), 10));
    const offset = parseInt(String(req.query.offset || 0), 10);
    const [[{ total }], list] = await Promise.all([
      db.select({ total: sql<number>`count(*)::int` }).from(posts),
      db
        .select()
        .from(posts)
        .orderBy(desc(posts.createdAt))
        .limit(limit)
        .offset(offset),
    ]);
    res.json({ data: list, total: Number(total) });
  } catch (err) {
    res.status(500).json({ error: "Failed to list posts" });
  }
});

export const publishRoutes = router;
