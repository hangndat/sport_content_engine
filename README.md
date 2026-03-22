# Sport Content Engine

Hệ thống biên tập nội dung thể thao tự động có kiểm duyệt. Thu thập tin từ nhiều nguồn (RSS, scraper), gom cluster trùng lặp, tạo bản nháp bằng AI, và đăng lên Facebook sau khi duyệt.

## Tính năng

- **Ingestion**: Thu thập bài từ RSS, chuẩn hóa, gom cluster bằng Jaccard + time window
- **AI Editorial**: FactExtractor, AngleSelector, ContentWriter, ToneController, Guardrail
- **Moderation**: 3 chế độ A/B/C (chờ duyệt, bán tự động, tự động whitelist)
- **Publishing**: Đăng lên Facebook Page
- **Admin UI**: React + Ant Design – quản lý clusters, drafts, sources, topics, crawl

## Stack

- **Backend**: Node.js 20+, TypeScript, Express
- **Data**: PostgreSQL 16, Redis 7, Drizzle ORM
- **Storage**: S3 (MinIO), BullMQ queue
- **AI**: OpenAI (GPT-4o-mini)
- **Admin**: React 19, Vite, Ant Design Pro

## Bắt đầu nhanh

```bash
# 1. Clone và cài đặt
git clone ...
cd sport_content_engine
npm install

# 2. Môi trường
cp .env.example .env
# Sửa DATABASE_URL, OPENAI_API_KEY, REDIS_URL

# 3. Chạy infra (PostgreSQL, Redis, MinIO)
docker compose up -d

# 4. Migrate DB
npm run db:push

# 5. Build và chạy
npm run build
npm start
```

Truy cập: http://localhost:3000/admin

## Cấu trúc dự án

```
├── src/
│   ├── agents/        # AI agents (FactExtractor, ContentWriter, Guardrail...)
│   ├── api/           # Express server và REST routes
│   ├── connectors/    # RSS, Scraper connectors
│   ├── db/            # Drizzle schema, migrations
│   ├── lib/           # Utilities (entityExtract, jaccard, openai, s3...)
│   ├── publishers/    # Facebook publisher
│   └── services/      # Ingestion, Dedup, Ranking, Enrichment, Trend
├── admin/             # Admin UI (React + Vite)
├── docs/              # Tài liệu kiến trúc, API, setup
├── n8n/workflows/     # n8n workflow cho ingest schedule
└── scripts/           # DB init, seed, clean, analyze
```

## Tài liệu

| Tài liệu | Mô tả |
|----------|-------|
| [docs/README.md](docs/README.md) | Chỉ mục tài liệu |
| [plans/PLAN.md](plans/PLAN.md) | Plan tổng quan (đã hoàn thành) |
| [docs/architecture/](docs/architecture/) | Kiến trúc hệ thống, data flow |
| [docs/api/](docs/api/) | API REST đầy đủ |
| [docs/setup/](docs/setup/) | Hướng dẫn setup môi trường |
| [docs/TESTING.md](docs/TESTING.md) | Hướng dẫn test E2E |

## Scripts

| Lệnh | Mô tả |
|------|-------|
| `npm run build` | Build backend + admin |
| `npm start` | Chạy server production |
| `npm run dev` | Dev mode backend (tsx watch) |
| `npm run admin` | Dev mode admin UI |
| `npm run db:push` | Drizzle push schema |
| `npm run db:studio` | Mở Drizzle Studio |
