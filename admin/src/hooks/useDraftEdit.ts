import { useState, useCallback, useEffect } from 'react';
import { updateDraft } from '../api';
import type { DraftRow } from '../lib/draftShared';

export interface UseDraftEditOptions {
  draft: DraftRow | null;
  onSuccess?: (draft: DraftRow) => void;
  onError?: (msg: string) => void;
  refetch?: () => void;
}

export function useDraftEdit({
  draft,
  onSuccess,
  onError,
  refetch,
}: UseDraftEditOptions) {
  const [editHeadline, setEditHeadline] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editTone, setEditTone] = useState('neutral');
  const [saving, setSaving] = useState(false);

  const syncFromDraft = useCallback((d: DraftRow) => {
    setEditHeadline(d.headline);
    setEditContent(d.content);
    setEditTone(d.tone ?? 'neutral');
  }, []);

  useEffect(() => {
    if (draft) syncFromDraft(draft);
  }, [draft, syncFromDraft]);

  const handleSaveEdit = useCallback(async (): Promise<boolean> => {
    if (!draft) return false;
    const changed =
      editHeadline !== draft.headline || editContent !== draft.content;
    const toneChanged = editTone !== (draft.tone ?? 'neutral');
    if (!changed && !toneChanged) {
      return false; // Caller can show message.info
    }
    setSaving(true);
    try {
      const res = await updateDraft(draft.id, {
        ...(changed && { headline: editHeadline, content: editContent }),
        ...(toneChanged && { tone: editTone }),
      });
      if (res.ok) {
        onSuccess?.({
          ...draft,
          headline: editHeadline,
          content: editContent,
          tone: editTone,
        });
        refetch?.();
      } else {
        onError?.(res.error ?? 'Lỗi');
      }
    } catch {
      onError?.('Lưu thất bại');
    } finally {
      setSaving(false);
    }
    return true;
  }, [draft, editHeadline, editContent, editTone, onSuccess, onError, refetch]);

  return {
    editHeadline,
    setEditHeadline,
    editContent,
    setEditContent,
    editTone,
    setEditTone,
    saving,
    handleSaveEdit,
    syncFromDraft,
  };
}
