import { API_BASE } from './client';

export async function getConfig() {
  const res = await fetch(`${API_BASE}/config`);
  return res.json();
}

export type LastIngestRun = {
  id: string;
  status: string;
  startedAt: string;
  finishedAt?: string;
  articlesFetched?: number;
  clustersCreated?: number;
  error?: string;
};

export type StatsResponse = {
  articles: number;
  clusters: number;
  drafts: number;
  draftsPending: number;
  draftsApproved: number;
  sources: number;
  posts: number;
  sourcesEnabled?: number;
  clustersWithoutDraft?: number;
  articlesLast24h?: number;
  clustersLast24h?: number;
  postsLast24h?: number;
  lastIngestRun?: LastIngestRun;
};

export async function getStats() {
  const res = await fetch(`${API_BASE}/stats`);
  return res.json() as Promise<StatsResponse>;
}

export type ArticlesByDayItem = { date: string; count: number };

export async function getArticlesByDay(params?: { days?: number }) {
  const q = new URLSearchParams();
  if (params?.days != null) q.set('days', String(params.days));
  const res = await fetch(`${API_BASE}/stats/articles-by-day${q ? `?${q}` : ''}`);
  return res.json() as Promise<{ data: ArticlesByDayItem[] }>;
}

export async function getTrends(params?: { hours?: number; limit?: number }) {
  const q = new URLSearchParams();
  if (params?.hours != null) q.set('hours', String(params.hours));
  if (params?.limit != null) q.set('limit', String(params.limit));
  const res = await fetch(`${API_BASE}/trends?${q}`);
  return res.json() as Promise<{
    teams: { name: string; count: number }[];
    competitions: { name: string; count: number }[];
    players: { name: string; count: number }[];
  }>;
}

export type TrendDailyResponse = {
  teams: { name: string; data: { date: string; count: number }[] }[];
  competitions: { name: string; data: { date: string; count: number }[] }[];
  players: { name: string; data: { date: string; count: number }[] }[];
  dates: string[];
};

export async function getTrendsDaily(params?: {
  days?: number;
  limit?: number;
  type?: 'teams' | 'players' | 'competitions' | 'all';
}) {
  const q = new URLSearchParams();
  if (params?.days != null) q.set('days', String(params.days));
  if (params?.limit != null) q.set('limit', String(params.limit));
  if (params?.type) q.set('type', params.type);
  const res = await fetch(`${API_BASE}/trends/daily?${q}`);
  return res.json() as Promise<TrendDailyResponse>;
}

export async function getGptWriterConfig() {
  const res = await fetch(`${API_BASE}/config/gpt-writer`);
  return res.json() as Promise<{
    model: string;
    temperature: number;
    basePromptRewrite: string;
    basePromptContentWriter: string;
  }>;
}

export async function updateGptWriterConfig(body: {
  model?: string;
  temperature?: number;
  basePromptRewrite?: string;
  basePromptContentWriter?: string;
}) {
  const res = await fetch(`${API_BASE}/config/gpt-writer`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json() as Promise<{
    model: string;
    temperature: number;
    basePromptRewrite: string;
    basePromptContentWriter: string;
  }>;
}

export type ScoreConfig = {
  tierWeights: Record<string, number>;
  freshnessHours: number;
  confirmMaxArticles: number;
  confirmMultiplier: number;
  viralBonusCap: number;
  viralHotEntityMax: number;
  viralCompetitionBonus: number;
  viralContentTypeBonus: Record<string, number>;
  viralCrossSourceBonus: Record<string, number>;
};

export async function getScoreConfig() {
  const res = await fetch(`${API_BASE}/config/score`);
  return res.json() as Promise<ScoreConfig>;
}

export async function updateScoreConfig(body: Partial<ScoreConfig>) {
  const res = await fetch(`${API_BASE}/config/score`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json() as Promise<ScoreConfig>;
}

export type RescoreResult = {
  total: number;
  changed: number;
  unchanged: number;
  errors: number;
  changes: {
    clusterId: string;
    canonicalTitle: string;
    oldScore: number;
    newScore: number;
    delta: number;
  }[];
};

export async function rescoreClusters() {
  const res = await fetch(`${API_BASE}/config/score/rescore`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  return res.json() as Promise<RescoreResult>;
}
