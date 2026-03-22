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

## Tài liệu

- [docs/architecture/](../docs/architecture/) – Kiến trúc chi tiết
- [docs/api/](../docs/api/) – API specification
- [docs/setup/](../docs/setup/) – Hướng dẫn setup môi trường
