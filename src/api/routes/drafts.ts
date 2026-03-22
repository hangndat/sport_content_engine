import { Router } from "express";
import { db, drafts, articles, storyClusters } from "../../db/index.js";
import { eq, ne, desc, inArray, sql, and, asc } from "drizzle-orm";
import {
  createDraftFromCluster,
  type CreateDraftOptions,
  type CreateDraftStreamEvent,
} from "../../agents/index.js";
import type { ContentFormatType } from "../../types/index.js";
import { rewriteDraft, rewriteDraftStream } from "../../agents/RewriteAgent.js";
import { RankingService } from "../../services/RankingService.js";
import { getTopicLabelsRecord } from "../../services/TopicService.js";
import { clusterCategories } from "../../db/index.js";

const router = Router();
const ranking = new RankingService();

router.get("/clusters/categories", async (_req, res) => {
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
    res.status(500).json({ error: "Failed to list cluster categories" });
  }
});

router.get("/clusters/topics", async (_req, res) => {
  try {
    const labels = await getTopicLabelsRecord();
    const topics = Object.entries(labels).map(([id, label]) => ({ id, label }));
    res.json({ data: topics });
  } catch (err) {
    res.status(500).json({ error: "Failed to list topics" });
  }
});

router.get("/clusters/top-topics", async (req, res) => {
  try {
    const limit = Math.min(20, parseInt(String(req.query.limit || 10), 10) || 10);
    const rows = await db
      .select({
        topic: storyClusters.topic,
        count: sql<number>`count(*)::int`,
      })
      .from(storyClusters)
      .where(and(ne(storyClusters.topic, "other"), sql`${storyClusters.topic} IS NOT NULL`))
      .groupBy(storyClusters.topic)
      .orderBy(sql`count(*) desc`)
      .limit(limit);
    const labels = await getTopicLabelsRecord();
    const data = rows.map((r) => ({ id: r.topic!, label: labels[r.topic!] ?? r.topic, count: Number(r.count) }));
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: "Failed to get top topics" });
  }
});

router.get("/clusters/top", async (req, res) => {
  try {
    const limit = Math.min(100, parseInt(String(req.query.limit || 20), 10));
    const offset = parseInt(String(req.query.offset || 0), 10);
    const topic = req.query.topic as string | undefined;
    const categoryId = req.query.category as string | undefined;
    let topicIds: string[] | undefined;
    if (categoryId) {
      const [cat] = await db
        .select()
        .from(clusterCategories)
        .where(eq(clusterCategories.id, categoryId));
      topicIds = cat ? ((cat.topicIds ?? []) as string[]) : undefined;
    }
    const filterIds = topic ? [topic] : topicIds;
    const [countRes, clusters] = await Promise.all([
      filterIds && filterIds.length > 0
        ? db.select({ total: sql<number>`count(*)::int` }).from(storyClusters).where(inArray(storyClusters.topic, filterIds))
        : db.select({ total: sql<number>`count(*)::int` }).from(storyClusters),
      ranking.getTopClusters(limit + offset, topic, topicIds),
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
            .select({ id: articles.id, title: articles.title, source: articles.source, publishedAt: articles.publishedAt, url: articles.url })
            .from(articles)
            .where(inArray(articles.id, allArticleIds))
        : [];
    const artMap = Object.fromEntries(arts.map((a) => [a.id, a]));

    const enriched = clustersPage.map((c) => {
      const articleList = (c.articleIds ?? []).map((aid) => artMap[aid]).filter(Boolean);
      const canonical = artMap[c.canonicalArticleId];
      return {
        ...c,
        canonicalTitle: canonical?.title ?? null,
        draftCount: draftCountMap[c.id] ?? 0,
        articles: articleList.map((a) => ({
          id: a.id,
          title: a.title,
          source: a.source,
          publishedAt: a.publishedAt,
          url: a.url,
        })),
      };
    });
    res.json({ data: enriched, total });
  } catch (err) {
    res.status(500).json({ error: "Failed to list clusters" });
  }
});

router.get("/clusters/:id", async (req, res) => {
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
            })
            .from(articles)
            .where(inArray(articles.id, articleList))
        : [];

    const canonical = arts.find((a) => a.id === cluster.canonicalArticleId) ?? arts[0];
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

    res.json({
      id: cluster.id,
      score: cluster.score ?? 0,
      topic: cluster.topic,
      topicLabel: cluster.topic ? topicLabels[cluster.topic] ?? cluster.topic : null,
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
    res.status(500).json({ error: "Failed to get cluster" });
  }
});

router.get("/", async (req, res) => {
  try {
    const limit = Math.min(100, parseInt(String(req.query.limit || 20), 10));
    const offset = parseInt(String(req.query.offset || 0), 10);
    const status = req.query.status as string | undefined;
    const format = req.query.format as string | undefined;

    const conditions = [];
    if (status) conditions.push(eq(drafts.status, status));
    if (format) conditions.push(eq(drafts.format, format));
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countRes, list] = await Promise.all([
      db
        .select({ total: sql<number>`count(*)::int` })
        .from(drafts)
        .where(whereClause ?? sql`1=1`),
      db
        .select()
        .from(drafts)
        .where(whereClause ?? sql`1=1`)
        .orderBy(desc(drafts.createdAt))
        .limit(limit)
        .offset(offset),
    ]);
    res.json({ data: list, total: Number(countRes[0]?.total ?? 0) });
  } catch (err) {
    res.status(500).json({ error: "Failed to list drafts" });
  }
});

