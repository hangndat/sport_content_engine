import { API_BASE, buildQueryString, parseSSE } from './client';

export async function getIngestRuns(params?: { limit?: number; offset?: number }) {
  const q = buildQueryString(params ?? {});
  const res = await fetch(`${API_BASE}/ingest/runs${q}`);
  return res.json() as Promise<{ data: unknown[]; total: number }>;
}

export type TriggerIngestResult =
  | { ok: true; runId?: string; articlesFetched?: number; clustersCreated?: number }
  | { ok: false; error?: string; status?: number };

export async function triggerIngest(): Promise<TriggerIngestResult> {
  const res = await fetch(`${API_BASE}/ingest/fetch`, { method: 'POST' });
  const data = (await res.json()) as Record<string, unknown>;
  return { ...data, status: res.status } as TriggerIngestResult;
}

export type IngestStreamEvent =
  | { t: 'start'; runId: string }
  | { t: 'source'; sourceId: string; count: number; error?: string }
  | { t: 'step'; step: { name: string; status: string; durationMs?: number; output?: Record<string, unknown>; error?: string } }
  | { t: 'done'; result: { ok: boolean; articlesFetched: number; clustersCreated: number; clustersNew: number; clustersUpdated: number; error?: string } }
  | { t: 'error'; error: string };

export async function triggerIngestStream(
  onEvent: (ev: IngestStreamEvent) => void
): Promise<{ ok: boolean; runId?: string; error?: string }> {
  const res = await fetch(`${API_BASE}/ingest/fetch?stream=1`, {
    method: 'POST',
    headers: { Accept: 'text/event-stream', 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  let runId: string | undefined;
  const result = await parseSSE<IngestStreamEvent>(
    res,
    (ev) => {
      if (ev.t === 'start') runId = ev.runId;
      onEvent(ev);
    },
    (ev) => (ev.t === 'done' ? (ev as { t: 'done'; result: { ok: boolean; error?: string } }).result : null)
  );
  const done = result as { ok: boolean; error?: string } | null;
  return { ok: done?.ok ?? false, runId, error: done?.error };
}
