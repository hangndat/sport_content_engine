import { XMLParser } from "fast-xml-parser";
import { createHash } from "crypto";
import type { IConnector, SourceConfig } from "./base.js";
import type { UnifiedArticle } from "../types/index.js";
import { extractEntitiesFromTitle } from "../lib/entityExtract.js";

/** Parse date từ nhiều format RSS (RFC 2822, dd/mm/yyyy, yyyy/mm/dd). */
function parsePubDate(str: string): Date | null {
  if (!str || typeof str !== "string" || !str.trim()) return null;
  const s = str.trim();
  let d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d;
  // dd/mm/yyyy HH:mm:ss (Tinthethao)
  const ddmmyyyy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})/);
  if (ddmmyyyy) {
    const [, dd, mm, yyyy, hh, mi, ss] = ddmmyyyy;
    d = new Date(parseInt(yyyy!, 10), parseInt(mm!, 10) - 1, parseInt(dd!, 10), parseInt(hh!, 10), parseInt(mi!, 10), parseInt(ss!, 10));
    if (!Number.isNaN(d.getTime())) return d;
  }
  // yyyy/mm/dd HH:mm:ss (Bongda24h)
  const yyyymmdd = s.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2}):(\d{2})/);
  if (yyyymmdd) {
    const [, yyyy, mm, dd, hh, mi, ss] = yyyymmdd;
    d = new Date(parseInt(yyyy!, 10), parseInt(mm!, 10) - 1, parseInt(dd!, 10), parseInt(hh!, 10), parseInt(mi!, 10), parseInt(ss!, 10));
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

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

    return arr
      .map((item: Record<string, unknown>) => this.normalize(item, config))
      .filter((a): a is UnifiedArticle => a != null);
  }

  private normalize(
    item: Record<string, unknown>,
    config: SourceConfig
  ): UnifiedArticle | null {
    let link: string = (item.link ?? item.guid ?? "") as string;
    if (typeof link === "object" && link !== null) {
      link = (link as { href?: string }).href ?? "";
    }
    const title = (item.title ?? "") as string;
    const content = (item.description ?? item.content ?? item["content:encoded"] ?? "") as string;
    const pubRaw = (item.pubDate ?? item.published ?? item.updated) as string;
    const date = parsePubDate(String(pubRaw ?? ""));
    if (!date) return null;

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
      publishedAt: date,
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
