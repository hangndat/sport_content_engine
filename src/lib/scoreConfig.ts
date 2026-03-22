import { db, scoreConfig } from "../db/index.js";
import { eq } from "drizzle-orm";
import type { ScoreConfigPayload } from "../db/schema.js";

export type ScoreConfig = ScoreConfigPayload;

const DEFAULT_PAYLOAD: ScoreConfigPayload = {
  tierWeights: { "1": 3, "2": 2, "3": 1 },
  freshnessHours: 24,
  confirmMaxArticles: 5,
  confirmMultiplier: 2,
  viralBonusCap: 10,
  viralHotEntityMax: 3,
  viralCompetitionBonus: 2,
  viralContentTypeBonus: {
    result: 2,
    rumor: 1,
    debate: 1,
    stats: 1,
    opinion: 1,
    news: 0,
    schedule: 0,
  },
  viralCrossSourceBonus: { "2": 1, "3": 2, "4": 3 },
};

let cache: ScoreConfig | null = null;

function mergeWithDefaults(payload: Partial<ScoreConfigPayload> | null): ScoreConfig {
  if (!payload || typeof payload !== "object") return DEFAULT_PAYLOAD;

  return {
    tierWeights: { ...DEFAULT_PAYLOAD.tierWeights, ...payload.tierWeights },
    freshnessHours: payload.freshnessHours ?? DEFAULT_PAYLOAD.freshnessHours,
    confirmMaxArticles: payload.confirmMaxArticles ?? DEFAULT_PAYLOAD.confirmMaxArticles,
    confirmMultiplier: payload.confirmMultiplier ?? DEFAULT_PAYLOAD.confirmMultiplier,
    viralBonusCap: payload.viralBonusCap ?? DEFAULT_PAYLOAD.viralBonusCap,
    viralHotEntityMax: payload.viralHotEntityMax ?? DEFAULT_PAYLOAD.viralHotEntityMax,
    viralCompetitionBonus: payload.viralCompetitionBonus ?? DEFAULT_PAYLOAD.viralCompetitionBonus,
    viralContentTypeBonus: {
      ...DEFAULT_PAYLOAD.viralContentTypeBonus,
      ...payload.viralContentTypeBonus,
    },
    viralCrossSourceBonus: {
      ...DEFAULT_PAYLOAD.viralCrossSourceBonus,
      ...payload.viralCrossSourceBonus,
    },
  };
}

export async function getScoreConfig(): Promise<ScoreConfig> {
  if (cache) return cache;

  const [row] = await db
    .select()
    .from(scoreConfig)
    .where(eq(scoreConfig.id, "default"));

  const payload = row?.payload as Partial<ScoreConfigPayload> | null;
  cache = mergeWithDefaults(payload);
  return cache;
}

export function clearScoreConfigCache(): void {
  cache = null;
}

export { DEFAULT_PAYLOAD };
