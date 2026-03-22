# Cơ hội áp dụng AI để tăng độ chính xác

## Pipeline hiện tại vs AI

| Khâu | Cách làm hiện tại | Độ chính xác | AI có thể giúp? |
|------|-------------------|--------------|-----------------|
| **1. Entity extract** | Regex (teams, players, competition) | Trung bình – bỏ sót biến thể | ✅ Cao |
| **2. Dedup/Cluster** | Jaccard n-gram + score/teams | Khá – vẫn gom nhầm/thiếu | ✅ Cao |
| **3. ContentType** | Cố định `news` | Thấp | ✅ Trung bình |
| **4. Fact extract** | GPT-4o-mini (đã có) | Tốt | 🔄 Cải thiện prompt |
| **5. Angle select** | Rule (confidence, keyword) | Trung bình | ✅ Trung bình |
| **6. Guardrail** | Keyword rumor | Thấp – dễ lọt | ✅ Cao |

---

## 1. Entity Extraction (Fetch) — **Ưu tiên cao**

**Vấn đề:** Regex chỉ bắt được tên cố định. Bỏ sót: biệt danh, viết tắt, lỗi chính tả.

**Ví dụ:**
- "ĐT Việt Nam" → có
- "đội tuyển VN" → có (nếu có pattern)
- "HLV Park Hang-seo" → không có pattern → bỏ sót

**Giải pháp AI:**
```
Prompt: "Trích teams, players, competition từ tiêu đề. Trả JSON: {teams:[], players:[], competition: string|null}"
Input: title + content (50-100 từ đầu)
Model: gpt-4o-mini
```

**Cách triển khai:** Gọi AI khi regex trả về ít entities (< 2 teams, 0 players) hoặc bật tùy chọn `USE_AI_ENTITY_EXTRACT=true`.

**Chi phí:** ~$0.11/1.000 bài (~$3.30/tháng nếu 1.000 bài/ngày). Xem bảng Chi phí bên dưới.

---

## 2. Dedup / Clustering — **Ưu tiên cao**

**Vấn đề:** Jaccard dựa trên từ. "MU thắng Chelsea 2-1" vs "Man United đánh bại Chelsea" — từ khác nhưng cùng sự kiện.

**Giải pháp AI:**
- **Embeddings + cosine:** Mỗi title → embedding (OpenAI `text-embedding-3-small`). Cosine ≥ 0.9 → cùng cluster. Ưu: hiểu ngữ nghĩa.
- **LLM same-event:** Với cặp bài Jaccard 0.3–0.5 (vùng xám), gọi LLM: "Hai tin sau có cùng sự kiện không? Chỉ trả true/false."

**Cách triển khai:**
- Phase 1: Thêm embedding column `articles.embedding`, tính khi save. Dùng cho cluster thay vì/together với Jaccard.
- Phase 2: Khi Jaccard ∈ [0.35, 0.5], gọi LLM để quyết định gom hay không.

**Chi phí:** Embedding ~$0.02/1M tokens → ~$0.001/1.000 bài. LLM vùng xám: vài chục call/ngày → ~$0.01.

---

## 3. ContentType Classification — **Ưu tiên trung bình**

**Vấn đề:** Hiện luôn là `news`. Không phân biệt result/rumor/stats/schedule.

**Giải pháp AI:**
```
Prompt: "Phân loại tin thể thao: result | rumor | stats | news | schedule | opinion"
Output: 1 label
Input: title + 100 từ đầu content
```

**Lợi ích:** Moderation tốt hơn (rumor → chờ duyệt), AngleSelector chọn format phù hợp.

**Chi phí:** ~$0.07/1.000 bài (~$2.10/tháng).

---

## 4. Fact Extractor — **Đã có AI, có thể tinh chỉnh**

- Thêm few-shot examples trong prompt (kết quả trận, chuyển nhượng, tin đồn).
- Bổ sung `contentType` inferred từ nội dung.
- Yêu cầu `sourceList` — trích nguồn đã dùng trong cluster.

