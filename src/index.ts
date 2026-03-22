import "dotenv/config";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { startServer } from "./api/server.js";
import { db, ingestRuns } from "./db/index.js";
import { ensureBucket } from "./lib/s3.js";
import { runIngestPipeline } from "./services/runIngestPipeline.js";

const INGEST_INTERVAL_MS = parseInt(process.env.INGEST_INTERVAL_MS ?? "0", 10);

async function runIngest(): Promise<void> {
  const runId = randomUUID();
  try {
    await db.insert(ingestRuns).values({
      id: runId,
      status: "running",
      triggeredBy: "scheduled",
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
      console.log(
        `[Ingest] Done: ${result.articlesFetched} bài, ${result.clustersCreated} clusters (${result.clustersNew} mới, ${result.clustersUpdated} cập nhật)`
      );
    }
  } catch (err) {
    console.error("[Ingest]", err);
    await db
      .update(ingestRuns)
      .set({
        status: "failed",
        error: err instanceof Error ? err.message : "Ingest failed",
        finishedAt: new Date(),
      })
      .where(eq(ingestRuns.id, runId));
  }
}

startServer()
  .then(() => ensureBucket())
  .then(() => {
    if (INGEST_INTERVAL_MS > 0) {
      runIngest();
      setInterval(runIngest, INGEST_INTERVAL_MS);
      console.log(`[Ingest] Scheduled every ${INGEST_INTERVAL_MS / 60000} minutes`);
    }
  })
  .catch(console.error);
