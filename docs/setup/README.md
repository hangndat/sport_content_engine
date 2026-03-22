# Setup Guide

## Yêu cầu

- Node.js 20+
- PostgreSQL 16+
- Redis 7+
- MinIO (optional, cho S3)

## Cài đặt local

```bash
# 1. Clone và cài dependencies
git clone ...
cd sport_content_engine
npm install

# 2. Copy env
cp .env.example .env
# Sửa DATABASE_URL, OPENAI_API_KEY, REDIS_URL, etc.

# 3. Chạy infrastructure (Docker)
docker compose up -d

# 4. Migrate DB
npm run db:push

# 5. Build và chạy
npm run build
npm start
```

Truy cập: http://localhost:3000/admin

## Biến môi trường (.env)

| Biến | Mô tả | Bắt buộc |
|------|-------|-----------|
| `DATABASE_URL` | PostgreSQL connection string | Có |
| `REDIS_URL` | Redis URL (vd: redis://localhost:16379) | Có |
| `OPENAI_API_KEY` | OpenAI API key (tạo draft, AI entities) | Để tạo draft |
| `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET` | MinIO/S3 (optional) | Không |
| `USE_AI_ENTITY_EXTRACT` | Bật AI extract entities khi regex thiếu | Không (default: true) |
| `USE_AI_CLUSTER` | Dùng embedding cho dedup | Không (default: true) |
| `FACEBOOK_*` | Facebook Page credentials | Để publish |
| `MODERATION_MODE` | A \| B \| C | Không (default: A) |
| `INGEST_INTERVAL_MS` | Scheduled crawl (ms), 0 = tắt | Không |
| `PORT` | Server port | Không (default: 3000) |

## Docker Compose

Chạy infra:
```bash
docker compose up -d
# PostgreSQL: 5432, Redis: 16379 (host), MinIO: 9000 (API), 9001 (console)
```

Chỉ chạy DB + Redis + MinIO:
```bash
docker compose up -d postgres redis minio
```

## Deploy

```bash
cp .env.example .env
# Sửa .env cho production
docker compose up -d --build
# Hoặc build thủ công: npm run build && npm start
```

## Scripts

| Lệnh | Mô tả |
|------|-------|
| `npm run build` | Build backend + admin |
| `npm start` | Chạy server |
| `npm run dev` | Dev mode backend |
| `npm run admin` | Dev mode admin (Vite) |
| `npm run db:push` | Drizzle push schema |
| `npm run db:studio` | Mở Drizzle Studio |
| `npm run db:init` | Init DB (tạo user nếu cần) |

## Endpoints chính

- `GET /health` – Health check
- `GET /admin` – Admin UI
- `POST /ingest/fetch` – Trigger crawl
- `GET /drafts` – List drafts
- `POST /drafts/from-cluster/:id` – Tạo draft từ cluster
- `POST /drafts/:id/approve` – Duyệt draft
- `POST /publish` – Publish (body: `{ draftId }`)
