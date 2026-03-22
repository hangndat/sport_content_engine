import { useState, useCallback } from 'react';
import { approveDraft, rejectDraft, publishDraft, getDraft } from '../api';
import type { DraftRow } from '../lib/draftShared';

export interface UseDraftActionsOptions {
  draftId: string | undefined;
  onSuccess?: (msg: string) => void;
  onError?: (msg: string) => void;
  refetch?: () => void;
  refreshDraft?: (draft: DraftRow) => void;
  onPublishSuccess?: () => void;
}

export function useDraftActions({
  draftId,
  onSuccess,
  onError,
  refetch,
  refreshDraft,
  onPublishSuccess,
}: UseDraftActionsOptions) {
  const [actioning, setActioning] = useState<string | null>(null);

  const runAction = useCallback(
    async (
      id: string,
      fn: () => Promise<unknown>,
      successMsg: string,
      options?: { refreshCurrent?: boolean }
    ) => {
      setActioning(id);
      try {
        await fn();
        onSuccess?.(successMsg);
        if (options?.refreshCurrent && draftId === id && refreshDraft) {
          const fresh = await getDraft(id);
          refreshDraft(fresh as DraftRow);
        } else {
          refetch?.();
        }
      } catch {
        onError?.('Thất bại');
      } finally {
        setActioning(null);
      }
    },
    [draftId, onSuccess, onError, refetch, refreshDraft]
  );

  const handleApprove = useCallback(
    (id: string) =>
      runAction(id, () => approveDraft(id), 'Đã duyệt', { refreshCurrent: true }),
    [runAction]
  );

  const handleReject = useCallback(
    (id: string) =>
      runAction(id, () => rejectDraft(id), 'Đã từ chối', { refreshCurrent: true }),
    [runAction]
  );

  const handlePublish = useCallback(
    async (id: string) => {
      setActioning(id);
      try {
        const res = await publishDraft(id);
        if (res.ok) {
          onSuccess?.(`Đã đăng: ${res.externalId ?? id}`);
          refetch?.();
          onPublishSuccess?.();
        } else {
          onError?.(res.error ?? 'Lỗi');
        }
      } catch {
        onError?.('Lỗi');
      } finally {
        setActioning(null);
      }
    },
    [onSuccess, onError, refetch, onPublishSuccess]
  );

  return { actioning, runAction, handleApprove, handleReject, handlePublish };
}
