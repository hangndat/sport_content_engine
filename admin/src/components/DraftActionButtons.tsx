import { Button, Popconfirm, Space } from 'antd';
import { CheckOutlined, CloseOutlined, SendOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { RewritePopover } from './RewritePopover';
import type { DraftRow } from '../lib/draftShared';

export interface DraftActionButtonsProps {
  draft: DraftRow;
  actioning: string | null;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onPublish: (id: string) => void;
  onRewriteSuccess: (result: { headline: string; content: string }) => void;
  onRewriteError: (err: string) => void;
  /** Render as compact icon buttons (table) or full buttons (drawer/detail) */
  compact?: boolean;
}

export function DraftActionButtons({
  draft,
  actioning,
  onApprove,
  onReject,
  onPublish,
  onRewriteSuccess,
  onRewriteError,
  compact = false,
}: DraftActionButtonsProps) {
  const trigger = compact ? (
    <Button icon={<ThunderboltOutlined />} onClick={(e) => e.stopPropagation()}>
      Viết lại
    </Button>
  ) : (
    <Button icon={<ThunderboltOutlined />}>Viết lại</Button>
  );

  if (draft.status === 'pending') {
    return (
      <Space wrap>
        <RewritePopover
          draftId={draft.id}
          onSuccess={onRewriteSuccess}
          onError={onRewriteError}
          trigger={trigger}
        />
        {compact ? (
          <>
            <Button
              type="primary"
              size="small"
              icon={<CheckOutlined />}
              loading={actioning === draft.id}
              onClick={() => onApprove(draft.id)}
            >
              Duyệt
            </Button>
            <Popconfirm
              title="Từ chối draft?"
              onConfirm={() => onReject(draft.id)}
            >
              <Button
                danger
                size="small"
                icon={<CloseOutlined />}
                loading={actioning === draft.id}
              >
                Từ chối
              </Button>
            </Popconfirm>
          </>
        ) : (
          <>
            <Button
              type="primary"
              loading={actioning === draft.id}
              onClick={() => onApprove(draft.id)}
            >
              Duyệt
            </Button>
            <Popconfirm
              title="Từ chối draft?"
              onConfirm={() => onReject(draft.id)}
            >
              <Button danger loading={actioning === draft.id}>
                Từ chối
              </Button>
            </Popconfirm>
          </>
        )}
      </Space>
    );
  }

  if (draft.status === 'approved') {
    return (
      <Space wrap>
        <RewritePopover
          draftId={draft.id}
          onSuccess={onRewriteSuccess}
          onError={onRewriteError}
          trigger={trigger}
        />
        {compact ? (
          <Button
            type="primary"
            size="small"
            icon={<SendOutlined />}
            loading={actioning === draft.id}
            onClick={() => onPublish(draft.id)}
          >
            Đăng
          </Button>
        ) : (
          <Button
            type="primary"
            loading={actioning === draft.id}
            onClick={() => onPublish(draft.id)}
          >
            Đăng lên Facebook
          </Button>
        )}
      </Space>
    );
  }

  return (
    <RewritePopover
      draftId={draft.id}
      onSuccess={onRewriteSuccess}
      onError={onRewriteError}
      trigger={trigger}
    />
  );
}
