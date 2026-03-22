import { API_BASE } from './client';

export async function getConfig() {
  const res = await fetch(`${API_BASE}/config`);
  return res.json();
}

export async function getStats() {
  const res = await fetch(`${API_BASE}/stats`);
  return res.json() as Promise<{
    articles: number;
    clusters: number;
    drafts: number;
    draftsPending: number;
    draftsApproved: number;
    sources: number;
    posts: number;
  }>;
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
