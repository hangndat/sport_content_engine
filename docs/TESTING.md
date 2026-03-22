# Hướng dẫn test Sport Content Engine

## 1. Chuẩn bị môi trường

```bash
# Chạy PostgreSQL + Redis + MinIO
docker compose up -d

# Đợi vài giây rồi migrate
npm run db:push

# Copy và sửa .env (cần: DATABASE_URL, OPENAI_API_KEY)
cp .env.example .env
```

**.env tối thiểu:**
```
DATABASE_URL=postgresql://user:password@localhost:5432/sport_content_engine
REDIS_URL=redis://localhost:6379
OPENAI_API_KEY=sk-...
```

## 2. Chạy server

```bash
npm run build
npm start
```

Mở: http://localhost:3000 → redirect sang Admin UI tại http://localhost:3000/admin

> `npm run build` sẽ tự build cả admin. Chạy dev riêng admin: `npm run admin`.

## 3. Luồng test end-to-end

### Bước 1: Trigger Ingest

Trong Admin UI, bấm **"Trigger Ingest"**. Hoặc:

```bash
curl -X POST http://localhost:3000/ingest/fetch
```

Kỳ vọng: `{ ok: true, articlesFetched: N, clustersCreated: M }`

- Lấy tin từ RSS (bongdaplus.vn)
- Lưu articles, gom cluster, tính score

### Bước 2: Xem Story Clusters

Refresh "Story Clusters" trong Admin. Hoặc:

```bash
curl http://localhost:3000/drafts/clusters/top
```

Nên thấy danh sách clusters với score.

### Bước 3: Tạo Draft (cần OPENAI_API_KEY)

Bấm **"Tạo draft"** trên một cluster. Hoặc:

```bash
curl -X POST http://localhost:3000/drafts/from-cluster/cluster-<HASH>
```

Kỳ vọng: `{ ok: true, draftId: "..." }` – AI tạo headline, summary, variants.

### Bước 4: A/B caption (chọn variant)

Trong Admin, chọn variant **short_hot**, **quick_summary**, **debate**, **data_stat**, **schedule_recap** trước khi duyệt.

Hoặc:
```bash
curl -X POST http://localhost:3000/drafts/<DRAFT_ID>/select-variant \
  -H "Content-Type: application/json" \
  -d '{"variant":"quick_summary"}'
```

### Bước 5: Approve

Bấm **"Approve"** hoặc:

```bash
curl -X POST http://localhost:3000/drafts/<DRAFT_ID>/approve
```

### Bước 6: Publish (cần Facebook credentials)

Chỉ dùng khi đã config `FACEBOOK_PAGE_ID` và `FACEBOOK_PAGE_ACCESS_TOKEN` trong .env.

Bấm **"Publish"** hoặc:

```bash
curl -X POST http://localhost:3000/publish \
  -H "Content-Type: application/json" \
  -d '{"draftId":"<DRAFT_ID>"}'
```

Nếu chưa config FB → sẽ báo lỗi credentials.

## 4. Test không cần OpenAI / Facebook

- **Ingest**: Chạy bình thường (chỉ crawl RSS)
- **Clusters**: Xem được ngay sau ingest
- **Tạo Draft**: Cần `OPENAI_API_KEY`
- **Publish**: Cần Facebook credentials

## 5. Kiểm tra nhanh bằng curl

```bash
curl http://localhost:3000/health                    # { status: "ok" }
curl -X POST http://localhost:3000/ingest/fetch     # Ingest
curl http://localhost:3000/drafts/clusters/top      # Clusters
curl http://localhost:3000/drafts                   # Drafts
```

## 7. Scheduled Ingest

Trong `.env` set `INGEST_INTERVAL_MS=7200000` (2 giờ) để auto crawl định kỳ. Mặc định `0` = tắt.

## 8. Semi-auto (Chế độ B)

Set `MODERATION_MODE=B`. Khi tạo draft, nếu score ≥ 15 + nguồn tier 1/2 + không rumor → draft sẽ auto **approved**, sẵn sàng Publish.

## 9. MinIO / S3 (optional)

S3 dùng để lưu raw payload. Nếu bucket chưa tạo, bài vẫn lưu DB bình thường. Để dùng S3:

```bash
# Tạo bucket trong MinIO (http://localhost:9001)
mc alias set local http://localhost:9000 minioadmin minioadmin
mc mb local/sport-content
```

Hoặc bỏ `S3_ENDPOINT` trong .env để tắt hoàn toàn.

## 10. Lỗi thường gặp

| Lỗi | Nguyên nhân | Cách xử lý |
|-----|-------------|-----------|
| NoSuchBucket | MinIO chưa có bucket | Tạo bucket hoặc bỏ S3_ENDPOINT; bài vẫn lưu DB |
| SASL client password | .env không load / sai format | Kiểm tra DATABASE_URL |
| Port 6379 in use | Redis đang chạy local | Đổi REDIS_URL sang port khác (vd: 6380) trong docker-compose |
| OPENAI_API_KEY missing | Tạo draft không có key | Thêm key vào .env hoặc bỏ qua bước tạo draft |
| Cannot GET / | Cũ | Đã redirect / → /admin |
