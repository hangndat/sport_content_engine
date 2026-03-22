import { API_BASE, buildQueryString } from './client';

export async function getArticles(params?: { limit?: number; offset?: number }) {
  const q = buildQueryString(params ?? {});
  const res = await fetch(`${API_BASE}/articles${q}`);
  return res.json() as Promise<{ data: unknown[]; total: number }>;
}

export async function getArticle(id: string) {
  const res = await fetch(`${API_BASE}/articles/${id}`);
  return res.json();
}
