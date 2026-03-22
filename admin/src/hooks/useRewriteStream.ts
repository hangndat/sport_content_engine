import { useState, useCallback } from 'react';
import { rewriteDraftStream, type RewriteStreamEvent } from '../api';
import type { StreamStep } from '../components/StepBlock';
import type { WriterHistoryItem } from '../lib/writerHistory';

const REWRITE_STEPS: Omit<StreamStep, 'content' | 'status'>[] = [
  { id: 'input', label: 'Input', actor: 'RewriteAgent' },
  { id: 'prompt', label: 'Prompt', actor: 'RewriteAgent' },
  { id: 'stream', label: 'LLM Output', actor: 'RewriteAgent' },
  { id: 'output', label: 'Output', actor: 'RewriteAgent' },
];

export function useRewriteStream() {
  const [steps, setSteps] = useState<StreamStep[]>([]);
  const [loading, setLoading] = useState(false);

  const run = useCallback(
    async (
      draftId: string,
      instruction: string | undefined,
      onSuccess?: (result: { headline: string; content: string }) => void,
      onError?: (err: string) => void,
      onComplete?: (session: Omit<WriterHistoryItem, 'id'>) => void
    ) => {
      const currentSteps: StreamStep[] = REWRITE_STEPS.map((s) => ({
        ...s,
        content: '',
        status: 'pending' as const,
      }));
      setLoading(true);
      setSteps([...currentSteps]);

      const updateStep = (
        id: string,
        upd: Partial<Pick<StreamStep, 'content' | 'status'>>
      ) => {
        const idx = currentSteps.findIndex((s) => s.id === id);
        if (idx >= 0) {
          currentSteps[idx] = { ...currentSteps[idx], ...upd } as StreamStep;
        }
        setSteps([...currentSteps]);
      };

      const appendStream = (chunk: string) => {
        const idx = currentSteps.findIndex((s) => s.id === 'stream');
        if (idx >= 0) {
          const prev = currentSteps[idx];
          currentSteps[idx] = {
            ...prev,
            content: prev.content + chunk,
            status: 'active',
          } as StreamStep;
          setSteps([...currentSteps]);
        }
      };

      const onEvent = (ev: RewriteStreamEvent) => {
        switch (ev.t) {
          case 'step_input':
            updateStep('input', {
              content: JSON.stringify(
                {
                  headline: ev.data.headline,
                  content: ev.data.content,
                  instruction: ev.data.instruction ?? null,
                },
                null,
                2
              ),
              status: 'done',
            });
            updateStep('prompt', { status: 'active' });
            break;
          case 'step_prompt':
            updateStep('prompt', { content: ev.data.prompt, status: 'done' });
            updateStep('stream', { status: 'active' });
            break;
          case 'stream_chunk':
            appendStream(ev.chunk);
            break;
          case 'step_output':
            updateStep('stream', { status: 'done' });
            updateStep('output', {
              content: `headline: ${ev.data.headline}\n\ncontent: ${ev.data.content}`,
              status: 'done',
            });
            break;
          case 'error':
            updateStep('stream', { status: 'done' });
            updateStep('output', { content: `Lỗi: ${ev.error}`, status: 'done' });
            break;
        }
      };

      try {
        const res = await rewriteDraftStream(draftId, instruction, onEvent);
        if (res.ok && res.headline != null && res.content != null) {
          onSuccess?.({ headline: res.headline, content: res.content });
          onComplete?.({
            type: 'rewrite',
            timestamp: Date.now(),
            draftId,
            instruction,
            steps: [...currentSteps],
            result: { headline: res.headline, content: res.content },
          });
        } else {
          const errMsg = res.error ?? 'Lỗi';
          onError?.(errMsg);
          onComplete?.({
            type: 'rewrite',
            timestamp: Date.now(),
            draftId,
            instruction,
            steps: [...currentSteps],
            error: errMsg,
          });
        }
      } catch {
        onError?.('Viết lại thất bại');
        onComplete?.({
          type: 'rewrite',
          timestamp: Date.now(),
          draftId,
          instruction,
          steps: [...currentSteps],
          error: 'Viết lại thất bại',
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