---

## 5. Angle Selector — **Ưu tiên thấp**

**Hiện tại:** Rule dựa trên confidence, keyword.

**AI:** "Chọn format phù hợp nhất: short_hot | quick_summary | debate | data_stat | schedule_recap. Cân nhắc: loại tin, độ chắc chắn, có số liệu không."

---

## 6. Guardrail — **Ưu tiên cao**

**Vấn đề:** Chỉ dùng keyword ("tin đồn", "có thể") → dễ lọt nội dung bịa, rumor ẩn.

**Giải pháp AI:**
```
Prompt: "Kiểm tra: (1) Có thông tin bịa đặt? (2) Là rumor chưa xác nhận? Trả JSON: {fabrication: boolean, rumor: boolean, reason?: string}"
```

**Cách triển khai:** Gọi sau ContentWriter, trước lưu draft. Nếu `fabrication=true` → reject. `rumor=true` → label, chờ duyệt.

**Chi phí:** ~50 draft/ngày × ~500 tokens → ~$0.30/tháng.

---

## Chi phí ước tính (OpenAI, 2025)

| Model | Giá | Ghi chú |
|-------|-----|---------|
| gpt-4o-mini | $0.15/1M input, $0.60/1M output | Chat, extract, classify |
| text-embedding-3-small | $0.02/1M tokens | Dedup semantic |

**Ước lượng tokens:** title ~50 tokens, content 100 từ ~150 tokens. 1 call JSON output ~100–200 tokens.

### Chi phí theo khâu (1.000 bài/ngày)

| Khâu | Call/ngày | Tokens ước tính | Chi phí/ngày | Chi phí/tháng |
|------|-----------|-----------------|--------------|---------------|
| **Entity extract AI** | 1.000 | 300 in + 150 out/bài | ~$0.11 | ~$3.30 |
| **ContentType AI** | 1.000 | 300 in + 50 out | ~$0.07 | ~$2.10 |
| **Guardrail AI** | ~50 (chỉ draft tạo) | 400 in + 100 out | ~$0.01 | ~$0.30 |
| **Embeddings (Dedup)** | 1.000 | 50 tokens/bài | ~$0.001 | ~$0.03 |
| **Fact Extractor** *(đã có)* | ~50 | 500 in + 200 out | ~$0.02 | ~$0.60 |
| **ContentWriter** *(đã có)* | ~50 | 600 in + 300 out | ~$0.03 | ~$0.90 |

### Tổng ước tính nếu bật hết AI mới

- **Chỉ Guardrail:** ~$0.30/tháng  
- **+ Entity + ContentType:** ~$6/tháng  
- **+ Embeddings:** ~$6/tháng (embedding rất rẻ)

*Lưu ý: Giá có thể thay đổi, xem [OpenAI Pricing](https://openai.com/api/pricing/).*

---

## Tóm tắt ưu tiên triển khai

| Thứ tự | Khâu | Impact | Chi phí | Độ phức tạp |
|--------|------|--------|---------|-------------|
| 1 | **Guardrail AI** | Tránh đăng tin sai | Thấp (1 call/draft) | Thấp |
| 2 | **Entity extract AI** (bổ sung regex) | Teams/players chính xác hơn | Trung bình | Trung bình |
| 3 | **Dedup embeddings** | Gom đúng hơn, ít nhầm | Cao (embedding mọi bài) | Cao |
| 4 | **ContentType AI** | Phân loại tin | Thấp | Thấp |
| 5 | **Angle Selector AI** | Format phù hợp hơn | Thấp | Trung bình |

---

## Gợi ý bắt đầu

1. **Guardrail AI** — thêm 1 bước kiểm tra AI trước khi approve draft. Nhanh, ít đụng logic cũ.
2. **Entity extract lai** — giữ regex làm fallback nhanh; khi regex trả ít entities, gọi AI để bổ sung.
3. **Embeddings cho dedup** — thí điểm với batch nhỏ, so sánh F1 cluster trước/sau.
