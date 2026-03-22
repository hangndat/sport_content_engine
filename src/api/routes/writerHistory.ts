import { Router } from "express";
import { db, writerHistory } from "../../db/index.js";
import { eq, desc, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const limit = Math.min(100, parseInt(String(req.query.limit || 30), 10));
    const offset = parseInt(String(req.query.offset || 0), 10);
    const type = req.query.type as string | undefined; // rewrite | create

    const typeFilter =
      type && ["rewrite", "create"].includes(type)
        ? eq(writerHistory.type, type)
        : undefined;

    const listQuery = db
      .select()
      .from(writerHistory)
      .orderBy(desc(writerHistory.createdAt))
      .limit(limit)
      .offset(offset);

    const countQuery = db
      .select({ total: sql<number>`count(*)::int` })
      .from(writerHistory);

    const [list, countRes] = await Promise.all([
      typeFilter ? listQuery.where(typeFilter) : listQuery,
      typeFilter ? countQuery.where(typeFilter) : countQuery,
    ]);

    const total = Number(countRes[0]?.total ?? 0);
    res.json({ data: list, total });
  } catch (err) {
    console.error("[WriterHistory] List failed", err);
    res.status(500).json({ error: "Failed to list writer history" });
  }
});

router.get("/:id", async (req, res) => {
  const [item] = await db
    .select()
    .from(writerHistory)
    .where(eq(writerHistory.id, req.params.id));
  if (!item) return res.status(404).json({ error: "Writer history not found" });
  res.json(item);
});

router.post("/", async (req, res) => {
  try {
    const body = req.body as {
      type: "rewrite" | "create";
      draftId?: string;
      clusterId?: string;
      instruction?: string;
      steps: unknown[];
      result?: { headline?: string; content?: string; draftId?: string };
      error?: string;
    };

    if (!body.type || !body.steps) {
      return res.status(400).json({ error: "type and steps required" });
    }
    if (!["rewrite", "create"].includes(body.type)) {
      return res.status(400).json({ error: "type must be rewrite or create" });
    }

    const id = randomUUID();
    await db.insert(writerHistory).values({
      id,
      type: body.type,
      draftId: body.draftId ?? null,
      clusterId: body.clusterId ?? null,
      instruction: body.instruction ?? null,
      steps: body.steps as unknown as Record<string, unknown>[],
      result: (body.result ?? null) as unknown as Record<string, unknown> | null,
      error: body.error ?? null,
    });

    const [item] = await db.select().from(writerHistory).where(eq(writerHistory.id, id));
    res.status(201).json(item);
  } catch (err) {
    console.error("[WriterHistory] Create failed", err);
    res.status(500).json({ error: "Failed to save writer history" });
  }
});

export const writerHistoryRoutes = router;
