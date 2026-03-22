import { Tag } from 'antd';

export type StreamStep = {
  id: string;
  label: string;
  actor: string;
  content: string;
  status: 'pending' | 'active' | 'done';
};

export interface StepBlockProps {
  step: StreamStep;
  index: number;
  showCursor?: boolean;
  maxHeight?: number;
}

export function StepBlock({
  step,
  index,
  showCursor = false,
  maxHeight = 160,
}: StepBlockProps) {
  const headerBg =
    step.status === 'active'
      ? '#e6f7ff'
      : step.status === 'done'
        ? '#f6ffed'
        : '#fafafa';

  const tagColor =
    step.status === 'active'
      ? 'processing'
      : step.status === 'done'
        ? 'success'
        : 'default';

  return (
    <div
      style={{
        marginBottom: 12,
        border: '1px solid #f0f0f0',
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '8px 12px',
          background: headerBg,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <Tag color={tagColor}>Bước {index + 1}</Tag>
        <Tag>{step.label}</Tag>
        <Tag color="blue">{step.actor}</Tag>
      </div>
      {step.content && (
        <pre
          style={{
            margin: 0,
            padding: 12,
            fontSize: 12,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            maxHeight,
            overflowY: 'auto',
            background: '#fff',
          }}
        >
          {step.content}
          {showCursor && step.content && (
            <span style={{ opacity: 0.6 }}> ▊</span>
          )}
        </pre>
      )}
    </div>
  );
}
