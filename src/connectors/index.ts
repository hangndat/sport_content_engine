import { RssConnector } from "./rss.js";
import { ScraperConnector } from "./scraper.js";
import type { IConnector, SourceConfig } from "./base.js";

const rss = new RssConnector();
const scraper = new ScraperConnector();

export function getConnector(type: string): IConnector {
  switch (type) {
    case "rss":
      return rss;
    case "scraper":
      return scraper;
    default:
      throw new Error(`Unknown connector type: ${type}`);
  }
}

export { RssConnector, ScraperConnector };
export type { IConnector, SourceConfig };
