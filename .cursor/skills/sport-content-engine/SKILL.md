---
name: sport-content-engine
description: Domain knowledge for Sport Content Editorial System. Use when building crawlers, ingestion pipeline, AI agents, connectors, dedup, ranking, or Facebook publishing in this project.
---

# Sport Content Engine – Domain Skill

## 1. Input Sources (Tier)

- **Tier 1**: Chính thức (website CLB, giải đấu, API thể thao)
- **Tier 2**: Báo lớn, nhà báo uy tín
- **Tier 3**: Cộng đồng, rumor – chỉ gợi ý chủ đề, không post thẳng

Mỗi nguồn: `id`, `type` (rss|scraper|api|social), `tier`, `url`, `rateLimitMinutes`, `enabled`

## 2. Schema

**UnifiedArticle**: `id`, `source`, `sourceTier`, `url`, `title`, `content`, `publishedAt`, `language`, `teams[]`, `players[]`, `competition`, `contentType` (news|result|rumor|stats|opinion), `rawPayload?`

**StoryCluster**: gom articles trùng lặp; có `hashKey`, `score`, `articleIds[]`, `canonicalArticleId`

**AIDraftOutput**: `headline`, `summary`, `confidenceScore`, `sourceList`, `teams`, `players`, `ctaComment`, `recommendedImageQuery`, `publishPriority`, `format`

## 3. Pipeline: Fetch → Normalize → Deduplicate → Rank → Enrich

- **Dedup hash**: `normalizeTitle(title) + sorted(teams|players) + floorTimestamp(publishedAt, 1h)`
- **Rank**: freshness, source tier, hot entities, confirmation count
- **Enrich**: teams, players, sentiment, confidence

## 4. AI Agents

1. Fact extractor → facts, entities, confidence  
2. Angle selector → angle, format  
3. Content writer → variants (short, caption, carousel)  
4. Tone controller → điều chỉnh văn phong  
5. Guardrail → kiểm tra bịa đặt, rumor label

## 5. Content Formats

`short_hot` | `quick_summary` | `debate` | `data_stat` | `schedule_recap`

## 6. Moderation Modes

- **A**: Draft only – mọi bài chờ duyệt  
- **B**: Semi-auto – score cao + tier 1/2 → auto; rumor/tier 3 → chờ duyệt  
- **C**: Full auto whitelist – lịch, kết quả, BXH, thống kê

## 7. File Structure

```
src/connectors/   → IConnector, rss, scraper
src/services/     → Ingestion, Dedup, Ranking, Enrichment
src/agents/       → FactExtractor, ContentWriter, Guardrail
src/publishers/   → IPublisher, FacebookPublisher
src/api/          → routes: ingest, drafts, publish
```

## 8. Stack

Node/TypeScript, Drizzle, PostgreSQL, Redis, BullMQ, S3 (MinIO), OpenAI. Không dùng Elasticsearch.
