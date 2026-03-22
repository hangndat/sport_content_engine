import { Router, type Request, type Response } from "express";
import { db, drafts, articles, storyClusters, clusterCategories } from "../../db/index.js";
import { eq, desc, inArray, sql, asc } from "drizzle-orm";
import { RankingService } from "../../services/RankingService.js";
import { getTopicLabelsRecord } from "../../services/TopicService.js";
import { buildClusterQueryConditions } from "../../lib/clusterQuery.js";

const router = Router();
const ranking = new RankingService();

router.get("/categories", async (_req: Request, res: Response) => {
  try {
    const rows = await db
      .select()
      .from(clusterCategories)
      .orderBy(asc(clusterCategories.sortOrder), asc(clusterCategories.id));
    const data = rows.map((r) => ({
      id: r.id,
      label: r.label,
      topicIds: (r.topicIds ?? []) as string[],
    }));
    res.json({ data });
  } catch (err) {
    console.error("[Clusters] List categories failed", err);
    res.status(500).json({ error: "Failed to list cluster categories" });
  }
});

router.get("/topics", async (_req: Request, res: Response) => {
  try {
    const labels = await getTopicLabelsRecord();
    const topics = Object.entries(labels).map(([id, label]) => ({ id, label }));
    res.json({ data: topics });
  } catch (err) {
    console.error("[Clusters] List topics failed", err);
    res.status(500).json({ error: "Failed to list topics" });
  }
});

router.get("/top-topics", async (req: Request, res: Response) => {
  try {
    const limit = Math.min(20, parseInt(String(req.query.limit || 10), 10) || 10);
    const result = await db.execute<{ topic: string; count: number }>(sql`
      SELECT elem as topic, count(*)::int as count
      FROM story_clusters, jsonb_array_elements_text(COALESCE(topic_ids, '[]'::jsonb)) as elem
      WHERE topic_ids IS NOT NULL AND topic_ids != '[]'::jsonb AND elem != 'other'
      GROUP BY elem
      ORDER BY count(*) desc
      LIMIT ${limit}
    `);
    const labels = await getTopicLabelsRecord();
    const data = (result.rows ?? []).map((r) => ({
      id: r.topic,
      label: labels[r.topic] ?? r.topic,
      count: Number(r.count),
    }));
    res.json({ data });
  } catch (err) {
    console.error("[Clusters] Top topics failed", err);
    res.status(500).json({ error: "Failed to get top topics" });
  }
});