router.get("/:id", async (req, res) => {
  const [draft] = await db
    .select()
    .from(drafts)
    .where(eq(drafts.id, req.params.id));

  if (!draft) return res.status(404).json({ error: "Draft not found" });
  res.json(draft);
});

router.post("/from-cluster/:clusterId", async (req, res) => {
  const streamMode = req.query.stream === "1" || req.headers.accept?.includes("text/event-stream");

  const buildOptions = (): CreateDraftOptions | undefined => {
    const { format, tone, instruction } = req.body as {
      format?: string;
      tone?: string;
      instruction?: string;
    };
    const allowedFormats: ContentFormatType[] = ["short_hot", "quick_summary", "debate", "data_stat", "schedule_recap"];
    const allowedTones = ["neutral", "humorous", "fan_light", "debate_hot", "news_style"];
    return format || tone || instruction
      ? {
          ...(format && allowedFormats.includes(format as ContentFormatType) && { format: format as ContentFormatType }),
          ...(tone && allowedTones.includes(tone) && { tone: tone as CreateDraftOptions["tone"] }),
          ...(instruction && typeof instruction === "string" && { instruction: instruction.trim() }),
        }
      : undefined;
  };

  if (streamMode) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    const send = (ev: CreateDraftStreamEvent) => {
      res.write(`data: ${JSON.stringify(ev)}\n\n`);
      (res as unknown as { flush?: () => void }).flush?.();
    };

    try {
      const draftId = await createDraftFromCluster(
        req.params.clusterId,
        buildOptions() as CreateDraftOptions | undefined,
        send
      );
      send({ t: "done", ok: true, draftId });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create draft";
      send({ t: "done", ok: false, error: msg });
    } finally {
      res.end();
    }
    return;
  }

  try {
    const options = buildOptions() as CreateDraftOptions | undefined;
    const draftId = await createDraftFromCluster(req.params.clusterId, options);
    res.json({ ok: true, draftId });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Failed to create draft",
    });
  }
});

router.post("/:id/approve", async (req, res) => {
  try {
    await db
      .update(drafts)
      .set({ status: "approved", updatedAt: new Date() })
      .where(eq(drafts.id, req.params.id));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to approve" });
  }
});

