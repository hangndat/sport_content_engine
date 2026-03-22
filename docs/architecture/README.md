# Architecture – Sport Content Engine

## 1. Tổng quan

Hệ thống gồm 6 lớp chính:

1. **Input sources** – Phân tier (Tier 1–3), RSS / scraper / API
2. **Ingestion pipeline** – Fetch → Normalize → Save → Dedup → Score
3. **AI editorial agents** – FactExtractor, AngleSelector, ContentWriter, ToneController, Guardrail
4. **Content strategy** – Format (short_hot, quick_summary, debate, data_stat, schedule_recap)
5. **Moderation** – Chế độ A (chờ duyệt) / B (bán tự động) / C (tự động whitelist)
6. **Publishing** – Facebook Page API

## 2. Data flow

```
Sources (DB) → Connectors (RSS/Scraper)
    → UnifiedArticle
    → Save (articles table)
    → DedupService (Jaccard + time window 24h, cross-batch 14d)
    → StoryCluster
    → RankingService (score)
    → EnrichmentService (teams, players, sources)
    → AI pipeline (extract → angle → write → guardrail)
    → Draft (pending → approved)
    → FacebookPublisher → Post
```

## 3. Schema chính

| Bảng | Mô tả |
|------|-------|
| `sources` | Nguồn tin (id, type, tier, url, rateLimitMinutes, enabled) |
| `articles` | Bài đã crawl (url, title, content, teams, players, competition, publishedAt) |
| `story_clusters` | Cluster gom bài trùng (hashKey, score, articleIds, canonicalArticleId) |
| `drafts` | Bản nháp (headline, content, tone, format, status, storyClusterId) |
| `posts` | Bài đã đăng (draftId, platform, publishedAt) |
| `ingest_runs` | Lịch sử crawl (status, steps, articlesFetched, clustersCreated) |

## 4. Module structure

```
src/connectors/   → IConnector (rss.ts, scraper.ts)
src/services/     → IngestionService, DedupService, RankingService,
                   EnrichmentService, TrendService
src/agents/       → FactExtractor, AngleSelector, ContentWriter,
                   ToneController, Guardrail, RewriteAgent
src/publishers/   → IPublisher (FacebookPublisher)
src/api/          → Express routes (ingest, drafts, publish, sources, articles...)
src/lib/          → entityExtract, jaccard, openai, s3, embedding, topicInfer
```

## 5. Connectors

- **RssConnector**: Parse RSS XML, extract title, link, content, pubDate; gọi `entityExtract` từ title
- **ScraperConnector**: Fetch HTML, parse với Cheerio (override per source nếu cần)

## 6. Dedup logic

- **Time window**: 24h (cùng ngày)
- **Similarity**: Jaccard 1-gram + 2-gram ≥ 0.4, hoặc embedding cosine ≥ 0.85
- **Same match**: `sameFootballMatch()` – tỷ số + cặp đội khớp
- **Same competition**: Không gom khi competition khác nhau (V-League vs C1)
- **ContentType**: `compatibleContentType()` – result + opinion không gom
- **Cross-batch**: So khớp bài mới với clusters 14 ngày gần nhất

## 7. AI pipeline

1. **FactExtractor** – Trích facts, entities, confidence, sourceList
2. **AngleSelector** – Chọn format phù hợp
3. **ContentWriter** – Tạo variants (short_hot, quick_summary, debate, data_stat, schedule_recap)
4. **ToneController** – Điều chỉnh văn phong (formal, casual, …)
5. **Guardrail** – Kiểm tra bịa đặt, rumor label

## 8. Moderation modes

| Mode | Mô tả |
|------|-------|
| A | Mọi draft chờ duyệt |
| B | Score cao + tier 1/2 + không rumor → auto approve |
| C | Whitelist (lịch, kết quả, BXH, thống kê) → auto approve |

## 9. Stack

- **Runtime**: Node.js 20+
- **Language**: TypeScript (ESM)
- **DB**: PostgreSQL 16, Drizzle ORM
- **Queue**: BullMQ, Redis
- **Storage**: S3 (MinIO self-host)
- **AI**: OpenAI (gpt-4o-mini)
