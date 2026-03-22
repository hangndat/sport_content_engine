import { db, storyClusters, articles } from "../db/index.js";
import { eq, desc, inArray, sql } from "drizzle-orm";
import { computeViralSignals, type ViralSignals } from "../lib/viralSignals.js";
import { getScoreConfig } from "../lib/scoreConfig.js";
import { buildClusterQueryConditions } from "../lib/clusterQuery.js";

const MS_PER_HOUR = 3600 * 1000;

export interface ScoreBreakdown {
  total: number;
  /** Điểm tier nguồn + độ mới (chưa gồm xác nhận) */
  tierFreshness: number;
  /** Điểm xác nhận đa nguồn */
  confirmBonus: number;
  viralBonus: number;
  viralSignals: ViralSignals;
}

type ArticleForScoring = {
  id: string;
  sourceTier: number;
  publishedAt: Date;
  teams?: string[] | null;
  players?: string[] | null;
  competition?: string | null;
  contentType: string;
  source: string;
};

interface ScoreComputation {
  tierFreshness: number;
  confirmBonus: number;
  viralSignals: ViralSignals;
  viralBonus: number;
}

/** Tính điểm từ articles — dùng chung bởi scoreCluster và getScoreBreakdown. */
async function computeScoreFromArticles(
  articleIds: string[],
  canonicalArticleId: string,
  arts: ArticleForScoring[]
): Promise<ScoreComputation> {
  const config = await getScoreConfig();
  const tierWeights = config.tierWeights;
  const freshnessHours = config.freshnessHours;

  let tierFreshness = 0;
  for (const a of arts) {
    const tierScore = tierWeights[String(a.sourceTier)] ?? 1;
    const ageHours = (Date.now() - new Date(a.publishedAt).getTime()) / MS_PER_HOUR;
    const freshnessScore = Math.max(0, 1 - ageHours / freshnessHours);
    tierFreshness += tierScore * (0.5 + 0.5 * freshnessScore);
  }
  const confirmBonus =
    Math.min(articleIds.length, config.confirmMaxArticles) * config.confirmMultiplier;

  const teams = [...new Set(arts.flatMap((a) => a.teams ?? []))];
  const players = [...new Set(arts.flatMap((a) => a.players ?? []))];
  const sourceList = [...new Set(arts.map((a) => a.source).filter(Boolean))];
  const canonical = arts.find((a) => a.id === canonicalArticleId) ?? arts[0];
  const viralConfig = {
    viralHotEntityMax: config.viralHotEntityMax,
    viralCompetitionBonus: config.viralCompetitionBonus,
    viralContentTypeBonus: config.viralContentTypeBonus,
    viralCrossSourceBonus: config.viralCrossSourceBonus,
  };
  const viralSignals = computeViralSignals(
    {
      teams,
      players,
      competition: canonical.competition,
      contentType: canonical.contentType,
      distinctSourceCount: sourceList.length,
    },
    viralConfig
  );
  const viralBonus = Math.min(viralSignals.totalViralBonus, config.viralBonusCap);

  return { tierFreshness, confirmBonus, viralSignals, viralBonus };
}

export class RankingService {
  async scoreCluster(clusterId: string): Promise<number> {
    const [cluster] = await db
      .select()
      .from(storyClusters)
      .where(eq(storyClusters.id, clusterId));

    if (!cluster) return 0;

    const articleList = cluster.articleIds ?? [];
    if (articleList.length === 0) return 0;

    const arts = await db
      .select()
      .from(articles)
      .where(inArray(articles.id, articleList));

    const { tierFreshness, confirmBonus, viralBonus } = await computeScoreFromArticles(
      articleList,
      cluster.canonicalArticleId,
      arts
    );

    const score = Math.round(tierFreshness + confirmBonus + viralBonus);
    await db
      .update(storyClusters)
      .set({ score })
      .where(eq(storyClusters.id, clusterId));
    return score;
  }

  /** Tính breakdown score từ cluster + articles (dùng cho API hiển thị chi tiết). */
  async getScoreBreakdown(
    articleIds: string[],
    canonicalArticleId: string,
    arts: ArticleForScoring[]
  ): Promise<ScoreBreakdown> {
    const emptyResult: ScoreBreakdown = {
      total: 0,
      tierFreshness: 0,
      confirmBonus: 0,
      viralBonus: 0,
      viralSignals: {
        hotEntityBonus: 0,
        competitionBonus: 0,
        contentTypeBonus: 0,
        crossSourceBonus: 0,
        totalViralBonus: 0,
      },
    };
    if (articleIds.length === 0 || arts.length === 0) return emptyResult;

    const { tierFreshness, confirmBonus, viralSignals, viralBonus } =
      await computeScoreFromArticles(articleIds, canonicalArticleId, arts);
    const total = Math.round(tierFreshness + confirmBonus + viralBonus);

    return {
      total,
      tierFreshness: Math.round(tierFreshness),
      confirmBonus,
      viralBonus,
      viralSignals,
    };
  }

  async getTopClusters(
    limit: number,
    topic?: string,
    topicIds?: string[],
    entityFilter?: { team?: string; competition?: string; player?: string },
    publishedAfter?: Date
  ): Promise<typeof storyClusters.$inferSelect[]> {
    const ids = topic ? [topic] : topicIds;
    const { entityCond, topicCond, topicFilter } = buildClusterQueryConditions(
      ids,
      entityFilter,
      publishedAfter
    );

    if (!entityCond) {
      const base = db
        .select()
        .from(storyClusters)
        .orderBy(desc(storyClusters.score), desc(storyClusters.createdAt))
        .limit(limit);
      if (!topicFilter) return base;
      return base.where(topicFilter);
    }
    const result = await db.execute<Record<string, unknown>>(sql`
      WITH matching AS (
        SELECT DISTINCT sc.id
        FROM story_clusters sc
        CROSS JOIN LATERAL jsonb_array_elements_text(sc.article_ids) AS aid(elem)
        JOIN articles a ON a.id = aid.elem
        WHERE (${entityCond}) ${topicCond}
      )
      SELECT sc.* FROM story_clusters sc
      JOIN matching m ON m.id = sc.id
      ORDER BY sc.score DESC NULLS LAST, sc.created_at DESC
      LIMIT ${limit}
    `);
    const rows = result.rows ?? [];
    return rows.map((r) => ({
      id: r.id,
      hashKey: r.hash_key,
      articleIds: r.article_ids,
      canonicalArticleId: r.canonical_article_id,
      score: r.score,
      topicIds: r.topic_ids,
      enrichedAt: r.enriched_at,
      createdAt: r.created_at,
    })) as typeof storyClusters.$inferSelect[];
  }
}
