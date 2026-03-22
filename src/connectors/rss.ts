import { XMLParser } from "fast-xml-parser";
import { createHash } from "crypto";
import type { IConnector, SourceConfig } from "./base.js";
import type { UnifiedArticle } from "../types/index.js";
import { extractEntitiesFromTitle } from "../lib/entityExtract.js";

export class RssConnector implements IConnector {
  async fetch(config: SourceConfig): Promise<UnifiedArticle[]> {
    if (!config.url) return [];

    const res = await fetch(config.url, {
      headers: { "User-Agent": "SportContentEngine/1.0" },
    });
    const xml = await res.text();
    if (!xml.trim().startsWith("<")) return []; // HTML hoặc invalid

    const parser = new XMLParser({ ignoreAttributes: false });
    const parsed = parser.parse(xml);

    let items = parsed?.rss?.channel?.item;
    if (!items && parsed?.feed?.entry) {
      items = parsed.feed.entry; // Atom format
    }
    const arr = Array.isArray(items) ? items : items ? [items] : [];

    return arr.map((item: Record<string, unknown>) =>
      this.normalize(item, config)
    );
  }

  private normalize(item: Record<string, unknown>, config: SourceConfig): UnifiedArticle {
    let link: string = (item.link ?? item.guid ?? "") as string;
    if (typeof link === "object" && link !== null) {
      link = (link as { href?: string }).href ?? "";
    }
    const title = (item.title ?? "") as string;
    const content = (item.description ?? item.content ?? item["content:encoded"] ?? "") as string;
    let pubDate = (item.pubDate ?? item.published ?? item.updated) as string;

    if (typeof pubDate === "string" && pubDate) {
      pubDate = new Date(pubDate).toISOString();
    } else {
      pubDate = new Date().toISOString();
    }

    const hash = createHash("md5").update(link).digest("hex").slice(0, 12);
    const id = `rss-${config.id}-${hash}`;
    const { teams, players, competition } = extractEntitiesFromTitle(this.stripHtml(title));
    return {
      id: id.replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 128),
      source: config.id,
      sourceTier: config.tier,
      url: link,
      title: this.stripHtml(title),
      content: this.stripHtml(content).slice(0, 10000),
      publishedAt: new Date(pubDate),
      language: "vi",
      contentType: "news",
      teams: teams.length > 0 ? teams : undefined,
      players: players.length > 0 ? players : undefined,
      competition: competition ?? undefined,
      rawPayload: item,
    };
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
}
