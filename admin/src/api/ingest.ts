import { API_BASE, buildQueryString } from './client';

export async function getIngestRuns(params?: { limit?: number; offset?: number }) {
  const q = buildQueryString(params ?? {});
  const res = await fetch(`${API_BASE}/ingest/runs${q}`);
  return res.json() as Promise<{ data: unknown[]; total: number }>;
}

export async function triggerIngest() {
  const res = await fetch(`${API_BASE}/ingest/fetch`, { method: 'POST' });
  return res.json();
}
