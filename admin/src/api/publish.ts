import { API_BASE, buildQueryString } from './client';

export async function getPosts(params?: { limit?: number; offset?: number }) {
  const q = buildQueryString(params ?? {});
  const res = await fetch(`${API_BASE}/publish/posts${q}`);
  return res.json() as Promise<{ data: unknown[]; total: number }>;
}
