import { db, sources } from "../db/index.js";
import type { SourceConfig } from "../connectors/base.js";
import { defaultSources } from "../config/sources.js";

export class SourceService {
  async getSources(): Promise<SourceConfig[]> {
    const rows = await db.select().from(sources);
    if (rows.length > 0) {
      return rows.map((r) => ({
        id: r.id,
        type: r.type as "rss" | "scraper" | "api" | "social",
        tier: r.tier as 1 | 2 | 3,
        url: r.url ?? undefined,
        rateLimitMinutes: r.rateLimitMinutes ?? undefined,
        enabled: r.enabled ?? true,
      }));
    }
    await this.seedDefaults();
    return defaultSources;
  }

  async seedDefaults(): Promise<void> {
    for (const s of defaultSources) {
      await db
        .insert(sources)
        .values({
          id: s.id,
          type: s.type,
          tier: s.tier,
          url: s.url,
          rateLimitMinutes: s.rateLimitMinutes ?? 15,
          enabled: s.enabled ?? true,
        })
        .onConflictDoNothing({ target: sources.id });
    }
  }
}