router.get("/top", async (req: Request, res: Response) => {
  try {
    const limit = Math.min(100, parseInt(String(req.query.limit || 20), 10));
    const offset = parseInt(String(req.query.offset || 0), 10);
    const topicParam = req.query.topic;
    const topicIdsFromTopic = Array.isArray(topicParam)
      ? (topicParam as string[])
      : typeof topicParam === "string" && topicParam
        ? [topicParam]
        : [];
    const categoryParam = req.query.category;
    const categoryIds = Array.isArray(categoryParam)
      ? (categoryParam as string[])
      : typeof categoryParam === "string" && categoryParam
        ? [categoryParam]
        : [];
    let topicIdsFromCategory: string[] = [];
    if (categoryIds.length > 0) {
      const cats = await db
        .select({ topicIds: clusterCategories.topicIds })
        .from(clusterCategories)
        .where(inArray(clusterCategories.id, categoryIds));
      topicIdsFromCategory = [...new Set(cats.flatMap((c) => (c.topicIds ?? []) as string[]))];
    }
    const filterIds =
      topicIdsFromTopic.length > 0 || topicIdsFromCategory.length > 0
        ? [...new Set([...topicIdsFromTopic, ...topicIdsFromCategory])]
        : undefined;
    const teamParam = typeof req.query.team === "string" ? req.query.team : undefined;
    const competitionParam = typeof req.query.competition === "string" ? req.query.competition : undefined;
    const playerParam = typeof req.query.player === "string" ? req.query.player : undefined;
    const hoursParam = parseInt(String(req.query.hours || ""), 10);
    const publishedAfter =
      hoursParam > 0
        ? new Date(Date.now() - Math.min(hoursParam, 720) * 3600 * 1000)
        : undefined;
    const entityFilter =
      teamParam || competitionParam || playerParam
        ? { team: teamParam, competition: competitionParam, player: playerParam }
        : undefined;

    const { entityCond, topicCond, topicFilter } = buildClusterQueryConditions(
      filterIds,
      entityFilter,
      publishedAfter
    );

    const [countRes, clusters] = await Promise.all([
      entityCond
        ? db.execute<{ total: number }>(sql`
            WITH matching AS (
              SELECT DISTINCT sc.id
              FROM story_clusters sc
              CROSS JOIN LATERAL jsonb_array_elements_text(sc.article_ids) AS aid(elem)
              JOIN articles a ON a.id = aid.elem
              WHERE (${entityCond}) ${topicCond}
            )
            SELECT count(*)::int as total FROM matching
          `).then((r) => [r.rows?.[0] ?? { total: 0 }])
        : topicFilter
          ? db.select({ total: sql<number>`count(*)::int` }).from(storyClusters).where(topicFilter)
          : db.select({ total: sql<number>`count(*)::int` }).from(storyClusters),
      ranking.getTopClusters(limit + offset, undefined, filterIds, entityFilter, publishedAfter),
    ]);
    const total = Number(countRes[0]?.total ?? 0);
    const clustersPage = clusters.slice(offset, offset + limit);
    const clusterIds = clustersPage.map((c) => c.id);
    const allArticleIds = [...new Set(clustersPage.flatMap((c) => c.articleIds ?? []))];

    const draftCounts =
      clusterIds.length > 0
        ? await db
            .select({
              storyClusterId: drafts.storyClusterId,
              count: sql<number>`count(*)::int`,
            })
            .from(drafts)
            .where(inArray(drafts.storyClusterId, clusterIds))
            .groupBy(drafts.storyClusterId)
        : [];
    const draftCountMap = Object.fromEntries(
      draftCounts.map((d) => [d.storyClusterId, d.count])
    );

    const arts =
      allArticleIds.length > 0
        ? await db
            .select({
              id: articles.id,
              title: articles.title,
              source: articles.source,
              publishedAt: articles.publishedAt,
              url: articles.url,
              sourceTier: articles.sourceTier,
              teams: articles.teams,
              players: articles.players,
              competition: articles.competition,
              contentType: articles.contentType,
            })
            .from(articles)
            .where(inArray(articles.id, allArticleIds))
        : [];
    const artMap = Object.fromEntries(arts.map((a) => [a.id, a]));

    const enriched = await Promise.all(
      clustersPage.map(async (c) => {
        const articleIds = c.articleIds ?? [];
        const articleList = articleIds.map((aid) => artMap[aid]).filter(Boolean);
        const canonical = artMap[c.canonicalArticleId];
        const scoreDetail = await ranking.getScoreBreakdown(
          articleIds,
          c.canonicalArticleId,
          articleList
        );
        return {
          ...c,
          canonicalTitle: canonical?.title ?? null,
          draftCount: draftCountMap[c.id] ?? 0,
          scoreDetail,
          articles: articleList.map((a) => ({
            id: a.id,
            title: a.title,
            source: a.source,
            publishedAt: a.publishedAt,
            url: a.url,
          })),
        };
      })
    );
    res.json({ data: enriched, total });
  } catch (err) {
    console.error("[Clusters] List top failed", err);
    res.status(500).json({ error: "Failed to list clusters" });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const clusterId = req.params.id;
    const [cluster] = await db
      .select()
      .from(storyClusters)
      .where(eq(storyClusters.id, clusterId));

    if (!cluster) return res.status(404).json({ error: "Cluster not found" });

    const articleList = cluster.articleIds ?? [];
    const arts =
      articleList.length > 0
        ? await db
            .select({
              id: articles.id,
              title: articles.title,
              source: articles.source,
              publishedAt: articles.publishedAt,
              url: articles.url,
              sourceTier: articles.sourceTier,
              teams: articles.teams,
              players: articles.players,
              competition: articles.competition,
              contentType: articles.contentType,
            })
            .from(articles)
            .where(inArray(articles.id, articleList))
        : [];

    const canonical = arts.find((a) => a.id === cluster.canonicalArticleId) ?? arts[0];
    const scoreDetail = await ranking.getScoreBreakdown(
      articleList,
      cluster.canonicalArticleId,
      arts
    );
    const clusterDrafts = await db
      .select({
        id: drafts.id,
        headline: drafts.headline,
        status: drafts.status,
        format: drafts.format,
        createdAt: drafts.createdAt,
      })
      .from(drafts)
      .where(eq(drafts.storyClusterId, clusterId))
      .orderBy(desc(drafts.createdAt));

    const topicLabels = await getTopicLabelsRecord();
    const topicIds = (cluster.topicIds ?? []) as string[];

    res.json({
      id: cluster.id,
      score: cluster.score ?? 0,
      scoreDetail,
      topicIds,
      topicLabels: topicIds.map((tid) => ({ id: tid, label: topicLabels[tid] ?? tid })),
      articleIds: articleList,
      canonicalArticleId: cluster.canonicalArticleId,
      canonicalTitle: canonical?.title ?? null,
      articles: arts.map((a) => ({
        id: a.id,
        title: a.title,
        source: a.source,
        publishedAt: a.publishedAt,
        url: a.url,
      })),
      drafts: clusterDrafts.map((d) => ({
        id: d.id,
        headline: d.headline,
        status: d.status,
        format: d.format,
        createdAt: d.createdAt,
      })),
    });
  } catch (err) {
    console.error("[Clusters] Get cluster failed", req.params.id, err);
    res.status(500).json({ error: "Failed to get cluster" });
  }
});

export const clusterRoutes = router;
