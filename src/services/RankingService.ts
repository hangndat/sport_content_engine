import { db, storyClusters, articles } from "../db/index.js";
import { eq, desc, inArray } from "drizzle-orm";

const TIER_WEIGHT = { 1: 3, 2: 2, 3: 1 } as const;
const FRESHNESS_HOURS = 24;
const MS_PER_HOUR = 3600 * 1000;

export class RankingService {
  async scoreCluster(clusterId: string): Promise<number> {
    const [cluster] = await db
      .select()
      .from(storyClusters)
      .where(eq(storyClusters.id, clusterId));

    if (!cluster) return 0;

    const articleList = cluster.articleIds ?? [];
    let totalScore = 0;

    for (const aid of articleList) {
      const [a] = await db.select().from(articles).where(eq(articles.id, aid));
      if (!a) continue;

      const tierScore = TIER_WEIGHT[a.sourceTier as 1 | 2 | 3] ?? 1;
      const ageHours = (Date.now() - a.publishedAt.getTime()) / MS_PER_HOUR;
      const freshnessScore = Math.max(0, 1 - ageHours / FRESHNESS_HOURS);
      const confirmBonus = Math.min(articleList.length, 5);

      totalScore += tierScore * (0.5 + 0.5 * freshnessScore) + confirmBonus * 2;
    }

    const score = Math.round(totalScore);
    await db
      .update(storyClusters)
      .set({ score })
      .where(eq(storyClusters.id, clusterId));
    return score;
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
