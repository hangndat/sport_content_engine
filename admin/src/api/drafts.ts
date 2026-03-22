import { API_BASE, buildQueryString, parseSSE } from './client';

export type CreateDraftStreamEvent =
  | { t: 'step'; step: string; actor: string; data?: unknown }
  | { t: 'done'; ok: boolean; draftId?: string; error?: string };

export type RewriteStreamEvent =
  | { t: 'step_input'; actor: string; data: { headline: string; content: string; summary?: string; instruction?: string } }
  | { t: 'step_prompt'; actor: string; data: { prompt: string } }
  | { t: 'stream_chunk'; actor: string; chunk: string }
  | { t: 'step_output'; actor: string; data: { headline: string; content: string } }
  | { t: 'error'; error: string }
  | { t: 'done'; ok: boolean; headline?: string; content?: string; error?: string };

export async function getDrafts(params?: {
  limit?: number;
  offset?: number;
  status?: string;
  format?: string;
}) {
  const q = buildQueryString(params ?? {});
  const res = await fetch(`${API_BASE}/drafts${q}`);
  return res.json() as Promise<{ data: unknown[]; total: number }>;
}

export async function getDraft(id: string) {
  const res = await fetch(`${API_BASE}/drafts/${id}`);
  return res.json();
}

export async function createDraft(
  clusterId: string,
  options?: { format?: string; tone?: string; instruction?: string }
) {
  const res = await fetch(`${API_BASE}/drafts/from-cluster/${clusterId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options ?? {}),
  });
  return res.json();
}

export async function createDraftStream(
  clusterId: string,
  options: { format?: string; tone?: string; instruction?: string } | undefined,
  onEvent: (ev: CreateDraftStreamEvent) => void
): Promise<{ ok: boolean; draftId?: string; error?: string }> {
  const res = await fetch(`${API_BASE}/drafts/from-cluster/${clusterId}?stream=1`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify(options ?? {}),
  });
  const result = await parseSSE<CreateDraftStreamEvent>(
    res,
    onEvent,
    (ev) => (ev.t === 'done' ? { ok: ev.ok, draftId: ev.draftId, error: ev.error } : null)
  );
  return (result as { ok: boolean; draftId?: string; error?: string }) ?? { ok: false };
}

export async function approveDraft(id: string) {
  const res = await fetch(`${API_BASE}/drafts/${id}/approve`, { method: 'POST' });
  return res.json();
}

export async function rejectDraft(id: string) {
  const res = await fetch(`${API_BASE}/drafts/${id}/reject`, { method: 'POST' });
  return res.json();
}

export async function updateDraft(
  id: string,
  body: { headline?: string; content?: string; tone?: string }
) {
  const res = await fetch(`${API_BASE}/drafts/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function rewriteDraft(id: string, instruction?: string) {
  const res = await fetch(`${API_BASE}/drafts/${id}/rewrite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ instruction: instruction || undefined }),
  });
  return res.json();
}

export async function rewriteDraftStream(
  id: string,
  instruction: string | undefined,
  onEvent: (ev: RewriteStreamEvent) => void
): Promise<{ ok: boolean; headline?: string; content?: string; error?: string }> {
  const res = await fetch(`${API_BASE}/drafts/${id}/rewrite?stream=1`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify({ instruction: instruction || undefined }),
  });
  const result = await parseSSE<RewriteStreamEvent>(
    res,
    onEvent,
    (ev) =>
      ev.t === 'done' ? { ok: ev.ok, headline: ev.headline, content: ev.content, error: ev.error } : null
  );
  return (result as { ok: boolean; headline?: string; content?: string; error?: string }) ?? { ok: false };
}

export async function selectVariant(id: string, variant: string) {
  const res = await fetch(`${API_BASE}/drafts/${id}/select-variant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ variant }),
  });
  return res.json();
}

export async function publishDraft(id: string) {
  const res = await fetch(`${API_BASE}/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ draftId: id }),
  });
  return res.json();
}
