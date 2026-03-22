import { FactExtractor } from "./FactExtractor.js";
import { ContentWriter } from "./ContentWriter.js";
import { Guardrail } from "./Guardrail.js";
import { ToneController } from "./ToneController.js";
import { AngleSelector } from "./AngleSelector.js";
import { EnrichmentService } from "../services/EnrichmentService.js";
import { db, drafts } from "../db/index.js";
import { eq } from "drizzle-orm";
import { shouldAutoPost } from "../lib/moderation.js";
import { randomUUID } from "crypto";
import { computeViralSignals } from "../lib/viralSignals.js";
import type { ContentFormatType } from "../types/index.js";
import type { Tone } from "./ToneController.js";

type PublishPriority = "low" | "medium" | "high";

function derivePublishPriority(
  score: number,
  confidenceScore: number,
  viralBonus: number,
  contentType: string,
  isRumor: boolean
): PublishPriority {
  if (isRumor || contentType === "rumor") return "low";
  const highViral = viralBonus >= 3 && score >= 12;
  const highConfidence = confidenceScore >= 80;
  if (highViral && highConfidence) return "high";
  if (viralBonus >= 1 && score >= 8) return "medium";
  if (score < 5 || confidenceScore < 50) return "low";
  return "medium";
}

export interface CreateDraftOptions {
  format?: ContentFormatType;
  tone?: Tone;
  instruction?: string;
}

const factExtractor = new FactExtractor();
const contentWriter = new ContentWriter();
const guardrail = new Guardrail();
const toneController = new ToneController();
const angleSelector = new AngleSelector();

type DraftStep = "enrichment" | "extract" | "write" | "guardrail" | "insert";

export type CreateDraftStreamEvent =
  | { t: "step"; step: string; actor: string; data?: unknown }
  | { t: "done"; ok: boolean; draftId?: string; error?: string };

type EmitFn = (ev: CreateDraftStreamEvent) => void;

function wrapStep<T>(
  step: DraftStep,
  clusterId: string,
  fn: () => Promise<T>,
  emit?: EmitFn,
  actor?: string
): Promise<T> {
  return fn()
    .then((v) => {
      if (emit && actor) emit({ t: "step", step, actor, data: v });
      return v;
    })
    .catch((err) => {
      console.error(`[Draft] Failed at step "${step}" clusterId=${clusterId}`, err);
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Tạo bản nháp thất bại (${step}): ${msg}`);
    });
}

export async function createDraftFromCluster(
  clusterId: string,
  options?: CreateDraftOptions,
  emit?: EmitFn
): Promise<string> {
  const existing = await db
    .select({ status: drafts.status })
    .from(drafts)
    .where(eq(drafts.storyClusterId, clusterId));
  const active = existing.find((d) => d.status === "pending" || d.status === "approved");
  if (active) {
    throw new Error(
      `Cluster này đã có bản nháp (trạng thái: ${active.status}). Vào Bản nháp để xem hoặc từ chối trước khi tạo mới.`
    );
  }

  const enrichment = new EnrichmentService();
  const cluster = await wrapStep(
    "enrichment",
    clusterId,
    () => enrichment.enrichCluster(clusterId, { fetchFullContent: true }),
    emit,
    "EnrichmentService"
  );
  if (!cluster) throw new Error("Cluster not found");

  const facts = await wrapStep(
    "extract",
    clusterId,
    () => factExtractor.extract(cluster),
    emit,
    "FactExtractor"
  );
  const format = (options?.format ??
    angleSelector.select(facts, { cluster })) as ContentFormatType;

  const viralSignals = computeViralSignals({
    teams: cluster.teams,
    players: cluster.players,
    competition: cluster.competition,
    contentType: cluster.contentType,
    distinctSourceCount: cluster.sourceList?.length ?? 0,
  });
  const instruction = options?.instruction;
  const variants = await wrapStep(
    "write",
    clusterId,
    () => contentWriter.write(facts, format, instruction),
    emit,
    "ContentWriter"
  );

  let content = variants.short_hot ?? variants.quick_summary ?? facts.headline;
  if (format === "quick_summary" && variants.quick_summary) content = variants.quick_summary;
  if (format === "debate" && variants.debate) content = variants.debate;
  if (format === "data_stat" && variants.data_stat) content = variants.data_stat;
  if (format === "schedule_recap" && variants.schedule_recap) content = variants.schedule_recap;

  const tone = options?.tone ?? "neutral";
  content = toneController.adjust(content, tone);
  const preliminaryPriority = derivePublishPriority(
    cluster.score,
    facts.confidenceScore,
    viralSignals.totalViralBonus,
    cluster.contentType,
    false
  );
  const result = await wrapStep(
    "guardrail",
    clusterId,
    () =>
      guardrail.check(
        {
          headline: facts.headline,
          summary: facts.summary,
          confidenceScore: facts.confidenceScore,
          sourceList: facts.sourceList,
          teams: facts.teams,
          players: facts.players,
          publishPriority: preliminaryPriority,
          format,
        },
        content
      ),
    emit,
    "Guardrail"
  );

  const draftId = randomUUID();
  const isRumor = (result.labels ?? []).includes("rumor");
  const isFabrication = result.fabrication === true;
  const publishPriority = derivePublishPriority(
    cluster.score,
    facts.confidenceScore,
    viralSignals.totalViralBonus,
    cluster.contentType,
    isRumor
  );
  const finalStatus = isFabrication
    ? "rejected"
    : shouldAutoPost(cluster.score, cluster.sourceTier, cluster.contentType, isRumor)
      ? "approved"
      : "pending";

  await wrapStep(
    "insert",
    clusterId,
    () =>
      db.insert(drafts).values({
        id: draftId,
        storyClusterId: clusterId,
        headline: facts.headline,
        summary: facts.summary,
        content: result.edits?.[0] ?? content,
        confidenceScore: facts.confidenceScore,
        sourceList: facts.sourceList,
        teams: facts.teams,
        players: facts.players,
        format,
        publishPriority,
        status: finalStatus,
        tone,
        variants: variants as unknown as Record<string, string>,
        ctaComment: variants.ctaComment,
        recommendedImageQuery: variants.recommendedImageQuery,
      })
  );
  if (emit) emit({ t: "step", step: "insert", actor: "DB", data: { draftId } });

  return draftId;
}

export { FactExtractor, ContentWriter, Guardrail, ToneController, AngleSelector };
