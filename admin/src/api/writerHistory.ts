import { API_BASE, buildQueryString } from './client';

export type WriterHistoryItem = {
  id: string;
  type: 'rewrite' | 'create';
  draftId?: string | null;
  clusterId?: string | null;
  instruction?: string | null;
  steps: unknown[];
  result?: { headline?: string; content?: string; draftId?: string } | null;
  error?: string | null;
  createdAt?: string;
};

export async function getWriterHistory(params?: {
  limit?: number;
  offset?: number;
  type?: 'rewrite' | 'create';
}) {
  const q = buildQueryString(params ?? {});
  const res = await fetch(`${API_BASE}/writer-history${q}`);
  return res.json() as Promise<{ data: WriterHistoryItem[]; total: number }>;
}

export async function getWriterHistoryItem(id: string) {
  const res = await fetch(`${API_BASE}/writer-history/${id}`);
  return res.json() as Promise<WriterHistoryItem>;
}

export async function saveWriterHistoryItem(body: {
  type: 'rewrite' | 'create';
  draftId?: string;
  clusterId?: string;
  instruction?: string;
  steps: unknown[];
  result?: { headline?: string; content?: string; draftId?: string };
  error?: string;
}) {
  const res = await fetch(`${API_BASE}/writer-history`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json() as Promise<WriterHistoryItem>;
}
