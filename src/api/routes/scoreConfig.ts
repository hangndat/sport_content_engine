import { Router } from "express";
import { db, scoreConfig, storyClusters, articles } from "../../db/index.js";
import { eq, inArray } from "drizzle-orm";
import { getScoreConfig, clearScoreConfigCache, DEFAULT_PAYLOAD } from "../../lib/scoreConfig.js";
import type { ScoreConfigPayload } from "../../db/schema.js";
import { RankingService } from "../../services/RankingService.js";

const router = Router();
const ranking = new RankingService();

router.get("/", async (_req, res) => {
  try {
    const config = await getScoreConfig();
    res.json(config);
  } catch (err) {
    console.error("[ScoreConfig] Get failed", err);
    res.status(500).json({ error: "Failed to get config" });
  }
});

router.patch("/", async (req, res) => {
  try {
    const body = req.body as Partial<{
      tierWeights: Record<string, number>;
      freshnessHours: number;
      confirmMaxArticles: number;
      confirmMultiplier: number;
      viralBonusCap: number;
      viralHotEntityMax: number;
      viralCompetitionBonus: number;
      viralContentTypeBonus: Record<string, number>;
      viralCrossSourceBonus: Record<string, number>;
    }>;

    const [existing] = await db
      .select()
      .from(scoreConfig)
      .where(eq(scoreConfig.id, "default"));

    const current = (existing?.payload ?? DEFAULT_PAYLOAD) as ScoreConfigPayload;
    const merged: ScoreConfigPayload = { ...current };
    if (body.tierWeights) merged.tierWeights = { ...current.tierWeights, ...body.tierWeights };
    if (body.freshnessHours != null) merged.freshnessHours = body.freshnessHours;
    if (body.confirmMaxArticles != null) merged.confirmMaxArticles = body.confirmMaxArticles;
    if (body.confirmMultiplier != null) merged.confirmMultiplier = body.confirmMultiplier;
    if (body.viralBonusCap != null) merged.viralBonusCap = body.viralBonusCap;
    if (body.viralHotEntityMax != null) merged.viralHotEntityMax = body.viralHotEntityMax;
    if (body.viralCompetitionBonus != null) merged.viralCompetitionBonus = body.viralCompetitionBonus;
    if (body.viralContentTypeBonus) merged.viralContentTypeBonus = { ...current.viralContentTypeBonus, ...body.viralContentTypeBonus };
    if (body.viralCrossSourceBonus) merged.viralCrossSourceBonus = { ...current.viralCrossSourceBonus, ...body.viralCrossSourceBonus };

    if (existing) {
      await db
        .update(scoreConfig)
        .set({ payload: merged, updatedAt: new Date() })
        .where(eq(scoreConfig.id, "default"));
    } else {
      await db.insert(scoreConfig).values({
        id: "default",
        payload: merged,
        updatedAt: new Date(),
      });
    }

    clearScoreConfigCache();
    const config = await getScoreConfig();
    res.json(config);
  } catch (err) {
    console.error("[ScoreConfig] Update failed", err);
    res.status(500).json({ error: "Failed to update config" });
  }
});

/** Tính lại điểm tất cả cluster, trả về danh sách thay đổi */
router.post("/rescore", async (_req, res) => {
  try {
    const clusters = await db
      .select({
        id: storyClusters.id,
        score: storyClusters.score,
        canonicalArticleId: storyClusters.canonicalArticleId,
      })
      .from(storyClusters);

    const total = clusters.length;
    if (total === 0) {
      return res.json({
        total: 0,
        changed: 0,
        unchanged: 0,
        errors: 0,
        changes: [],
      });
    }

    const canonicalIds = [...new Set(clusters.map((c) => c.canonicalArticleId).filter(Boolean))];
    const arts =
      canonicalIds.length > 0
        ? await db
            .select({ id: articles.id, title: articles.title })
            .from(articles)
            .where(inArray(articles.id, canonicalIds))
        : [];
    const titleMap = Object.fromEntries(arts.map((a) => [a.id, a.title]));

    const changes: {
      clusterId: string;
      canonicalTitle: string;
      oldScore: number;
      newScore: number;
      delta: number;
    }[] = [];
    let errCount = 0;

    for (const c of clusters) {
      const oldScore = c.score ?? 0;
      try {
        const newScore = await ranking.scoreCluster(c.id);
        if (newScore !== oldScore) {
          changes.push({
            clusterId: c.id,
            canonicalTitle: titleMap[c.canonicalArticleId] ?? "(không có tiêu đề)",
            oldScore,
            newScore,
            delta: newScore - oldScore,
          });
        }
      } catch {
        errCount++;
      }
    }

    changes.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

    res.json({
      total,
      changed: changes.length,
      unchanged: total - changes.length - errCount,
      errors: errCount,
      changes: changes.slice(0, 200),
    });
  } catch (err) {
    console.error("[ScoreConfig] Rescore failed", err);
    res.status(500).json({ error: "Failed to rescore clusters" });
  }
});

export const scoreConfigRoutes = router;
