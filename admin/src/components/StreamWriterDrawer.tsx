import { useState } from 'react';
import { Drawer, Tag, Collapse, Button } from 'antd';
import { RobotOutlined, HistoryOutlined, FileTextOutlined } from '@ant-design/icons';
import type { WriterHistoryItem } from '../lib/writerHistory';
import { StepBlock, type StreamStep } from './StepBlock';

export type { StreamStep } from './StepBlock';

export type StreamWriterDrawerProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  steps: StreamStep[];
  loading?: boolean;
  width?: number;
  history?: WriterHistoryItem[];
  historyFilter?: (item: WriterHistoryItem) => boolean;
  /** Hiển thị khi create draft thành công, cho phép navigate đến draft */
  successDraftId?: string;
  onNavigateToDraft?: (draftId: string) => void;
};

export function StreamWriterDrawer({
  open,
  onClose,
  title,
  steps,
  loading = false,
  width = 520,
  history = [],
  historyFilter,
  successDraftId,
  onNavigateToDraft,
}: StreamWriterDrawerProps) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const filteredHistory = historyFilter ? history.filter(historyFilter) : history;

  const footer =
    successDraftId && onNavigateToDraft ? (
      <Button
        type="primary"
        icon={<FileTextOutlined />}
        block
        onClick={() => onNavigateToDraft(successDraftId)}
      >
        Xem bản nháp
      </Button>
    ) : null;

  return (
    <Drawer
      title={
        <span>
          <RobotOutlined style={{ marginRight: 8 }} />
          {title}
        </span>
      }
      open={open}
      onClose={onClose}
      width={width}
      closable={!loading}
      maskClosable={false}
      footer={footer}
    >
      <div style={{ maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}>
        {steps.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>
              Phiên hiện tại
            </div>
            {steps.map((step, i) => (
              <StepBlock
                key={step.id}
                step={step}
                index={i}
                showCursor={step.status === 'active' && !!step.content}
              />
            ))}
          </div>
        )}

        {filteredHistory.length > 0 && (
          <Collapse
            activeKey={historyOpen ? ['history'] : []}
            onChange={(keys) => setHistoryOpen(keys.includes('history'))}
            items={[
              {
                key: 'history',
                label: (
                  <span>
                    <HistoryOutlined style={{ marginRight: 8 }} />
                    Lịch sử ({filteredHistory.length})
                  </span>
                ),
                children: (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {filteredHistory.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          border: '1px solid #e8e8e8',
                          borderRadius: 8,
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            padding: '8px 12px',
                            background: '#fafafa',
                            fontSize: 12,
                            color: '#666',
                          }}
                        >
                          {(item.createdAt
                          ? new Date(item.createdAt)
                          : new Date(item.timestamp ?? 0)
                        ).toLocaleString('vi-VN')}
                          {item.type === 'rewrite' && item.draftId && (
                            <Tag style={{ marginLeft: 8 }}>Draft {item.draftId.slice(0, 8)}</Tag>
                          )}
                          {item.type === 'create' && item.draftId && (
                            <Tag color="green" style={{ marginLeft: 8 }}>
                              → {item.draftId.slice(0, 8)}
                            </Tag>
                          )}
                          {item.error && (
                            <Tag color="red" style={{ marginLeft: 8 }}>
                              Lỗi
                            </Tag>
                          )}
                        </div>
                        <div style={{ padding: 12 }}>
                          {item.steps.map((step, i) => (
                            <StepBlock key={`${item.id}-${step.id}`} step={step} index={i} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ),
              },
            ]}
          />
        )}
      </div>
    </Drawer>
  );
}
