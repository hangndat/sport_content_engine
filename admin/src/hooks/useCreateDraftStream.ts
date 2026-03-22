import { useState, useCallback } from 'react';
import { createDraftStream, type CreateDraftStreamEvent } from '../api';
import type { StreamStep } from '../components/StepBlock';
import type { WriterHistoryItem } from '../lib/writerHistory';

const CREATE_STEPS: { id: string; label: string; actor: string }[] = [
  { id: 'enrichment', label: 'Enrichment', actor: 'EnrichmentService' },
  { id: 'extract', label: 'Extract Facts', actor: 'FactExtractor' },
  { id: 'write', label: 'Content Write', actor: 'ContentWriter' },
  { id: 'guardrail', label: 'Guardrail', actor: 'Guardrail' },
  { id: 'insert', label: 'Insert', actor: 'DB' },
];

function formatData(data: unknown): string {
  if (data == null) return '';
  try {
    return typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
}

export function useCreateDraftStream() {
  const [steps, setSteps] = useState<StreamStep[]>([]);
  const [loading, setLoading] = useState(false);

  const run = useCallback(
    async (
      clusterId: string,
      options: { format?: string; tone?: string; instruction?: string } | undefined,
      onSuccess?: (draftId: string) => void,
      onError?: (err: string) => void,
      onComplete?: (session: Omit<WriterHistoryItem, 'id'>) => void
    ) => {
      const currentSteps: StreamStep[] = CREATE_STEPS.map((s) => ({
        ...s,
        content: '',
        status: 'pending' as const,
      }));
      currentSteps[0] = { ...currentSteps[0], status: 'active' };
      setLoading(true);
      setSteps([...currentSteps]);

      const updateStep = (
        id: string,
        upd: Partial<Pick<StreamStep, 'content' | 'status'>>
      ) => {
        const idx = currentSteps.findIndex((s) => s.id === id);
        if (idx >= 0) {
          currentSteps[idx] = { ...currentSteps[idx], ...upd };
          setSteps([...currentSteps]);
        }
      };

      const onEvent = (ev: CreateDraftStreamEvent) => {
        if (ev.t === 'step') {
          updateStep(ev.step, {
            content: formatData(ev.data),
            status: 'done',
          });
          const idx = CREATE_STEPS.findIndex((s) => s.id === ev.step);
          const nextId = CREATE_STEPS[idx + 1]?.id;
          if (nextId) updateStep(nextId, { status: 'active' });
        } else if (ev.t === 'done') {
          currentSteps.forEach((s) => (s.status = 'done'));
          if (ev.error) {
            const last = currentSteps[currentSteps.length - 1];
            if (last) last.content = (last.content || '') + `\n\nLỗi: ${ev.error}`;
          }
          setSteps([...currentSteps]);
        }
      };

      try {
        const res = await createDraftStream(clusterId, options, onEvent);
        if (res.ok && res.draftId) {
          onSuccess?.(res.draftId);
          onComplete?.({
            type: 'create',
            timestamp: Date.now(),
            clusterId,
            instruction: options?.instruction,
            steps: [...currentSteps],
            result: { draftId: res.draftId },
          });
        } else {
          const errMsg = res.error ?? 'Lỗi';
          onError?.(errMsg);
          onComplete?.({
            type: 'create',
            timestamp: Date.now(),
            clusterId,
            instruction: options?.instruction,
            steps: [...currentSteps],
            error: errMsg,
          });
        }
      } catch {
        onError?.('Tạo bản nháp thất bại');
        onComplete?.({
          type: 'create',
          timestamp: Date.now(),
          clusterId,
          instruction: options?.instruction,
          steps: [...currentSteps],
          error: 'Tạo bản nháp thất bại',
        });
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const reset = useCallback(() => {
    setSteps([]);
    setLoading(false);
  }, []);

  return { steps, loading, run, reset };
}
