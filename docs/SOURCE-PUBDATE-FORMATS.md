# Định dạng pubDate theo nguồn RSS

> Đã kiểm tra thực tế các feed. Connector hỗ trợ đa format, không cần config per-source.

## Tổng hợp

| Nguồn | Field | Format | Ví dụ | Ghi chú |
|-------|-------|--------|-------|---------|
| VnExpress | pubDate | RFC 2822 | `Sun, 22 Mar 2026 15:12:03 +0700` | Chuẩn |
| Tuổi Trẻ, Dân Trí, Zing, Thanh Niên, VietnamNet, NLD | pubDate | RFC 2822 | (tương tự) | Chuẩn |
| Bongda.com.vn | pubDate | RFC 2822 | `Sun, 22 Mar 2026 10:50:44 +0000` | Chuẩn |
| Thethao247 | pubDate | RFC 2822 | `Sun, 22 Mar 2026 16:26:00 +0700` | Chuẩn |
| **Bongda24h** | pubDate | **yyyy/mm/dd HH:mm:ss** | `2026/03/22 15:45:14` | Không chuẩn |
| **Tinthethao** | pubDate | **dd/mm/yyyy HH:mm:ss** | `13/10/2025 15:59:09` | Không chuẩn |

## Connector xử lý

`RssConnector` thử parse theo thứ tự:
1. `new Date(str)` – RFC 2822, ISO 8601
2. `dd/mm/yyyy HH:mm:ss` – Tinthethao
3. `yyyy/mm/dd HH:mm:ss` – Bongda24h

Nếu tất cả fail → bỏ qua item (return null).
