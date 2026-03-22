# Sport Content Editorial System – Plan

> Tất cả phase chính đã hoàn thành.

## Tổng quan

Hệ thống biên tập nội dung thể thao tự động có kiểm duyệt, với 6 lớp: Input sources phân tier, Ingestion pipeline, Multi-agent AI editorial, Content strategy, Auto-post với 3 chế độ kiểm duyệt, và Admin UI.

**Stack:** Node/TypeScript, n8n, PostgreSQL, Redis, S3 (MinIO), OpenAI.

## Phase đã hoàn thành

| Phase | Nội dung |
|-------|----------|
| 1 | Setup, DB schema, Redis, Connectors, Pipeline normalize + dedup + rank |
| 2 | AI agents (FactExtractor, ContentWriter, Guardrail, ToneController) |
| 3 | Moderation mode A, Draft queue, Facebook publisher, Admin UI cơ bản |
| 4 | Mode B semi-auto, Enrichment, AngleSelector, Semantic dedup |
| 5 | Mode C, A/B caption, performance tracking |
| 6 | Admin React + Ant Design Pro, Dockerfile, deploy |

## Phase 7 – Viral scoring ✓

| Bước | Nội dung |
|------|----------|
| 7.1 | lib/viralSignals.ts: hot entities, competition, contentType, cross-source bonuses ✓ |
| 7.2 | RankingService: gộp viral bonuses vào score, sửa confirmBonus (chỉ tính 1 lần/cluster) ✓ |
| 7.3 | AngleSelector: nhận cluster context → ưu tiên short_hot khi viral cao ✓ |
| 7.4 | createDraftFromCluster: publishPriority từ score + viral thay vì hardcode medium ✓ |
| 7.5 | scripts/backfill-cluster-scores.ts + npm run db:backfill-scores ✓ |

## Phase 8 – Dashboard Enhancement

Bổ sung metrics cho trang Tổng quan: crawl gần nhất, clusters chưa có draft, nguồn bật/tắt, subValue 24h.

→ Chi tiết: [plans/PLAN-DASHBOARD.md](./PLAN-DASHBOARD.md)

## Tài liệu

- [docs/architecture/](../docs/architecture/) – Kiến trúc chi tiết
- [docs/api/](../docs/api/) – API specification
- [docs/setup/](../docs/setup/) – Hướng dẫn setup môi trường
