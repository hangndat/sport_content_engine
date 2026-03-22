import { createHash } from "crypto";
import { eq, inArray, gte } from "drizzle-orm";
import { db, articles, storyClusters } from "../db/index.js";
import { jaccardSimilarity } from "../lib/jaccard.js";
import { extractMatchScore } from "../lib/entityExtract.js";
import { getEmbeddingsForTitles, cosineSim } from "../lib/embedding.js";
import { hasOpenAIKey } from "../lib/openai.js";
import { inferTopics } from "../services/TopicService.js";

const TIME_WINDOW_HOURS = 24;
const USE_AI_CLUSTER = process.env.USE_AI_CLUSTER !== "false";
const JACCARD_THRESHOLD = 0.4;
const EMBEDDING_THRESHOLD = 0.85;
const CROSS_BATCH_DAYS = 14;
const MS_PER_HOUR = 3600 * 1000;

/** Chuẩn hóa teams để so sánh — tránh gom nhầm VN-Thái Lan vs VN-Malaysia */
function teamSetKey(teams: string[] | null | undefined): string | null {
  if (!teams || teams.length < 2) return null;
  return [...teams]
    .map((t) => t.toLowerCase().trim())
    .filter((t) => t.length >= 2)
    .sort()
    .join("|");
}

/** Nếu có tỷ số khác nhau hoặc cặp đội khác nhau → không gom (khác trận) */
function sameFootballMatch(
  a: { title: string; teams?: string[] | null },
  b: { title: string; teams?: string[] | null }
): boolean {
  const scoreA = extractMatchScore(a.title);
  const scoreB = extractMatchScore(b.title);
  if (scoreA != null && scoreB != null && scoreA !== scoreB) return false;

  const keyA = teamSetKey(a.teams);
  const keyB = teamSetKey(b.teams);
  if (keyA != null && keyB != null && keyA !== keyB) return false;

  return true;
}

const COMPETITION_ALIASES: Record<string, string> = {
  "v-league": "vleague",
  "v league": "vleague",
  "vleague": "vleague",
  "ngoại hạng anh": "premier",
  "premier league": "premier",
  "nha": "premier",
  "champions league": "c1",
  "c1": "c1",
  "europa league": "c2",
  "c2": "c2",
  "la liga": "laliga",
  "serie a": "seriea",
  "bundesliga": "bundesliga",
  "ligue 1": "ligue1",
  "aff cup": "aff",
  "world cup": "worldcup",
  "asian cup": "asiancup",
};

function normalizeCompetition(c: string): string {
  const key = c.toLowerCase().replace(/\s+/g, " ").trim();
  return COMPETITION_ALIASES[key] ?? key;
}

/** Cùng giải đấu hoặc không xác định — tránh gom NHA vs V-League, C1 vs Europa */
function sameCompetition(
  a: { competition?: string | null },
  b: { competition?: string | null }
): boolean {
  const ca = (a.competition ?? "").trim();
  const cb = (b.competition ?? "").trim();
  if (!ca || !cb || ca === "-" || cb === "-" || ca === "null" || cb === "null") return true;
  return normalizeCompetition(ca) === normalizeCompetition(cb);
}

/** ContentType tương thích — không gom result với opinion */
function compatibleContentType(
  a: { contentType?: string | null },
  b: { contentType?: string | null }
): boolean {
  const ta = (a.contentType ?? "news").toLowerCase();
  const tb = (b.contentType ?? "news").toLowerCase();
  if (ta === tb) return true;
  if ((ta === "result" && tb === "opinion") || (ta === "opinion" && tb === "result")) return false;
  return true; // news+result, news+opinion OK
}

/** Union-Find để gom cluster — ràng buộc toàn bộ group trong TIME_WINDOW */
class UnionFind {
  parent: Map<string, string>;
  /** min/max timestamp (ms) per root — tránh transitive gom "Lịch bóng đá hôm nay" nhiều ngày */
  timeBounds: Map<string, { min: number; max: number }>;
  getTime: (id: string) => number;
  maxSpanMs: number;

  constructor(
    ids: string[],
    getTime: (id: string) => number,
    maxSpanHours: number = TIME_WINDOW_HOURS
  ) {
    this.parent = new Map();
    this.timeBounds = new Map();
    this.getTime = getTime;
    this.maxSpanMs = maxSpanHours * MS_PER_HOUR;
    for (const id of ids) {
      this.parent.set(id, id);
      const t = getTime(id);
      this.timeBounds.set(id, { min: t, max: t });
    }
  }

