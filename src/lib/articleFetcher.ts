import * as cheerio from "cheerio";

const MAX_CONTENT_LENGTH = 5000;
const FETCH_TIMEOUT_MS = 15_000;
const USER_AGENT = "SportContentEngine/1.0 (+https://github.com/sport-content-engine)";

/** Các selector thường gặp cho nội dung bài viết chính */
const CONTENT_SELECTORS = [
  "article .content",
  "article .post-content",
  "article .entry-content",
  ".article-body",
  ".story-content",
  ".detail-content",
  ".post-detail",
  "[itemprop='articleBody']",
  "main article",
  ".fck_detail", // VnExpress
  ".content-detail", // Vietnamnet, Zing
  ".article-content",
  ".news-detail",
  ".entry-content",
  ".SingleArticle__body",
  "article",
];

/**
 * Fetch bài viết từ URL và trích nội dung chính.
 * Dùng cho draft creation để có nhiều context hơn mô tả RSS.
 */
export async function fetchArticleContent(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return null;

    const html = await res.text();
    const $ = cheerio.load(html);

    // Thử từng selector, lấy block có nhiều text nhất
    let best = "";
    for (const sel of CONTENT_SELECTORS) {
      const el = $(sel).first();
      if (!el.length) continue;
      const text = el.text().trim();
      if (text.length > best.length && text.length > 100) {
        best = text;
      }
    }

    // Fallback: lấy tất cả <p> trong body
    if (!best) {
      best = $("body p")
        .map((_, el) => $(el).text().trim())
        .get()
        .filter(Boolean)
        .join("\n\n");
    }

    const cleaned = best
      .replace(/\s+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    if (!cleaned) return null;

    return cleaned.slice(0, MAX_CONTENT_LENGTH);
  } catch (err) {
    console.warn("[ArticleFetcher] Failed to fetch", url, err);
    return null;
  }
}
