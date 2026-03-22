import { sql } from "drizzle-orm";
import { storyClusters } from "../db/index.js";

export interface ClusterEntityFilter {
  team?: string;
  competition?: string;
  player?: string;
}

export interface ClusterQueryConditions {
  entityCond: ReturnType<typeof sql> | null;
  topicCond: ReturnType<typeof sql>;
  topicFilter: ReturnType<typeof sql> | null;
  filterIds: string[] | undefined;
}

/**
 * Build SQL conditions cho cluster listing — dùng chung giữa RankingService và route clusters/top.
 */
export function buildClusterQueryConditions(
  filterIds: string[] | undefined,
  entityFilter: ClusterEntityFilter | undefined,
  publishedAfter: Date | undefined
): ClusterQueryConditions {
  const teamVal = entityFilter?.team?.trim();
  const compVal = entityFilter?.competition?.trim();
  const playerVal = entityFilter?.player?.trim();
  const hasTime = !!publishedAfter;

  const entityParts: ReturnType<typeof sql>[] = [];
  if (teamVal) {
    entityParts.push(
      sql`EXISTS (SELECT 1 FROM jsonb_array_elements_text(COALESCE(a.teams,'[]'::jsonb)) e WHERE lower(e) = lower(${teamVal}))`
    );
  }
  if (compVal) {
    entityParts.push(
      sql`(a.competition IS NOT NULL AND lower(a.competition) = lower(${compVal}))`
    );
  }
  if (playerVal) {
    entityParts.push(
      sql`EXISTS (SELECT 1 FROM jsonb_array_elements_text(COALESCE(a.players,'[]'::jsonb)) e WHERE lower(e) = lower(${playerVal}))`
    );
  }

  const entityOrCond = entityParts.length > 0 ? sql.join(entityParts, sql` OR `) : null;
  const timeCond = hasTime
    ? sql`a.published_at >= ${publishedAfter!.toISOString()}::timestamptz`
    : null;
  const entityCond =
    entityOrCond && timeCond
      ? sql`(${entityOrCond}) AND (${timeCond})`
      : entityOrCond ?? timeCond;

  const topicCond =
    filterIds && filterIds.length > 0
      ? sql`AND (sc.topic_ids IS NULL OR sc.topic_ids ?| ARRAY[${sql.join(filterIds.map((id) => sql`${id}`), sql`, `)}]::text[])`
      : sql``;

  const topicFilter =
    filterIds && filterIds.length > 0
      ? sql`${storyClusters.topicIds} ?| ARRAY[${sql.join(filterIds.map((id) => sql`${id}`), sql`, `)}]::text[]`
      : null;

  return { entityCond, topicCond, topicFilter, filterIds };
}
