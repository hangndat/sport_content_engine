# Quy trình Crawl – Chi tiết từng bước

## Tổng quan

Crawl (ingest) là quá trình thu thập bài viết từ các nguồn RSS, chuẩn hóa, lưu DB, gom cluster trùng lặp và tính điểm ưu tiên.

## Các bước thực hiện

### Step 1: Fetch (Thu thập)

| Thuộc tính | Mô tả |
|------------|--------|
| **Input** | Danh sách nguồn enabled từ DB (`sources`) |
| **Output** | `{ items: UnifiedArticle[], perSource: { sourceId, count, error? }[] }` |
| **Status** | `ok` – thành công, mỗi nguồn có `count` bài, `error` nếu nguồn fail |
| **Logic** | Duyệt từng nguồn, gọi connector (RSS/scraper), merge kết quả. Nguồn lỗi vẫn tiếp tục nguồn khác. |
| **Entity** | Mỗi bài: `id`, `title`, `content`, `url`, `publishedAt`, `teams`, `competition` (extract từ title) |

**Output mẫu trong steps:**
```json
{
  "total": 45,
  "perSource": [
    { "sourceId": "bongda24h", "count": 12 },
    { "sourceId": "thethao247", "count": 18 },
    { "sourceId": "zingnews", "count": 15 },
    { "sourceId": "broken_source", "count": 0, "error": "fetch failed" }
  ]
}
```

---

### Step 2: Save (Lưu DB)

| Thuộc tính | Mô tả |
|------------|--------|
| **Input** | Danh sách bài từ Step 1 |
| **Output** | `{ inserted, skipped, failed }` |
| **Status** | `ok` |
| **Logic** | Tùy chọn ghi raw payload lên S3. Insert vào `articles` với `onConflictDoNothing` (url unique). Trùng URL → skip. |
| **idempotent** | Có – cùng URL không tạo duplicate |

**Output mẫu:**
```json
{
  "inserted": 28,
  "skipped": 17,
  "failed": 0
}
```

- **inserted**: Bài mới thêm vào DB
- **skipped**: Bài đã tồn tại (trùng URL)
- **failed**: Lỗi khi insert

---

### Step 3: Dedup (Gom cluster trùng)

| Thuộc tính | Mô tả |
|------------|--------|
| **Input** | Danh sách `articleIds` vừa crawl |
| **Output** | `{ clusterIds, newCount, updatedCount }` |
| **Status** | `ok` |
| **Logic** | Jaccard similarity (1-gram + 2-gram) ≥ 0.4, time window 24h. So khớp với clusters cũ (14 ngày). Union-Find gom bài chưa được gán. |

**Output mẫu:**
```json
{
  "clusterCount": 12,
  "newCount": 8,
  "updatedCount": 4
}
```

- **clusterCount**: Tổng cluster (mới + cập nhật)
- **newCount**: Cluster mới tạo
- **updatedCount**: Cluster cũ được thêm bài mới

---

### Step 4: Score (Tính điểm ưu tiên)

| Thuộc tính | Mô tả |
|------------|--------|
| **Input** | Danh sách `clusterIds` từ Step 3 |
| **Output** | `{ scored: number }` |
| **Status** | `ok` |
| **Logic** | Mỗi cluster: tier nguồn + độ mới + số bài xác nhận. Cập nhật `story_clusters.score`. |

**Output mẫu:**
```json
{
  "scored": 12
}
```

---

## Trạng thái run

Mỗi lần crawl tạo một bản ghi trong `ingest_runs`:

| Cột | Mô tả |
|-----|--------|
| `status` | `running` → `completed` hoặc `failed` |
| `triggeredBy` | `manual` hoặc `scheduled` |
| `articlesFetched` | Tổng bài crawl được |
| `clustersCreated` | Số cluster sau dedup |
| `steps` | JSON mảng các step (name, status, output, durationMs, error) |
| `error` | Message lỗi nếu failed |
| `startedAt`, `finishedAt` | Thời điểm bắt đầu, kết thúc |

## API

- **GET /ingest/runs** – Danh sách lịch sử crawl (phân trang)
- **POST /ingest/fetch** – Kích hoạt crawl thủ công  
  Response: `{ ok, runId, articlesFetched, clustersCreated, clustersNew, clustersUpdated, steps }`

## Admin

Trang **Quản lý Crawl** (`/crawl`):
- Bảng lịch sử: thời gian, trạng thái, kích hoạt, bài crawl, clusters, lỗi, thời lượng
- Expand dòng → xem chi tiết từng step (fetch, save, dedup, score) kèm output JSON
