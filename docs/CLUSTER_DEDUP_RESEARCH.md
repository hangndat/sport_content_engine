# Research: Thuật toán gom Cluster & vấn đề hiện tại

## 1. Thuật toán hiện tại

### Cách hoạt động
- **Hash key** = SHA256(normalize(title) + "|" + entities + "|" + timeSlot)
- **normalize**: lowercase, bỏ ký tự đặc biệt, giới hạn 200 chars
- **entities**: teams + players + competition (gộp, sort) — **hiện luôn rỗng** vì RSS connector không trích
- **timeSlot**: chia theo **1 giờ** (floor theo UTC)

### Điều kiện 2 bài cùng cluster
- Hash key **hoàn toàn giống nhau** → cần title chuẩn hóa y chang + cùng cửa sổ 1 giờ
- Chỉ xử lý trong **batch hiện tại** (recentArticleIds) — không so sánh với bài/cluster cũ trong DB

---

## 2. Các vấn đề chính

### 2.1. Quá strict — title phải trùng gần như 100%
Cùng tin nhưng khác cách viết → không gom được:

| Bài 1 | Bài 2 | Kết quả |
|-------|-------|---------|
| MU thắng Chelsea 2-1 | Man United đánh bại Chelsea | ❌ Khác hash |
| Tiến Linh ghi bàn phút 90 | Nguyễn Tiến Linh tỏa sáng cuối trận | ❌ Khác hash |
| Tuyển Việt Nam thắng Thái Lan | ĐT Việt Nam đánh bại Thái Lan | ❌ Khác hash |

### 2.2. Entities luôn rỗng
- RSS connector **không** trích teams/players/competition
- Hash chỉ phụ thuộc title → mất tín hiệu bổ sung (đội bóng, giải đấu)

### 2.3. Cửa sổ thời gian 1 giờ quá hẹp
- Tin VnExpress 10:00, TuoiTre 10:45, Zing 11:30 → 3 timeSlot khác nhau → không gom
- Tin thể thao thường rải ra vài giờ

### 2.4. Chỉ cluster trong batch hiện tại
- Mỗi lần ingest chỉ xét `recentArticleIds`
- Không so sánh bài mới với clusters/bài đã có → bỏ qua gom cross-batch

### 2.5. Cache Redis chặn cập nhật
- Nếu hash đã có trong Redis (24h) → skip
- Khi có thêm nguồn mới trùng story → không merge vào cluster cũ

---

## 3. Nghiên cứu giải pháp từ industry

### 3.1. Feedly (2024)
- **LSH (Locality Sensitive Hashing)**: gom bài giống nhau >80%
- **Deduplicate trước, cluster sau** → giảm tải
- **Propagate**: bài mới trùng với bài đã thuộc cluster → gán luôn vào cluster đó (stream processing)
- 80% bài là duplicate → chỉ cluster ~20% bài

### 3.2. Newscatcher
- **Embeddings + cosine similarity**: ngưỡng 0.95 cho duplicate, 0.6 cho cluster
- **Levenshtein**: 0.92 nội dung, 0.97 tiêu đề để tinh chỉnh

### 3.3. Vietnamese text similarity
- **Jaccard + n-gram**: dùng word 2-gram hoặc 3-gram
- **TextRank + Jaccard**: phân loại tin tiếng Việt với độ chính xác ~90%

### 3.4. LSH/MinHash (Node.js)
- **lsh-js**, **minhash-node-rs**: MinHash + LSH
- Shingle text → MinHash signature → LSH banding → tìm cặp tương tự
- Tìm near-duplicate sub-linear, không cần so sánh từng cặp

---

## 4. Đề xuất cải tiến

### Tier 1 — Nhanh, ít đụng code (quick wins)

| Thay đổi | Mô tả | Impact |
|----------|-------|--------|
| **Mở rộng time window** | 1h → 6h hoặc 24h | Tin cùng ngày có thể gom |
| **Trích entities từ title** | Regex/dict: "MU", "Chelsea", "Việt Nam", "V-League"... | Hash có thêm tín hiệu |
| **Bỏ/giảm cache Redis** | Chỉ dùng cache cho hash exact, không skip khi merge | Cluster có thể cập nhật khi có bài mới |

### Tier 2 — Tương tự mềm (fuzzy matching)

| Thay đổi | Mô tả | Độ phức tạp |
|----------|-------|--------------|
| **Word n-gram + Jaccard** | 2–3 gram từ title, Jaccard ≥ 0.4–0.5 → cùng cluster | Trung bình |
| **MinHash + LSH** | Thư viện `minhash` hoặc `lsh-js`, tìm near-duplicate | Trung bình |

### Tier 3 — Semantic

| Thay đổi | Mô tả | Độ phức tạp |
|----------|-------|--------------|
| **Embeddings** | SentenceTransformers/OpenAI embeddings + cosine | Cao |
| **HDBSCAN** | Density clustering trên không gian embedding | Cao |

---

## 5. Gợi ý triển khai (ưu tiên)

### Phase A — Quick wins
1. **Time window 1h → 24h** cho sports
2. **Entity extraction đơn giản**: từ điển tên đội/cầu thủ/giải phổ biến, trích từ title
3. **Cross-batch**: khi ingest, load thêm articles/clusters gần đây (vd. 7 ngày) để so sánh với batch mới

### Phase B — Fuzzy matching
4. **N-gram Jaccard**:
   - Tokenize title → word 2-grams
   - Với mỗi bài mới: tính Jaccard với từng cluster (canonical hoặc representative)
   - Nếu score ≥ 0.45 → merge vào cluster đó
5. Hoặc **MinHash + LSH** nếu số bài lớn (>10k) để tối ưu tốc độ

### Phase C (tùy chọn)
6. Embeddings nếu cần độ chính xác cao và có budget compute/API.

---

## 6. Đã triển khai (2025-03)

- **Time window 24h** — `src/services/DedupService.ts`
- **Entity extraction** — `src/lib/entityExtract.ts` + dùng trong RSS connector
- **Jaccard n-gram** — `src/lib/jaccard.ts` (word 1-gram + 2-gram, threshold 0.4)
- **Cross-batch 14 ngày** — so khớp bài mới với clusters cũ
- **Union-Find** — gom các bài unmatched theo cặp tương tự
- **Tránh gom nhầm kết quả** — `extractMatchScore()` + `sameFootballMatch()`: chỉ gom khi tỷ số trùng và cặp đội trùng

---

## 7. Tham khảo

- [Feedly: Clustering & Deduplication](https://feedly.com/engineering/posts/reducing-clustering-latency)
- [Newscatcher: Articles Deduplication](https://www.newscatcherapi.com/docs/news-api/guides-and-concepts/articles-deduplication)
- [Vietnamese Text Classification - Jaccard](https://www.astesj.com/v05/i06/p44/)
- [lsh-js](https://github.com/agtabesh/lsh-js)
- [MinHash LSH - Milvus](https://blog.milvus.io/docs/minhash-lsh.md)