router.post("/:id/reject", async (req, res) => {
  try {
    await db
      .update(drafts)
      .set({ status: "rejected", updatedAt: new Date() })
      .where(eq(drafts.id, req.params.id));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to reject" });
  }
});

router.patch("/:id", async (req, res) => {
  const { headline, content, tone } = req.body as {
    headline?: string;
    content?: string;
    tone?: string;
  };

  const allowedTones = ["neutral", "humorous", "fan_light", "debate_hot", "news_style"];
  const updates: Record<string, unknown> = { updatedAt: new Date() };

  if (headline != null && typeof headline === "string" && headline.trim()) {
    updates.headline = headline.trim();
  }
  if (content != null && typeof content === "string") {
    updates.content = content;
  }
  if (tone != null && allowedTones.includes(tone)) {
    updates.tone = tone;
  }

  const hasUpdate = "headline" in updates || "content" in updates || "tone" in updates;
  if (!hasUpdate) {
    return res.status(400).json({ error: "Provide at least one of: headline, content, tone" });
  }

  const [draft] = await db.select().from(drafts).where(eq(drafts.id, req.params.id));
  if (!draft) return res.status(404).json({ error: "Draft not found" });

  await db
    .update(drafts)
    .set(updates as Record<string, unknown>)
    .where(eq(drafts.id, req.params.id));
  res.json({ ok: true });
});

router.post("/:id/rewrite", async (req, res) => {
  const streamMode = req.query.stream === "1" || req.headers.accept?.includes("text/event-stream");

  try {
    const { instruction } = req.body as { instruction?: string };
    const inst = typeof instruction === "string" ? instruction.trim() || undefined : undefined;

    const [draft] = await db.select().from(drafts).where(eq(drafts.id, req.params.id));
    if (!draft) return res.status(404).json({ error: "Draft not found" });

    const input = {
      headline: draft.headline,
      content: draft.content,
      summary: draft.summary ?? "",
      instruction: inst,
    };

    if (streamMode) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders?.();

      const send = (ev: unknown) => {
        res.write(`data: ${JSON.stringify(ev)}\n\n`);
        (res as unknown as { flush?: () => void }).flush?.();
      };

      try {
        const result = await rewriteDraftStream(input, send);
        await db
          .update(drafts)
          .set({
            headline: result.headline,
            content: result.content,
            updatedAt: new Date(),
          })
          .where(eq(drafts.id, req.params.id));
        send({ t: "done", ok: true, headline: result.headline, content: result.content });
      } catch (e) {
        send({
          t: "done",
          ok: false,
          error: e instanceof Error ? e.message : "Rewrite failed",
        });
      } finally {
        res.end();
      }
      return;
    }

    const result = await rewriteDraft(input);

    await db
      .update(drafts)
      .set({
        headline: result.headline,
        content: result.content,
        updatedAt: new Date(),
      })
      .where(eq(drafts.id, req.params.id));

    res.json({ ok: true, headline: result.headline, content: result.content });
  } catch (err) {
    console.error("[Draft] Rewrite failed", req.params.id, err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Rewrite failed",
    });
  }
});

router.post("/:id/select-variant", async (req, res) => {
  const { variant } = req.body as { variant?: string };
  const allowed = ["short_hot", "quick_summary", "debate", "data_stat", "schedule_recap"];
  if (!variant || !allowed.includes(variant)) {
    return res.status(400).json({ error: `variant required: ${allowed.join(" | ")}` });
  }

  const [draft] = await db.select().from(drafts).where(eq(drafts.id, req.params.id));
  if (!draft) return res.status(404).json({ error: "Draft not found" });

  const variants = draft.variants ?? {};
  const newContent = variants[variant];
  if (!newContent) return res.status(400).json({ error: `Variant "${variant}" not found` });

  await db
    .update(drafts)
    .set({ content: newContent, format: variant, updatedAt: new Date() })
    .where(eq(drafts.id, req.params.id));
  res.json({ ok: true, content: newContent });
});

export const draftRoutes = router;
