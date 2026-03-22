import { db, storyClusters, articles } from "../db/index.js";
import { eq, desc, inArray } from "drizzle-orm";
import { computeViralSignals, type ViralSignals } from "../lib/viralSignals.js";
import { getScoreConfig } from "../lib/scoreConfig.js";

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

export class RankingService {
  async scoreCluster(clusterId: string): Promise<number> {
    const config = await getScoreConfig();
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

    const tierWeights = config.tierWeights;
    const freshnessHours = config.freshnessHours;

    let baseScore = 0;
    for (const a of arts) {
      const tierScore = tierWeights[String(a.sourceTier)] ?? 1;
      const ageHours = (Date.now() - a.publishedAt.getTime()) / MS_PER_HOUR;
      const freshnessScore = Math.max(0, 1 - ageHours / freshnessHours);
      baseScore += tierScore * (0.5 + 0.5 * freshnessScore);
    }

    const confirmBonus =
      Math.min(articleList.length, config.confirmMaxArticles) * config.confirmMultiplier;
    baseScore += confirmBonus;

    const teams = [...new Set(arts.flatMap((a) => a.teams ?? []))];
    const players = [...new Set(arts.flatMap((a) => a.players ?? []))];
    const sourceList = [...new Set(arts.map((a) => a.source).filter(Boolean))];
    const canonical = arts.find((a) => a.id === cluster.canonicalArticleId) ?? arts[0];
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

    const score = Math.round(baseScore + viralBonus);
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
    topicIds?: string[]
  ): Promise<typeof storyClusters.$inferSelect[]> {
    const base = db
      .select()
      .from(storyClusters)
      .orderBy(desc(storyClusters.score), desc(storyClusters.createdAt))
      .limit(limit);
    const ids = topic ? [topic] : topicIds;
    return ids && ids.length > 0 ? base.where(inArray(storyClusters.topic, ids)) : base;
  }
}
