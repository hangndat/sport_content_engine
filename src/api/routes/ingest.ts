import { Router } from "express";
import { randomUUID } from "crypto";
import { desc, eq, sql } from "drizzle-orm";
import { db, ingestRuns } from "../../db/index.js";
import { runIngestPipeline } from "../../services/runIngestPipeline.js";

const router = Router();

router.get("/runs", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
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
  const triggeredBy = (req.body?.triggeredBy as string) || "manual";
  const streamMode = req.query.stream === "1" || req.headers.accept?.includes("text/event-stream");

  const [running] = await db
    .select({ id: ingestRuns.id })
    .from(ingestRuns)
    .where(eq(ingestRuns.status, "running"))
    .limit(1);
  if (running) {
    res.status(409).json({
      ok: false,
      error: "Đang có lần crawl chạy. Vui lòng đợi hoàn thành hoặc refresh để xem trạng thái.",
    });
    return;
  }

  const runId = randomUUID();
  const send = (ev: unknown) => {
    if (streamMode) {
      res.write(`data: ${JSON.stringify(ev)}\n\n`);
      (res as unknown as { flush?: () => void }).flush?.();
    }
  };

  if (streamMode) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();
    send({ t: "start", runId });
  }

  try {
    await db.insert(ingestRuns).values({
      id: runId,
      status: "running",
      triggeredBy,
    });

    const result = await runIngestPipeline(
      streamMode
        ? (ev) => {
            send(ev);
          }
        : undefined
    );

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

    if (streamMode) {
      send({ t: "done", result });
      res.end();
      return;
    }

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

    if (streamMode) {
      send({ t: "error", error: msg });
      send({
        t: "done",
        result: {
          ok: false,
          steps: [],
          articlesFetched: 0,
          clustersCreated: 0,
          clustersNew: 0,
          clustersUpdated: 0,
          error: msg,
        },
      });
      res.end();
      return;
    }

    res.status(500).json({
      ok: false,
      runId,
      error: msg,
    });
  }
});

export const ingestRoutes = router;
