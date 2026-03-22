# API Specification

Base URL: `/` (mặc định `http://localhost:3000`)

## Core

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/` | Redirect → /admin |
| GET | `/health` | Health check → `{ status: "ok" }` |
| GET | `/config` | Config → `{ moderationMode: "A" \| "B" \| "C" }` |
| GET | `/admin`, `/admin/*` | Admin UI (SPA) |

## Stats & Trends

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/stats` | Thống kê: articles, clusters, drafts, sources, posts, draftsPending, draftsApproved |
| GET | `/trends` | Trend 24h (query: `hours`, `limit`) – teams, players, competitions |
| GET | `/trends/daily` | Biến động trend theo ngày (query: `days`, `limit`, `type`) |

## Ingest

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/ingest/runs` | Lịch sử crawl (query: limit, offset) |
| POST | `/ingest/fetch` | Kích hoạt crawl thủ công |

## Articles

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/articles` | Danh sách bài (query: limit, offset) |
| GET | `/articles/:id` | Chi tiết 1 bài |

## Drafts

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/drafts` | Danh sách drafts (query: status, format, limit, offset) |
| GET | `/drafts/:id` | Chi tiết draft |
| GET | `/drafts/clusters/top` | Top story clusters (query: limit) |
| GET | `/drafts/clusters/top-topics` | Top clusters theo topic |
| GET | `/drafts/clusters/topics` | Clusters theo topic |
| GET | `/drafts/clusters/categories` | Clusters theo category |
| GET | `/drafts/clusters/:id` | Chi tiết cluster |
| POST | `/drafts/from-cluster/:clusterId` | Tạo draft từ cluster |
| PATCH | `/drafts/:id` | Sửa draft (headline, content, tone) |
| POST | `/drafts/:id/approve` | Duyệt draft |
| POST | `/drafts/:id/reject` | Từ chối draft |
| POST | `/drafts/:id/rewrite` | Viết lại nội dung (body: `{ instruction? }`) |
| POST | `/drafts/:id/select-variant` | Chọn variant (body: `{ variant }`) |

## Publish

| Method | Path | Mô tả |
|--------|------|-------|
| POST | `/publish` | Đăng bài (body: `{ draftId }`) |
| GET | `/publish/posts` | Danh sách bài đã đăng |

## Sources

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/sources` | Danh sách nguồn |
| POST | `/sources` | Thêm nguồn |
| PATCH | `/sources/:id` | Sửa nguồn |
| DELETE | `/sources/:id` | Xóa nguồn |

## Topics

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/topics` | Danh sách topics |
| POST | `/topics` | Thêm topic |
| PATCH | `/topics/:id` | Sửa topic |
| DELETE | `/topics/:id` | Xóa topic |

## Topic Rules

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/topic-rules` | Danh sách rule map cluster → topic |
| GET | `/topic-rules/types` | Các loại rule |
| POST | `/topic-rules` | Thêm rule |
| PATCH | `/topic-rules/:id` | Sửa rule |
| DELETE | `/topic-rules/:id` | Xóa rule |

## Cluster Categories

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/cluster-categories` | Danh sách category |
| POST | `/cluster-categories` | Thêm category |
| PATCH | `/cluster-categories/:id` | Sửa category |
| DELETE | `/cluster-categories/:id` | Xóa category |

## Writer History

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/writer-history` | Lịch sử viết (query: draftId, limit, offset) |
| GET | `/writer-history/:id` | Chi tiết record |
| POST | `/writer-history` | Lưu record (internal) |

## GPT Writer Config

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/config/gpt-writer` | Cấu hình GPT writer |
| PATCH | `/config/gpt-writer` | Cập nhật cấu hình |
