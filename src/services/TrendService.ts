import { gte, lte, and } from "drizzle-orm";
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

export class TrendService {
  async getTrends(hours = TREND_HOURS, limit = TOP_LIMIT): Promise<Trends> {
    const cutoff = new Date(Date.now() - hours * MS_PER_HOUR);
    const rows = await db
      .select({ teams: articles.teams, players: articles.players, competition: articles.competition })
      .from(articles)
      .where(gte(articles.publishedAt, cutoff));

    const teamCounts = new Map<string, number>();
    const playerCounts = new Map<string, number>();
    const competitionCounts = new Map<string, number>();

    for (const r of rows) {
      for (const t of r.teams ?? []) {
        const key = normalizeName(t);
        if (key.length >= 2) teamCounts.set(key, (teamCounts.get(key) ?? 0) + 1);
      }
      for (const p of r.players ?? []) {
        const key = normalizeName(p);
        if (key.length >= 2) playerCounts.set(key, (playerCounts.get(key) ?? 0) + 1);
      }
      if (r.competition?.trim()) {
        const key = normalizeName(r.competition);
        competitionCounts.set(key, (competitionCounts.get(key) ?? 0) + 1);
      }
    }

    const toTrendList = (m: Map<string, number>): TrendItem[] =>
      [...m.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([name, count]) => ({ name, count }));

    return {
      teams: toTrendList(teamCounts),
      competitions: toTrendList(competitionCounts),
      players: toTrendList(playerCounts),
    };
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
