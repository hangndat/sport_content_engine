import * as cheerio from "cheerio";
import type { IConnector, SourceConfig } from "./base.js";
import type { UnifiedArticle } from "../types/index.js";
import { createHash } from "crypto";

export class ScraperConnector implements IConnector {
  async fetch(config: SourceConfig): Promise<UnifiedArticle[]> {
    if (!config.url) return [];

    const res = await fetch(config.url);
    const html = await res.text();
    const $ = cheerio.load(html);

    const articles: UnifiedArticle[] = [];
    $("article, .post, .news-item, .entry").each((_, el) => {
      const $el = $(el);
      const title =
        $el.find("h1, h2, h3, .title, .headline").first().text().trim() ||
        $el.find("a").first().text().trim();
      const link = $el.find("a[href]").first().attr("href");
      const content =
        $el.find(".content, .excerpt, .summary, p").text().trim() ||
        $el.text().trim();
      const dateStr = $el.find("time").attr("datetime") || $el.find(".date").text();

      if (!title || !link) return;

      const url = link.startsWith("http") ? link : new URL(link, config.url).href;
      const hash = createHash("md5").update(url).digest("hex").slice(0, 12);
      const id = `scraper-${config.id}-${hash}`;

      articles.push({
        id,
        source: config.id,
        sourceTier: config.tier,
        url,
        title: title.slice(0, 500),
        content: content.slice(0, 10000),
        publishedAt: dateStr ? new Date(dateStr) : new Date(),
        language: "vi",
        contentType: "news",
        rawPayload: {},
      });
    });

    return articles;
  }
}
