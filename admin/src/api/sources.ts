import { API_BASE, buildQueryString } from './client';

export async function getSources(params?: { limit?: number; offset?: number }) {
  const q = buildQueryString(params ?? {});
  const res = await fetch(`${API_BASE}/sources${q}`);
  return res.json() as Promise<{ data: unknown[]; total: number }>;
}

export async function createSource(body: {
  id: string;
  type: string;
  tier: number;
  url?: string;
  enabled?: boolean;
}) {
  const res = await fetch(`${API_BASE}/sources`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function updateSource(
  id: string,
  body: { url?: string; tier?: number; enabled?: boolean }
) {
  const res = await fetch(`${API_BASE}/sources/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function deleteSource(id: string) {
  const res = await fetch(`${API_BASE}/sources/${id}`, { method: 'DELETE' });
  return res.json();
}
