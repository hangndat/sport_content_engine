import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { sql, eq, desc, gte } from "drizzle-orm";
import { db } from "../db/index.js";
import { articles, storyClusters, drafts, sources, posts, ingestRuns } from "../db/index.js";
import { getModerationMode } from "../lib/moderation.js";
import { ingestRoutes } from "./routes/ingest.js";
import { draftRoutes } from "./routes/drafts.js";
import { publishRoutes } from "./routes/publish.js";
import { sourcesRoutes } from "./routes/sources.js";
import { articlesRoutes } from "./routes/articles.js";
import { clusterCategoriesRoutes } from "./routes/clusterCategories.js";
import { topicsRoutes } from "./routes/topics.js";
import { topicRulesRoutes } from "./routes/topicRules.js";
import { writerHistoryRoutes } from "./routes/writerHistory.js";
import { gptWriterConfigRoutes } from "./routes/gptWriterConfig.js";
import { scoreConfigRoutes } from "./routes/scoreConfig.js";
import { TrendService } from "../services/TrendService.js";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/ingest", ingestRoutes);
app.use("/drafts", draftRoutes);
app.use("/publish", publishRoutes);
app.use("/sources", sourcesRoutes);
app.use("/articles", articlesRoutes);
app.use("/cluster-categories", clusterCategoriesRoutes);
app.use("/topics", topicsRoutes);
app.use("/topic-rules", topicRulesRoutes);
app.use("/writer-history", writerHistoryRoutes);
app.use("/config/gpt-writer", gptWriterConfigRoutes);
app.use("/config/score", scoreConfigRoutes);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const adminDist = path.join(__dirname, "../../admin/dist");

app.get("/", (_req, res) => res.redirect("/admin"));
app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.get("/config", (_req, res) => res.json({ moderationMode: getModerationMode() }));

app.get("/trends", async (req, res) => {
  try {
    const hours = Math.min(168, parseInt(String(req.query.hours || 24), 10) || 24);
    const limit = Math.min(20, parseInt(String(req.query.limit || 10), 10) || 10);
    const trends = await new TrendService().getTrends(hours, limit);
    res.json(trends);
  } catch (err) {
    res.status(500).json({ error: "Failed to get trends" });
  }
});

app.get("/trends/daily", async (req, res) => {
  try {
    const days = Math.min(30, parseInt(String(req.query.days || 7), 10) || 7);
    const limit = Math.min(15, parseInt(String(req.query.limit || 5), 10) || 5);
    const type = String(req.query.type || "all");
    const validType =
      type === "teams" || type === "players" || type === "competitions" ? type : "all";
    const data = await new TrendService().getTrendsByDay({
      days,
      limit,
      type: validType,
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to get daily trends" });
  }
});

app.get("/stats/articles-by-day", async (req, res) => {
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
    res.status(500).json({ error: "Failed to get articles by day" });
  }
});

app.get("/stats", async (_req, res) => {
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
    res.status(500).json({ error: "Failed to get stats" });
  }
});
app.use("/admin", express.static(adminDist, { index: false }));
app.get(/^\/admin(\/.*)?$/, (_req, res) => {
  res.sendFile(path.join(adminDist, "index.html"));
});

export async function startServer(): Promise<void> {
  const port = parseInt(process.env.PORT ?? "3000", 10);
  app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
  });
}
