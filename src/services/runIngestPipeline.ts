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

export type IngestStreamEvent =
  | { t: "source"; sourceId: string; count: number; error?: string }
  | { t: "step"; step: IngestStep }
  | { t: "done"; result: IngestPipelineResult }
  | { t: "error"; error: string };

export type OnIngestEvent = (ev: IngestStreamEvent) => void;

export async function runIngestPipeline(
  onEvent?: OnIngestEvent
): Promise<IngestPipelineResult> {
  const steps: IngestStep[] = [];
  const ingestion = new IngestionService();
  const dedup = new DedupService();
  const ranking = new RankingService();

  const emit = (ev: IngestStreamEvent) => {
    onEvent?.(ev);
  };

  try {
    // Step 1: Fetch from all sources
    const fetchStart = Date.now();
    const { items, perSource } = await ingestion.fetchAll(undefined, (r) =>
      emit({ t: "source", sourceId: r.sourceId, count: r.count, error: r.error })
    );
    const fetchMs = Date.now() - fetchStart;

    const fetchStep: IngestStep = {
      name: "fetch",
      status: "ok",
      durationMs: fetchMs,
      output: {
        total: items.length,
        perSource: perSource.map((s) =>
          s.error ? { sourceId: s.sourceId, count: s.count, error: s.error } : { sourceId: s.sourceId, count: s.count }
        ),
      },
    };
    steps.push(fetchStep);
    emit({ t: "step", step: fetchStep });
    console.log(`[Ingest] Step 1 fetch: ${items.length} bài từ ${perSource.length} nguồn (${fetchMs}ms)`);

    if (items.length === 0) {
      const saveSkip = { name: "save" as const, status: "skipped" as const, output: { reason: "no_items" } };
      const dedupSkip = { name: "dedup" as const, status: "skipped" as const, output: { reason: "no_items" } };
      const scoreSkip = { name: "score" as const, status: "skipped" as const, output: { reason: "no_items" } };
      steps.push(saveSkip);
      emit({ t: "step", step: saveSkip });
      steps.push(dedupSkip);
      emit({ t: "step", step: dedupSkip });
      steps.push(scoreSkip);
      emit({ t: "step", step: scoreSkip });
      const res = {
        ok: true,
        steps,
        articlesFetched: 0,
        clustersCreated: 0,
        clustersNew: 0,
        clustersUpdated: 0,
      };
      emit({ t: "done", result: res });
      return res;
    }

    const ids = items.map((i) => i.id);

    // Step 2: Normalize and save to DB
    const saveStart = Date.now();
    const saveResult = await ingestion.normalizeAndSave(items);
    const saveMs = Date.now() - saveStart;

    const saveStep: IngestStep = {
      name: "save",
      status: "ok",
      durationMs: saveMs,
      output: {
        inserted: saveResult.inserted,
        skipped: saveResult.skipped,
        failed: saveResult.failed,
      },
    };
    steps.push(saveStep);
    emit({ t: "step", step: saveStep });
    console.log(
      `[Ingest] Step 2 save: ${saveResult.inserted} mới, ${saveResult.skipped} trùng, ${saveResult.failed} lỗi (${saveMs}ms)`
    );

    // Step 3: Deduplicate and cluster
    const dedupStart = Date.now();
    const dedupResult = await dedup.deduplicateAndSave(ids);
    const dedupMs = Date.now() - dedupStart;

    const dedupStep: IngestStep = {
      name: "dedup",
      status: "ok",
      durationMs: dedupMs,
      output: {
        clusterCount: dedupResult.clusterIds.length,
        newCount: dedupResult.newCount,
        updatedCount: dedupResult.updatedCount,
      },
    };
    steps.push(dedupStep);
    emit({ t: "step", step: dedupStep });
    console.log(
      `[Ingest] Step 3 dedup: ${dedupResult.clusterIds.length} clusters (${dedupResult.newCount} mới, ${dedupResult.updatedCount} cập nhật) (${dedupMs}ms)`
    );

    // Step 4: Score clusters
    const scoreStart = Date.now();
    for (const cid of dedupResult.clusterIds) {
      await ranking.scoreCluster(cid);
    }
    const scoreMs = Date.now() - scoreStart;

    const scoreStep: IngestStep = {
      name: "score",
      status: "ok",
      durationMs: scoreMs,
      output: { scored: dedupResult.clusterIds.length },
    };
    steps.push(scoreStep);
    emit({ t: "step", step: scoreStep });
    console.log(`[Ingest] Step 4 score: ${dedupResult.clusterIds.length} clusters (${scoreMs}ms)`);

    const result: IngestPipelineResult = {
      ok: true,
      steps,
      articlesFetched: items.length,
      clustersCreated: dedupResult.clusterIds.length,
      clustersNew: dedupResult.newCount,
      clustersUpdated: dedupResult.updatedCount,
    };
    emit({ t: "done", result });
    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Ingest failed";
    console.error("[Ingest]", err);
    emit({ t: "error", error: msg });
    steps.push({
      name: "pipeline",
      status: "failed",
      error: msg,
    });
    const res = {
      ok: false,
      steps,
      articlesFetched: 0,
      clustersCreated: 0,
      clustersNew: 0,
      clustersUpdated: 0,
      error: msg,
    };
    emit({ t: "done", result: res });
    return res;
  }
}
