import { getConnector } from "../connectors/index.js";
import type { SourceConfig } from "../connectors/base.js";
import type { UnifiedArticle } from "../types/index.js";
import { db, articles } from "../db/index.js";
import { SourceService } from "./SourceService.js";
import { putRaw } from "../lib/s3.js";
import { supplementWithAI } from "../lib/aiEntityExtract.js";

const USE_AI_ENTITY = process.env.USE_AI_ENTITY_EXTRACT !== "false";
const AI_ENTITY_LIMIT = Math.min(30, parseInt(process.env.AI_ENTITY_LIMIT ?? "30", 10) || 30);

export type FetchSourceResult = { sourceId: string; count: number; error?: string };
export type FetchAllResult = { items: UnifiedArticle[]; perSource: FetchSourceResult[] };
export type SaveResult = { inserted: number; skipped: number; failed: number };

export type OnSourceComplete = (r: FetchSourceResult) => void;

export class IngestionService {
  async fetchAll(
    customSources?: SourceConfig[],
    onSourceComplete?: OnSourceComplete
  ): Promise<FetchAllResult> {
    const list = customSources ?? (await new SourceService().getSources());
    const enabled = list.filter((s) => s.enabled !== false);
    const results: UnifiedArticle[] = [];
    const perSource: FetchSourceResult[] = [];

    for (const config of enabled) {
      try {
        const connector = getConnector(config.type);
        const items = await connector.fetch(config);
        results.push(...items);
        const r: FetchSourceResult = { sourceId: config.id, count: items.length };
        perSource.push(r);
        onSourceComplete?.(r);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`Ingestion failed for ${config.id}:`, err);
        const r: FetchSourceResult = { sourceId: config.id, count: 0, error: msg };
        perSource.push(r);
        onSourceComplete?.(r);
      }
    }

    return { items: results, perSource };
  }

  async normalizeAndSave(items: UnifiedArticle[]): Promise<SaveResult> {
    let inserted = 0;
    let skipped = 0;
    let failed = 0;

    if (USE_AI_ENTITY && items.length > 0) {
      let aiCount = 0;
      for (const item of items) {
        if (aiCount >= AI_ENTITY_LIMIT) break;
        const needsMore =
          (item.teams?.length ?? 0) < 2 || (item.players?.length ?? 0) === 0;
        if (needsMore) {
          const ai = await supplementWithAI(
            item,
            item.teams ?? [],
            item.players ?? []
          );
          if (ai) {
            item.teams = ai.teams.length > 0 ? ai.teams : item.teams;
            item.players = ai.players.length > 0 ? ai.players : item.players;
            item.competition = ai.competition ?? item.competition;
            const ct = ai.contentType;
            if (["news", "result", "rumor", "stats", "opinion", "schedule"].includes(ct ?? "")) {
              item.contentType = ct as UnifiedArticle["contentType"];
            }
            aiCount++;
          }
        }
      }
    }

    for (const item of items) {
      try {
        if (item.rawPayload) {
          try {
            await putRaw(`raw/${item.id}.json`, JSON.stringify(item.rawPayload));
          } catch {
            // S3/MinIO optional: bucket chưa tạo hoặc chưa config vẫn lưu DB
          }
        }
        const res = await db
          .insert(articles)
          .values({
            id: item.id,
            sourceId: item.source,
            source: item.source,
            sourceTier: item.sourceTier,
            url: item.url,
            title: item.title,
            content: item.content,
            publishedAt: item.publishedAt,
            language: item.language,
            teams: item.teams,
            players: item.players,
            competition: item.competition,
            contentType: item.contentType,
            rawPayload: item.rawPayload ?? undefined,
          })
          .onConflictDoNothing({ target: articles.url })
          .returning({ id: articles.id });

        if (res.length > 0) inserted++;
        else skipped++;
      } catch (err) {
        console.error("Save article failed:", item.url, err);
        failed++;
      }
    }

    return { inserted, skipped, failed };
  }
}
