import { gte, lte, and, sql } from "drizzle-orm";
import { db, articles } from "../db/index.js";

const TREND_HOURS = 24;
const TOP_LIMIT = 10;
const MS_PER_HOUR = 3600 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

export type TrendItem = { name: string; count: number };
export type Trends = {
  teams: TrendItem[];
  competitions: TrendItem[];
  players: TrendItem[];
};

export type TrendDailySeries = { name: string; data: { date: string; count: number }[] };
export type TrendDailyResponse = {
  teams: TrendDailySeries[];
  competitions: TrendDailySeries[];
  players: TrendDailySeries[];
  dates: string[];
};

function normalizeName(s: string): string {
  return s.trim().toLowerCase();
}

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Đếm số CLUSTERS (không phải articles) có entity trong 24h — khớp với trang /clusters khi click tag */
async function getTrendsByClusters(
  cutoff: Date,
  limit: number
): Promise<Trends> {
  const cutoffIso = cutoff.toISOString();
  const [teamsRes, compsRes, playersRes] = await Promise.all([
    db.execute<{ name: string; count: number }>(sql`
      WITH recent_arts AS (
        SELECT id, teams FROM articles
        WHERE published_at >= ${cutoffIso}::timestamptz
      ),
      art_teams AS (
        SELECT a.id AS art_id, lower(trim(e.elem)) AS team_name
        FROM recent_arts a,
        LATERAL jsonb_array_elements_text(COALESCE(a.teams,'[]'::jsonb)) AS e(elem)
        WHERE length(trim(e.elem)) >= 2
      ),
      cluster_teams AS (
        SELECT DISTINCT sc.id AS cluster_id, at.team_name
        FROM story_clusters sc,
        LATERAL jsonb_array_elements_text(sc.article_ids) AS aid(elem)
        JOIN art_teams at ON at.art_id = aid.elem
      )
      SELECT team_name AS name, count(*)::int AS count
      FROM cluster_teams GROUP BY team_name ORDER BY count DESC LIMIT ${limit}
    `),
    db.execute<{ name: string; count: number }>(sql`
      WITH recent_arts AS (
        SELECT id, competition FROM articles
        WHERE published_at >= ${cutoffIso}::timestamptz AND competition IS NOT NULL AND trim(competition) != ''
      ),
      cluster_comps AS (
        SELECT DISTINCT sc.id AS cluster_id, lower(trim(a.competition)) AS comp_name
        FROM story_clusters sc,
        LATERAL jsonb_array_elements_text(sc.article_ids) AS aid(elem)
        JOIN recent_arts a ON a.id = aid.elem
      )
      SELECT comp_name AS name, count(*)::int AS count
      FROM cluster_comps GROUP BY comp_name ORDER BY count DESC LIMIT ${limit}
    `),
    db.execute<{ name: string; count: number }>(sql`
      WITH recent_arts AS (
        SELECT id, players FROM articles
        WHERE published_at >= ${cutoffIso}::timestamptz
      ),
      art_players AS (
        SELECT a.id AS art_id, lower(trim(e.elem)) AS player_name
        FROM recent_arts a,
        LATERAL jsonb_array_elements_text(COALESCE(a.players,'[]'::jsonb)) AS e(elem)
        WHERE length(trim(e.elem)) >= 2
      ),
      cluster_players AS (
        SELECT DISTINCT sc.id AS cluster_id, ap.player_name
        FROM story_clusters sc,
        LATERAL jsonb_array_elements_text(sc.article_ids) AS aid(elem)
        JOIN art_players ap ON ap.art_id = aid.elem
      )
      SELECT player_name AS name, count(*)::int AS count
      FROM cluster_players GROUP BY player_name ORDER BY count DESC LIMIT ${limit}
    `),
  ]);
  return {
    teams: (teamsRes.rows ?? []).map((r) => ({ name: r.name, count: Number(r.count) })),
    competitions: (compsRes.rows ?? []).map((r) => ({ name: r.name, count: Number(r.count) })),
    players: (playersRes.rows ?? []).map((r) => ({ name: r.name, count: Number(r.count) })),
  };
}

export class TrendService {
  async getTrends(hours = TREND_HOURS, limit = TOP_LIMIT): Promise<Trends> {
    const cutoff = new Date(Date.now() - hours * MS_PER_HOUR);
    return getTrendsByClusters(cutoff, limit);
  }

  async getTrendsByDay(options?: {
    days?: number;
    limit?: number;
    type?: "teams" | "players" | "competitions" | "all";
  }): Promise<TrendDailyResponse> {
    const days = Math.min(30, Math.max(1, options?.days ?? 7));
    const limit = Math.min(15, Math.max(1, options?.limit ?? 5));
    const typeFilter = options?.type ?? "all";

    const now = new Date();
    const cutoff = new Date(now.getTime() - days * MS_PER_DAY);

    const rows = await db
      .select({
        publishedAt: articles.publishedAt,
        teams: articles.teams,
        players: articles.players,
        competition: articles.competition,
      })
      .from(articles)
      .where(and(gte(articles.publishedAt, cutoff), lte(articles.publishedAt, now)));

    type DateCountMap = Map<string, Map<string, number>>;
    const teamByDay: DateCountMap = new Map();
    const playerByDay: DateCountMap = new Map();
    const compByDay: DateCountMap = new Map();
    const dateSet = new Set<string>();

    const inc = (m: DateCountMap, key: string, date: string) => {
      if (!m.has(key)) m.set(key, new Map());
      const dayMap = m.get(key)!;
      dayMap.set(date, (dayMap.get(date) ?? 0) + 1);
    };

    for (const r of rows) {
      const date = toDateKey(r.publishedAt);
      dateSet.add(date);

      if (typeFilter === "all" || typeFilter === "teams") {
        for (const t of r.teams ?? []) {
          const key = normalizeName(t);
          if (key.length >= 2) inc(teamByDay, key, date);
        }
      }
      if (typeFilter === "all" || typeFilter === "players") {
        for (const p of r.players ?? []) {
          const key = normalizeName(p);
          if (key.length >= 2) inc(playerByDay, key, date);
        }
      }
      if ((typeFilter === "all" || typeFilter === "competitions") && r.competition?.trim()) {
        const key = normalizeName(r.competition);
        inc(compByDay, key, date);
      }
    }

    const dates = Array.from(dateSet).sort();

    const toSeries = (m: DateCountMap): TrendDailySeries[] =>
      [...m.entries()]
        .map(([name, dayMap]) => ({
          name,
          total: [...dayMap.values()].reduce((a, b) => a + b, 0),
          dayMap,
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, limit)
        .map(({ name, dayMap }) => ({
          name,
          data: dates.map((date) => ({ date, count: dayMap.get(date) ?? 0 })),
        }));

    return {
      teams: typeFilter === "players" || typeFilter === "competitions" ? [] : toSeries(teamByDay),
      competitions: typeFilter === "teams" || typeFilter === "players" ? [] : toSeries(compByDay),
      players: typeFilter === "teams" || typeFilter === "competitions" ? [] : toSeries(playerByDay),
      dates,
    };
  }
}
