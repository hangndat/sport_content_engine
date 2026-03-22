import { useEffect, useRef, useState, useCallback } from 'react';
import { getWriterHistory, saveWriterHistoryItem } from '../api';
import type { WriterHistoryItem } from '../lib/writerHistory';
import { useCreateDraftStream } from './useCreateDraftStream';
import { useRewriteStream } from './useRewriteStream';

type CreateConfig = {
  type: 'create';
  fetchKey: string; // clusterId
  options?: { format?: string; tone?: string; instruction?: string };
  onSuccess?: (draftId: string) => void;
  onNavigateToDraft?: (draftId: string) => void;
};

type RewriteConfig = {
  type: 'rewrite';
  fetchKey: string; // draftId
  instruction?: string;
  onSuccess?: (result: { headline: string; content: string }) => void;
};

export type UseWriterDrawerConfig = (CreateConfig | RewriteConfig) & {
  open: boolean;
  onClose: () => void;
  onError?: (err: string) => void;
};

export function useWriterDrawer(config: UseWriterDrawerConfig) {
  const { open, onClose, onError } = config;
  const ranRef = useRef<string | null>(null);
  const [history, setHistory] = useState<WriterHistoryItem[]>([]);
  const [successDraftId, setSuccessDraftId] = useState<string | null>(null);

  const createStream = useCreateDraftStream();
  const rewriteStream = useRewriteStream();

  const historyType = config.type;
  const fetchHistory = useCallback(() => {
    getWriterHistory({ type: historyType, limit: 50 })
      .then((res) => setHistory((res.data ?? []) as WriterHistoryItem[]))
      .catch(() => {});
  }, [historyType]);

  useEffect(() => {
    if (open) fetchHistory();
  }, [open, fetchHistory]);

  const mapSession = useCallback(
    (session: Omit<WriterHistoryItem, 'id'>) => ({
      type: session.type,
      clusterId: session.clusterId ?? undefined,
      draftId: session.draftId ?? undefined,
      instruction: session.instruction ?? undefined,
      steps: session.steps,
      result: session.result ?? undefined,
      error: session.error ?? undefined,
    }),
    []
  );

  useEffect(() => {
    const key = `${config.fetchKey}:${open}`;
    if (!open) {
      // Defer state reset to avoid sync setState in effect
      ranRef.current = null;
      if (config.type === 'create') queueMicrotask(() => setSuccessDraftId(null));
      return;
    }
    if (!config.fetchKey || ranRef.current === key) return;

    ranRef.current = key;
    if (config.type === 'create') queueMicrotask(() => setSuccessDraftId(null));

    if (config.type === 'create') {
      createStream.run(
        config.fetchKey,
        config.options,
        (draftId) => {
          config.onSuccess?.(draftId);
          setSuccessDraftId(draftId);
        },
        onError,
        async (session) => {
          await saveWriterHistoryItem(mapSession(session));
          fetchHistory();
        }
      );
    } else {
      rewriteStream.run(
        config.fetchKey,
        config.instruction,
        config.onSuccess,
        onError,
        async (session) => {
          await saveWriterHistoryItem(mapSession(session));
          fetchHistory();
        }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional run-once when open/fetchKey changes
  }, [open, config.fetchKey, config.type]);

  const handleClose = useCallback(() => {
    const stream = config.type === 'create' ? createStream : rewriteStream;
    if (!stream.loading) {
      stream.reset();
      if (config.type === 'create') setSuccessDraftId(null);
      onClose();
    }
  }, [config.type, createStream, rewriteStream, onClose]);

  const stream = config.type === 'create' ? createStream : rewriteStream;

  return {
    steps: stream.steps,
    loading: stream.loading,
    history,
    historyFilter: (item: WriterHistoryItem) => item.type === historyType,
    handleClose,
    successDraftId: config.type === 'create' ? successDraftId ?? undefined : undefined,
    onNavigateToDraft: config.type === 'create' ? config.onNavigateToDraft : undefined,
  };
}
