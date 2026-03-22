import { Router, type Request, type Response } from "express";
import { sql, eq, desc, gte } from "drizzle-orm";
import { db } from "../../db/index.js";
import { articles, storyClusters, drafts, sources, posts, ingestRuns } from "../../db/index.js";

const router = Router();

router.get("/articles-by-day", async (req: Request, res: Response) => {
  try {
    const days = Math.min(90, Math.max(1, parseInt(String(req.query.days || 7), 10) || 7));
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const rows = await db
      .select({
        date: sql<string>`date(${articles.publishedAt})::text`,
        count: sql<number>`count(*)::int`,
      })
      .from(articles)
      .where(gte(articles.publishedAt, cutoff))
      .groupBy(sql`date(${articles.publishedAt})`)
      .orderBy(sql`date(${articles.publishedAt})`);
    const countByDate = new Map(rows.map((r) => [r.date?.slice(0, 10) ?? "", Number(r.count)]));
    const data: { date: string; count: number }[] = [];
    const start = new Date(cutoff);
    const end = new Date();
    for (let t = start.getTime(); t <= end.getTime(); t += 86400000) {
      const key = new Date(t).toISOString().slice(0, 10);
      data.push({ date: key, count: countByDate.get(key) ?? 0 });
    }
    res.json({ data });
  } catch (err) {
    console.error("[Stats] Articles by day failed", err);
    res.status(500).json({ error: "Failed to get articles by day" });
  }
});

router.get("/", async (_req: Request, res: Response) => {
  try {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [a, c, d, s, p, pending, approved, sEnabled, clustersWoDraft, a24h, c24h, p24h, lastRun] =
      await Promise.all([
        db.select({ count: sql<number>`count(*)::int` }).from(articles),
        db.select({ count: sql<number>`count(*)::int` }).from(storyClusters),
        db.select({ count: sql<number>`count(*)::int` }).from(drafts),
        db.select({ count: sql<number>`count(*)::int` }).from(sources),
        db.select({ count: sql<number>`count(*)::int` }).from(posts),
        db.select({ count: sql<number>`count(*)::int` }).from(drafts).where(eq(drafts.status, "pending")),
        db.select({ count: sql<number>`count(*)::int` }).from(drafts).where(eq(drafts.status, "approved")),
        db.select({ count: sql<number>`count(*)::int` }).from(sources).where(eq(sources.enabled, true)),
        (async () => {
          const [totalClusters, withDraft] = await Promise.all([
            db.select({ count: sql<number>`count(*)::int` }).from(storyClusters),
            db
              .select({ count: sql<number>`count(distinct ${drafts.storyClusterId})::int` })
              .from(drafts)
              .where(sql`${drafts.storyClusterId} IS NOT NULL`),
          ]);
          const total = Number(totalClusters[0]?.count ?? 0);
          const withD = Number(withDraft[0]?.count ?? 0);
          return [{ count: Math.max(0, total - withD) }];
        })(),
        db.select({ count: sql<number>`count(*)::int` }).from(articles).where(gte(articles.createdAt, since24h)),
        db.select({ count: sql<number>`count(*)::int` }).from(storyClusters).where(gte(storyClusters.createdAt, since24h)),
        db.select({ count: sql<number>`count(*)::int` }).from(posts).where(gte(posts.createdAt, since24h)),
        db.select().from(ingestRuns).orderBy(desc(ingestRuns.startedAt)).limit(1),
      ]);

    const run = lastRun[0];
    const lastIngestRun =
      run != null
        ? {
            id: run.id,
            status: run.status,
            startedAt: run.startedAt?.toISOString() ?? "",
            finishedAt: run.finishedAt?.toISOString() ?? undefined,
            articlesFetched: run.articlesFetched ?? undefined,
            clustersCreated: run.clustersCreated ?? undefined,
            error: run.error ?? undefined,
          }
        : undefined;

    res.json({
      articles: Number(a[0]?.count ?? 0),
      clusters: Number(c[0]?.count ?? 0),
      drafts: Number(d[0]?.count ?? 0),
      draftsPending: Number(pending[0]?.count ?? 0),
      draftsApproved: Number(approved[0]?.count ?? 0),
      sources: Number(s[0]?.count ?? 0),
      posts: Number(p[0]?.count ?? 0),
      sourcesEnabled: Number(sEnabled[0]?.count ?? 0),
      clustersWithoutDraft: Number(clustersWoDraft[0]?.count ?? 0),
      articlesLast24h: Number(a24h[0]?.count ?? 0),
      clustersLast24h: Number(c24h[0]?.count ?? 0),
      postsLast24h: Number(p24h[0]?.count ?? 0),
      lastIngestRun,
    });
  } catch (err) {
    console.error("[Stats] Get stats failed", err);
    res.status(500).json({ error: "Failed to get stats" });
  }
});

export const statsRoutes = router;
