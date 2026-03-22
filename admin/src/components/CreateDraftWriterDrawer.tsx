import { StreamWriterDrawer } from './StreamWriterDrawer';
import { useWriterDrawer } from '../hooks/useWriterDrawer';

export type CreateDraftWriterDrawerProps = {
  open: boolean;
  onClose: () => void;
  clusterId: string;
  options?: { format?: string; tone?: string; instruction?: string };
  onSuccess?: (draftId: string) => void;
  onError?: (err: string) => void;
  onNavigateToDraft?: (draftId: string) => void;
};

export function CreateDraftWriterDrawer({
  open,
  onClose,
  clusterId,
  options,
  onSuccess,
  onError,
  onNavigateToDraft,
}: CreateDraftWriterDrawerProps) {
  const {
    steps,
    loading,
    history,
    historyFilter,
    handleClose,
    successDraftId,
    onNavigateToDraft: onNav,
  } = useWriterDrawer({
    type: 'create',
    fetchKey: clusterId,
    options,
    open,
    onClose,
    onSuccess,
    onError,
    onNavigateToDraft,
  });

  return (
    <StreamWriterDrawer
      open={open}
      onClose={handleClose}
      title="Tạo bản nháp – theo dõi từng bước"
      steps={steps}
      loading={loading}
      width={520}
      history={history}
      historyFilter={historyFilter}
      successDraftId={successDraftId}
      onNavigateToDraft={onNav}
    />
  );
}
