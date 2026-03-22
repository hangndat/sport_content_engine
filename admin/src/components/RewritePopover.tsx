import { useState } from 'react';
import { Button, Input, Popover, Typography } from 'antd';
import { ThunderboltOutlined } from '@ant-design/icons';
import { RewriteWriterDrawer } from './RewriteWriterDrawer';

export interface RewritePopoverProps {
  draftId: string;
  onSuccess: (result: { headline: string; content: string }) => void;
  onError: (err: string) => void;
  trigger?: React.ReactNode;
}

export function RewritePopover({
  draftId,
  onSuccess,
  onError,
  trigger,
}: RewritePopoverProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [instruction, setInstruction] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleOpenRewrite = () => {
    setPopoverOpen(false);
    setDrawerOpen(true);
  };

  const handleSuccess = (result: { headline: string; content: string }) => {
    onSuccess(result);
    setInstruction('');
    setDrawerOpen(false);
  };

  return (
    <>
      <Popover
        content={
          <div style={{ width: 280 }}>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Gợi ý cho GPT (tùy chọn)
            </Typography.Text>
            <Input.TextArea
              placeholder="VD: Viết ngắn hơn, Thêm emoji, Giọng vui hơn..."
              rows={2}
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              style={{ marginTop: 6, marginBottom: 8 }}
            />
            <Button type="primary" size="small" block onClick={handleOpenRewrite}>
              GPT viết lại
            </Button>
          </div>
        }
        title="Viết lại bằng GPT"
        trigger="click"
        open={popoverOpen}
        onOpenChange={setPopoverOpen}
      >
        {trigger ?? (
          <Button icon={<ThunderboltOutlined />}>Viết lại</Button>
        )}
      </Popover>
      <RewriteWriterDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        draftId={draftId}
        instruction={instruction.trim() || undefined}
        onSuccess={handleSuccess}
        onError={onError}
      />
    </>
  );
}
