# Plan: Dashboard Enhancement

> Bổ sung thông tin quan trọng cho trang Tổng quan (Dashboard).

## Mục tiêu

Dashboard hiện có: stats tổng, top chủ đề, trend 24h, biểu đồ trend theo ngày.  
Thiếu: **trạng thái crawl gần nhất**, **clusters chưa có draft**, **nguồn bật/tắt**. Plan này bổ sung các metrics trên.

---

## Phase 8 – Dashboard Enhancement

### 8.1 Backend: Mở rộng API `/stats`

**File:** `src/api/server.ts`

Thêm các field vào response `/stats`:

| Field | Mô tả | Query |
|-------|-------|-------|
| `sourcesEnabled` | Số nguồn đang bật | `sources` where `enabled = true` |
| `clustersWithoutDraft` | Số cluster chưa có draft | `storyClusters` not in (drafts.storyClusterId) |
| `articlesLast24h` | Bài crawl mới 24h | `articles` where `createdAt >= now - 24h` |
| `clustersLast24h` | Tin gom mới 24h | `storyClusters` where `createdAt >= now - 24h` |
| `postsLast24h` | Bài đăng mới 24h | `posts` where `createdAt >= now - 24h` |
| `lastIngestRun` | Thông tin lần crawl gần nhất | 1 row từ `ingestRuns` order by `startedAt` desc |

**Định dạng `lastIngestRun`:**

```ts
{
  id: string;
  status: 'running' | 'completed' | 'failed';
  startedAt: string;      // ISO
  finishedAt?: string;     // ISO | null
  articlesFetched?: number;
  clustersCreated?: number;
  error?: string;
}
```

**Tasks:**
- [x] Thêm queries cho `sourcesEnabled`, `clustersWithoutDraft`, `articlesLast24h`, `clustersLast24h`, `postsLast24h`
- [x] Query `lastIngestRun` từ `ingestRuns` (limit 1, desc startedAt)
- [x] Merge vào response `/stats`

---

### 8.2 Admin API: Cập nhật type `getStats`

**File:** `admin/src/api/config.ts`

Cập nhật type return của `getStats()`:

```ts
{
  articles: number;
  clusters: number;
  drafts: number;
  draftsPending: number;
  draftsApproved: number;
  sources: number;
  posts: number;
  // Mới
  sourcesEnabled?: number;
  clustersWithoutDraft?: number;
  articlesLast24h?: number;
  clustersLast24h?: number;
  postsLast24h?: number;
  lastIngestRun?: {
    id: string;
    status: string;
    startedAt: string;
    finishedAt?: string;
    articlesFetched?: number;
    clustersCreated?: number;
    error?: string;
  };
}
```

**Tasks:**
- [x] Cập nhật type trong `config.ts`

---

### 8.3 Dashboard: Card Nguồn tin – hiển thị bật/tắt

**File:** `admin/src/pages/Dashboard.tsx`

Sửa card "Nguồn tin":
- Nếu có `sourcesEnabled` và `sources`: hiển thị `X/Y` (X bật, Y tổng)
- Suffix: `({sourcesEnabled}/{sources} bật)`

**Tasks:**
- [x] Thêm `subValue` cho card Nguồn tin khi có `sourcesEnabled`

---

### 8.4 Dashboard: Card mới – Lần crawl gần nhất

**File:** `admin/src/pages/Dashboard.tsx`

Thêm card thứ 6 (hoặc đặt sau "Bài đã đăng"):

- **Title:** "Crawl gần nhất"
- **Content:**
  - Nếu `lastIngestRun`:
    - Status: tag màu (completed=green, failed=red, running=blue)
    - Thời gian: `finishedAt` hoặc `startedAt` (format relative: "2 phút trước")
    - Kết quả: "X bài, Y clusters" (khi completed)
    - Error: hiển thị ngắn khi failed
  - Nếu không có: "Chưa chạy"
- **Link:** `/crawl` (lịch sử crawl)

**Tasks:**
- [x] Tạo component/card cho last ingest run
- [x] Link tới `/crawl`

---

### 8.5 Dashboard: Block CTA – Clusters chưa có draft

**File:** `admin/src/pages/Dashboard.tsx`

Thêm block cảnh báo/hành động (đặt sau các card stats, trước Top chủ đề):

- **Điều kiện:** `clustersWithoutDraft > 0`
- **Nội dung:** "Có X clusters chưa có bản nháp – cần xử lý"
- **CTA:** Link "Xem và tạo draft →" tới `/clusters?hasDraft=false` hoặc filter tương ứng

**Lưu ý:** Clusters API (`/drafts/clusters/top`) chưa có filter `hasDraft`. Link tạm thời tới `/clusters` – user tự filter. Có thể bổ sung `hasDraft=false` trong phase sau.

**Tasks:**
- [x] Hiển thị block CTA khi `clustersWithoutDraft > 0`

---

### 8.6 Dashboard: Card Bài crawl / Tin gom – subValue 24h

**File:** `admin/src/pages/Dashboard.tsx`

- Card "Bài crawl": thêm `subValue` `(+X 24h)` khi có `articlesLast24h`
- Card "Tin gom": thêm `subValue` `(+X 24h)` khi có `clustersLast24h`
- Card "Bài đã đăng": thêm `subValue` `(+X 24h)` khi có `postsLast24h`

**Tasks:**
- [x] Cập nhật CardStat cho 3 card trên

---

## Thứ tự thực hiện

1. **8.1** – Backend `/stats` (blocking)
2. **8.2** – Admin API type
3. **8.3** – Card Nguồn tin
4. **8.4** – Card Crawl gần nhất
5. **8.5** – Block Clusters chưa có draft
6. **8.6** – SubValue 24h cho các card

---

## Phụ thuộc

- Clusters list: cần filter `hasDraft=false`? Kiểm tra `getClusters` API.
- Ingest runs: API `/ingest/runs` đã có, dùng cho trang Crawl.

---

## Ước lượng

| Bước | Thời gian |
|------|-----------|
| 8.1  | 30–45 phút |
| 8.2  | 5 phút |
| 8.3–8.6 | 30–45 phút |
| **Tổng** | ~1.5 giờ |
