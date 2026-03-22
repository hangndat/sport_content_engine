# Phân tích nội dung cluster

## 1. Tổng quan

Script `scripts/analyze-cluster-content.ts` phân tích nội dung các cluster theo:
- **contentType**: news, result, rumor, opinion
- **source**: nguồn bài viết
- **template**: bài mẫu (Lịch/Kết quả bóng đá hôm nay)
- **word overlap**: độ tương đồng từ khóa trong cluster đa bài
- **competition**: giải đấu có khớp không
- **mixed content**: gom lẫn result với news/opinion

## 2. Kết quả phân tích (mẫu)

### 2.1 Phân bố contentType
| Type   | Số cluster |
|--------|------------|
| news   | 1334      |
| result | 12        |
| opinion| 2         |
| rumor  | 1         |

**→ Đa số là news; result/opinion ít.**

### 2.2 Phân bố nguồn
- vietnamnet-thethao chiếm đa số (~938)
- Các nguồn khác: dantri, vnexpress, nld, thanhnien, zing, tuoitre, bongda24h, thethao247

### 2.3 Cluster đa bài
| Chỉ số | Giá trị |
|--------|---------|
| Tổng cluster đa bài | 65 |
| Cross-source (nhiều nguồn) | 14 |
| Có article template | 76 |
| Overlap từ < 20% | 0 |
| Competition khác nhau | 8 |
| ContentType khác nhau | 1 |

**→ Overlap = 0:** không có cluster nào có độ tương đồng từ quá thấp (gom nhầm semantic).
**→ 8 cluster:** gom bài từ giải khác (vd. NHA vs V-League, C1 vs Europa).
**→ 1 cluster:** gom result với news (có thể không hợp lý).

### 2.4 Ví dụ competition mismatch
- Europa League vs Champions League
- Ngoại hạng Anh vs V-League
- C1 vs Europa League

→ Một cluster có thể gom bài về C1 và Europa nếu tiêu đề tương tự (vd. "Arsenal thắng Chelsea").

### 2.5 Ví dụ mixed contentType
- `cluster-fuzzy-a3663c49ade855209156a051`: result + news  
  (Sinner thắng Miami – tin kết quả + tin tổng hợp)

## 3. Logic Dedup hiện tại

### 3.1 Điều kiện gom
1. **similar(a,b)**: Jaccard ≥ 0.4 **hoặc** embedding cosine ≥ 0.85
2. **sameFootballMatch**: tỷ số khớp (nếu có), cặp đội khớp (nếu có ≥2 teams)
3. **Time window**: toàn bộ cluster trong 24h

### 3.2 Chưa dùng
- **competition**: không kiểm tra
- **contentType**: không kiểm tra
- **content**: chỉ dùng title, không dùng nội dung

## 4. Đề xuất cải thiện

### 4.1 Thêm `sameCompetition()` (ưu tiên cao)
Khi cả 2 bài có `competition` rõ ràng và khác nhau → không gom.

```typescript
function sameCompetition(
  a: { competition?: string | null },
  b: { competition?: string | null }
): boolean {
  const ca = (a.competition ?? "").toLowerCase().trim();
  const cb = (b.competition ?? "").toLowerCase().trim();
  if (!ca || !cb || ca === "-" || cb === "null") return true;
  if (ca === cb) return true;
  // V-League ≈ v league, C1 ≈ champions league, ...
  return normalizeCompetition(ca) === normalizeCompetition(cb);
}
```

### 4.2 Cân nhắc `contentType` (ưu tiên trung bình)
- **result** vs **opinion**: thường không nên gom (một bài là kết quả, một là bình luận)
- **result** vs **news**: có thể gom nếu cùng trận (vd. tin nhanh + bài chi tiết)

### 4.3 Template articles (ưu tiên thấp)
- Đã fix time span 24h → không còn gom "Lịch hôm nay" nhiều ngày
- Có thể tách content_type riêng (schedule_recap) nếu cần xử lý khác

### 4.4 Content (ưu tiên thấp)
- Hiện chỉ dùng title
- Có thể thử dùng thêm content (hoặc summary) cho embedding nếu cần recall cao hơn

## 5. Cải thiện đã triển khai (DedupService)

### sameCompetition()
- Chuẩn hóa giải: V-League ≈ v league, NHA ≈ Premier League, C1 ≈ Champions League, C2 ≈ Europa League
- Nếu cả 2 bài có competition rõ ràng và khác nhau → không gom

### compatibleContentType()
- Cho phép: news+news, news+result, result+result
- Không gom: result + opinion

## 6. Chạy phân tích

```bash
npx tsx scripts/analyze-cluster-content.ts
```

Chạy định kỳ để theo dõi chất lượng gom cluster.
