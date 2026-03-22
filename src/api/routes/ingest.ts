import { Router } from "express";
import { randomUUID } from "crypto";
import { desc, eq, sql } from "drizzle-orm";
import { db, ingestRuns } from "../../db/index.js";
import { runIngestPipeline } from "../../services/runIngestPipeline.js";

const router = Router();

router.get("/runs", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const [[{ total }], rows] = await Promise.all([
      db.select({ total: sql<number>`count(*)::int` }).from(ingestRuns),
      db
        .select()
        .from(ingestRuns)
        .orderBy(desc(ingestRuns.startedAt))
        .limit(limit)
        .offset(offset),
    ]);
    res.json({ data: rows, total: Number(total) });
  } catch (err) {
    console.error("Ingest runs list error:", err);
    res.status(500).json({ error: "Failed to list runs" });
  }
});

router.post("/fetch", async (req, res) => {
  const runId = randomUUID();
  const triggeredBy = (req.body?.triggeredBy as string) || "manual";

  try {
    await db.insert(ingestRuns).values({
      id: runId,
      status: "running",
      triggeredBy,
    });

    const result = await runIngestPipeline();

    await db
      .update(ingestRuns)
      .set({
        status: result.ok ? "completed" : "failed",
        articlesFetched: result.articlesFetched,
        clustersCreated: result.clustersCreated,
        error: result.error ?? null,
        steps: result.steps,
        finishedAt: new Date(),
      })
      .where(eq(ingestRuns.id, runId));

    if (result.ok) {
      res.json({
        ok: true,
        runId,
        articlesFetched: result.articlesFetched,
        clustersCreated: result.clustersCreated,
        clustersNew: result.clustersNew,
        clustersUpdated: result.clustersUpdated,
        steps: result.steps,
      });
    } else {
      res.status(500).json({
        ok: false,
        runId,
        error: result.error,
        steps: result.steps,
      });
    }
  } catch (err) {
    console.error("Ingest error:", err);
    const msg = err instanceof Error ? err.message : "Ingest failed";
    await db
      .update(ingestRuns)
      .set({
        status: "failed",
        error: msg,
        finishedAt: new Date(),
      })
      .where(eq(ingestRuns.id, runId));

    res.status(500).json({
      ok: false,
      runId,
      error: msg,
    });
  }
});

export const ingestRoutes = router;
