import type { IngestStep } from "../db/index.js";
import { IngestionService } from "./IngestionService.js";
import { DedupService } from "./DedupService.js";
import { RankingService } from "./RankingService.js";

export type IngestPipelineResult = {
  ok: boolean;
  steps: IngestStep[];
  articlesFetched: number;
  clustersCreated: number;
  clustersNew: number;
  clustersUpdated: number;
  error?: string;
};

export async function runIngestPipeline(): Promise<IngestPipelineResult> {
  const steps: IngestStep[] = [];
  const ingestion = new IngestionService();
  const dedup = new DedupService();
  const ranking = new RankingService();

  try {
    // Step 1: Fetch from all sources
    const fetchStart = Date.now();
    const { items, perSource } = await ingestion.fetchAll();
    const fetchMs = Date.now() - fetchStart;

    steps.push({
      name: "fetch",
      status: "ok",
      durationMs: fetchMs,
      output: {
        total: items.length,
        perSource: perSource.map((s) =>
          s.error ? { sourceId: s.sourceId, count: s.count, error: s.error } : { sourceId: s.sourceId, count: s.count }
        ),
      },
    });
    console.log(`[Ingest] Step 1 fetch: ${items.length} bài từ ${perSource.length} nguồn (${fetchMs}ms)`);

    if (items.length === 0) {
      steps.push({ name: "save", status: "skipped", output: { reason: "no_items" } });
      steps.push({ name: "dedup", status: "skipped", output: { reason: "no_items" } });
      steps.push({ name: "score", status: "skipped", output: { reason: "no_items" } });
      return {
        ok: true,
        steps,
        articlesFetched: 0,
        clustersCreated: 0,
        clustersNew: 0,
        clustersUpdated: 0,
      };
    }

    const ids = items.map((i) => i.id);

    // Step 2: Normalize and save to DB
    const saveStart = Date.now();
    const saveResult = await ingestion.normalizeAndSave(items);
    const saveMs = Date.now() - saveStart;

    steps.push({
      name: "save",
      status: "ok",
      durationMs: saveMs,
      output: {
        inserted: saveResult.inserted,
        skipped: saveResult.skipped,
        failed: saveResult.failed,
      },
    });
    console.log(
      `[Ingest] Step 2 save: ${saveResult.inserted} mới, ${saveResult.skipped} trùng, ${saveResult.failed} lỗi (${saveMs}ms)`
    );

    // Step 3: Deduplicate and cluster
    const dedupStart = Date.now();
    const dedupResult = await dedup.deduplicateAndSave(ids);
    const dedupMs = Date.now() - dedupStart;

    steps.push({
      name: "dedup",
      status: "ok",
      durationMs: dedupMs,
      output: {
        clusterCount: dedupResult.clusterIds.length,
        newCount: dedupResult.newCount,
        updatedCount: dedupResult.updatedCount,
      },
    });
    console.log(
      `[Ingest] Step 3 dedup: ${dedupResult.clusterIds.length} clusters (${dedupResult.newCount} mới, ${dedupResult.updatedCount} cập nhật) (${dedupMs}ms)`
    );

    // Step 4: Score clusters
    const scoreStart = Date.now();
    for (const cid of dedupResult.clusterIds) {
      await ranking.scoreCluster(cid);
    }
    const scoreMs = Date.now() - scoreStart;

    steps.push({
      name: "score",
      status: "ok",
      durationMs: scoreMs,
      output: { scored: dedupResult.clusterIds.length },
    });
    console.log(`[Ingest] Step 4 score: ${dedupResult.clusterIds.length} clusters (${scoreMs}ms)`);

    return {
      ok: true,
      steps,
      articlesFetched: items.length,
      clustersCreated: dedupResult.clusterIds.length,
      clustersNew: dedupResult.newCount,
      clustersUpdated: dedupResult.updatedCount,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Ingest failed";
    console.error("[Ingest]", err);
    steps.push({
      name: "pipeline",
      status: "failed",
      error: msg,
    });
    return {
      ok: false,
      steps,
      articlesFetched: 0,
      clustersCreated: 0,
      clustersNew: 0,
      clustersUpdated: 0,
      error: msg,
    };
  }
}
