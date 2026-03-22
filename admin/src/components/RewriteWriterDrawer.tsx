import { StreamWriterDrawer } from './StreamWriterDrawer';
import { useWriterDrawer } from '../hooks/useWriterDrawer';

export type RewriteWriterDrawerProps = {
  open: boolean;
  onClose: () => void;
  draftId: string;
  instruction?: string;
  onSuccess?: (result: { headline: string; content: string }) => void;
  onError?: (err: string) => void;
};

export function RewriteWriterDrawer({
  open,
  onClose,
  draftId,
  instruction,
  onSuccess,
  onError,
}: RewriteWriterDrawerProps) {
  const { steps, loading, history, historyFilter, handleClose } = useWriterDrawer({
    type: 'rewrite',
    fetchKey: draftId,
    instruction,
    open,
    onClose,
    onSuccess,
    onError,
  });

  return (
    <StreamWriterDrawer
      open={open}
      onClose={handleClose}
      title="Viết lại – theo dõi từng bước"
      steps={steps}
      loading={loading}
      width={520}
      history={history}
      historyFilter={historyFilter}
    />
  );
}
