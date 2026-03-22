import { db, storyClusters, articles } from "../db/index.js";
import { eq, inArray } from "drizzle-orm";
import { inferTopics } from "../services/TopicService.js";
import { fetchArticleContent } from "../lib/articleFetcher.js";

export interface EnrichedCluster {
  id: string;
  articleIds: string[];
  canonicalArticleId: string;
  score: number;
  sourceTier: 1 | 2 | 3;
  contentType: string;
  teams: string[];
  players: string[];
  sourceList: string[];
  competition?: string;
  title: string;
  summary: string;
}

export interface EnrichClusterOptions {
  /** Khi true, fetch full nội dung từ URL bài canonical để có nhiều context hơn RSS. */
  fetchFullContent?: boolean;
}

export class EnrichmentService {
  async enrichCluster(
    clusterId: string,
    options?: EnrichClusterOptions
  ): Promise<EnrichedCluster | null> {
    const [cluster] = await db
      .select()
      .from(storyClusters)
      .where(eq(storyClusters.id, clusterId));

    if (!cluster) return null;

    const articleList = cluster.articleIds ?? [];
    if (articleList.length === 0) return null;

    const arts = await db
      .select()
      .from(articles)
      .where(inArray(articles.id, articleList));

    const teams = [...new Set(arts.flatMap((a) => a.teams ?? []))];
    const players = [...new Set(arts.flatMap((a) => a.players ?? []))];
    const sourceList = [...new Set(arts.map((a) => a.source).filter(Boolean))];
    const competitions = arts
      .map((a) => a.competition)
      .filter(Boolean) as string[];
    const competition = competitions[0];

    const allTopicIds = new Set<string>();
    for (const art of arts) {
      const tops = await inferTopics(art);
      for (const t of tops) allTopicIds.add(t);
    }
    const topicIds = allTopicIds.size > 0 ? [...allTopicIds] : ["other"];
    const canonical = arts.find((a) => a.id === cluster.canonicalArticleId) ?? arts[0];

    // Khi tạo draft, fetch full content từ URL để có nhiều context hơn mô tả RSS
    let summary = canonical.content.slice(0, 500);
    if (options?.fetchFullContent && canonical.url) {
      const fullContent = await fetchArticleContent(canonical.url);
      if (fullContent && fullContent.length > summary.length) {
        summary = fullContent;
      }
    }

    await db
      .update(storyClusters)
      .set({ enrichedAt: new Date(), topicIds })
      .where(eq(storyClusters.id, clusterId));

    return {
      id: cluster.id,
      articleIds: articleList,
      canonicalArticleId: cluster.canonicalArticleId,
      score: cluster.score ?? 0,
      sourceTier: (canonical.sourceTier as 1 | 2 | 3) ?? 2,
      contentType: canonical.contentType ?? "news",
      teams,
      players,
      sourceList,
      competition,
      title: canonical.title,
      summary,
    };
  }
}