  find(x: string): string {
    const p = this.parent.get(x)!;
    if (p !== x) this.parent.set(x, this.find(p));
    return this.parent.get(x)!;
  }

  union(a: string, b: string): boolean {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra === rb) return true;
    const ba = this.timeBounds.get(ra)!;
    const bb = this.timeBounds.get(rb)!;
    const ta = this.getTime(a);
    const tb = this.getTime(b);
    const newMin = Math.min(ba.min, bb.min, ta, tb);
    const newMax = Math.max(ba.max, bb.max, ta, tb);
    if (newMax - newMin > this.maxSpanMs) return false;
    this.parent.set(ra, rb);
    this.timeBounds.set(rb, { min: newMin, max: newMax });
    this.timeBounds.delete(ra);
    return true;
  }

  getGroups(): Map<string, string[]> {
    const groups = new Map<string, string[]>();
    for (const id of this.parent.keys()) {
      const root = this.find(id);
      const list = groups.get(root) ?? [];
      list.push(id);
      groups.set(root, list);
    }
    return groups;
  }
}

export type DedupResult = { clusterIds: string[]; newCount: number; updatedCount: number };

export class DedupService {
  async deduplicateAndSave(recentArticleIds: string[]): Promise<DedupResult> {
    if (recentArticleIds.length === 0) return { clusterIds: [], newCount: 0, updatedCount: 0 };

    const arts = await db
      .select({
        id: articles.id,
        title: articles.title,
        publishedAt: articles.publishedAt,
        teams: articles.teams,
        players: articles.players,
        competition: articles.competition,
        contentType: articles.contentType,
      })
      .from(articles)
      .where(inArray(articles.id, recentArticleIds));

    const cutoff = new Date(Date.now() - CROSS_BATCH_DAYS * 24 * MS_PER_HOUR);

    const existingClusters = await db
      .select()
      .from(storyClusters)
      .where(gte(storyClusters.createdAt, cutoff));

    const canonicalIds = existingClusters.map((c) => c.canonicalArticleId).filter(Boolean);
    const canonicalArts =
      canonicalIds.length > 0
        ? await db
            .select({
              id: articles.id,
              title: articles.title,
              publishedAt: articles.publishedAt,
              teams: articles.teams,
              competition: articles.competition,
              contentType: articles.contentType,
            })
            .from(articles)
            .where(inArray(articles.id, canonicalIds))
        : [];
    const canonicalMap = new Map(canonicalArts.map((a) => [a.id, a]));

    // Build id→publishedAt cho toàn bộ article trong existing clusters (để kiểm tra time span)
    const allClusterArticleIds = [...new Set(existingClusters.flatMap((c) => (c.articleIds ?? []) as string[]))];
    const clusterArticleRows =
      allClusterArticleIds.length > 0
        ? await db
            .select({ id: articles.id, publishedAt: articles.publishedAt })
            .from(articles)
            .where(inArray(articles.id, allClusterArticleIds))
        : [];
    const idToTime = new Map(clusterArticleRows.map((r) => [r.id, new Date(r.publishedAt).getTime()]));

    let embeddingMap = new Map<string, number[]>();
    if (USE_AI_CLUSTER && hasOpenAIKey()) {
      const byId = new Map<string, string>();
      for (const a of arts) byId.set(a.id, a.title);
      for (const a of canonicalArts) byId.set(a.id, a.title);
      const allForEmbed = Array.from(byId.entries()).map(([id, title]) => ({ id, title }));
      embeddingMap = await getEmbeddingsForTitles(allForEmbed);
    }

    const similar = (a: { id: string; title: string }, b: { id: string; title: string }): boolean => {
      const jaccard = jaccardSimilarity(a.title, b.title);
      const embA = embeddingMap.get(a.id);
      const embB = embeddingMap.get(b.id);
      if (embA && embB) {
        const cos = cosineSim(embA, embB);
        return (jaccard >= JACCARD_THRESHOLD || cos >= EMBEDDING_THRESHOLD);
      }
      return jaccard >= JACCARD_THRESHOLD;
    };

    const assigned = new Set<string>();
    const updatedClusterIds = new Set<string>();
    const toMerge: Map<string, string[]> = new Map();
    /** Time bounds đang build (cập nhật khi merge) để kiểm tra span cho article tiếp theo */
    const mergeTimeBounds = new Map<string, { min: number; max: number }>();

    for (const cluster of existingClusters) {
      const canonical = canonicalMap.get(cluster.canonicalArticleId);
      if (!canonical) continue;

      const clusterIds = (cluster.articleIds ?? []) as string[];
      const clusterTimes = clusterIds.map((id) => idToTime.get(id)).filter((t): t is number => t != null);
      let clusterMin = clusterTimes.length > 0 ? Math.min(...clusterTimes) : 0;
      let clusterMax = clusterTimes.length > 0 ? Math.max(...clusterTimes) : 0;

      for (const art of arts) {
        const bounds = mergeTimeBounds.get(cluster.id);
        if (bounds) {
          clusterMin = bounds.min;
          clusterMax = bounds.max;
        }
        if (assigned.has(art.id)) continue;
        if (clusterIds.includes(art.id)) {
          assigned.add(art.id);
          continue;
        }
        const artTime = new Date(art.publishedAt).getTime();
        const newMin = Math.min(clusterMin, artTime);
        const newMax = Math.max(clusterMax, artTime);
        const okTime = newMax - newMin <= TIME_WINDOW_HOURS * MS_PER_HOUR;
        const okMatch = sameFootballMatch(art, canonical);
        const okCompetition = sameCompetition(art, canonical);
        const okContentType = compatibleContentType(art, canonical);
        if (similar(art, canonical) && okTime && okMatch && okCompetition && okContentType) {
          const list = toMerge.get(cluster.id) ?? [...(cluster.articleIds ?? [])];
          if (!list.includes(art.id)) list.push(art.id);
          toMerge.set(cluster.id, list);
          mergeTimeBounds.set(cluster.id, { min: newMin, max: newMax });
          assigned.add(art.id);
          updatedClusterIds.add(cluster.id);
        }
      }
    }

    for (const [clusterId, mergedIds] of toMerge) {
      const mergedArts = await db.select().from(articles).where(inArray(articles.id, mergedIds));
      const allTopicIds = new Set<string>();
      for (const art of mergedArts) {
        const tops = await inferTopics(art);
        for (const t of tops) allTopicIds.add(t);
      }
      const topicIds = allTopicIds.size > 0 ? [...allTopicIds] : ["other"];
      await db.update(storyClusters).set({ articleIds: mergedIds, topicIds }).where(eq(storyClusters.id, clusterId));
    }

    const unmatched = arts.filter((a) => !assigned.has(a.id));
    if (unmatched.length === 0) {
      return {
        clusterIds: [...updatedClusterIds],
        newCount: 0,
        updatedCount: toMerge.size,
      };
    }

    const artsById = new Map(unmatched.map((a) => [a.id, a]));
    const getTime = (id: string) => new Date(artsById.get(id)!.publishedAt).getTime();
    const uf = new UnionFind(unmatched.map((a) => a.id), getTime);
    for (let i = 0; i < unmatched.length; i++) {
      for (let j = i + 1; j < unmatched.length; j++) {
        const a = unmatched[i]!;
        const b = unmatched[j]!;
        const okMatch = sameFootballMatch(a, b);
        const okCompetition = sameCompetition(a, b);
        const okContentType = compatibleContentType(a, b);
        if (similar(a, b) && okMatch && okCompetition && okContentType && uf.union(a.id, b.id)) {
          /* union đã kiểm tra time span nội bộ */
        }
      }
    }

    const newGroups = uf.getGroups();
    let newCount = 0;
    for (const [rootId, ids] of newGroups) {
      if (ids.length === 0) continue;
      const sorted = [...ids].sort();
      const canonicalId = sorted[0]!;
      const clusterArts = sorted.map((id) => artsById.get(id)).filter(Boolean);
      const allTopicIds = new Set<string>();
      for (const art of clusterArts) {
        if (art) {
          const tops = await inferTopics(art);
          for (const t of tops) allTopicIds.add(t);
        }
      }
      const topicIds = allTopicIds.size > 0 ? [...allTopicIds] : ["other"];
      const hashKey = `fuzzy-${createHash("sha256").update(sorted.join(",")).digest("hex").slice(0, 24)}`;
      const clusterId = `cluster-${hashKey}`;

      await db
        .insert(storyClusters)
        .values({
          id: clusterId,
          hashKey,
          articleIds: ids,
          canonicalArticleId: canonicalId,
          score: 0,
          topicIds,
        })
        .onConflictDoUpdate({
          target: storyClusters.hashKey,
          set: {
            articleIds: ids,
            canonicalArticleId: canonicalId,
            topicIds,
          },
        });
      updatedClusterIds.add(clusterId);
      newCount++;
    }

    const updatedCount = toMerge.size;
    return {
      clusterIds: [...updatedClusterIds],
      newCount,
      updatedCount,
    };
  }
}
