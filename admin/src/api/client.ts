export const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '' : '');

export function buildQueryString(params: Record<string, string | number | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== '') q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : '';
}

export async function parseSSE<T>(
  res: Response,
  onEvent: (ev: T) => void,
  extractResult: (ev: T) => unknown
): Promise<unknown> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? 'Request failed');
  }
  const reader = res.body?.getReader();
  if (!reader) throw new Error('No response body');

  const dec = new TextDecoder();
  let buf = '';
  let result: unknown = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() ?? '';
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const ev = JSON.parse(line.slice(6)) as T;
          onEvent(ev);
          const extracted = extractResult(ev);
          if (extracted != null) result = extracted;
        } catch {
          /* ignore parse errors */
        }
      }
    }
  }
  return result;
}
