import { Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import type { ReactNode } from 'react';

export interface PageToolbarProps {
  children?: ReactNode;
  onRefresh?: () => void;
  loading?: boolean;
}

const toolbarStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: 12,
  padding: '12px 0 16px',
  marginBottom: 16,
  borderBottom: '1px solid #f0f0f0',
};

export function PageToolbar({
  children,
  onRefresh,
  loading = false,
}: PageToolbarProps) {
  return (
    <div className="page-toolbar" style={toolbarStyle}>
      {children}
      {onRefresh && (
        <>
          <span style={{ flex: 1 }} />
          <Button
            size="small"
            icon={<ReloadOutlined />}
            onClick={onRefresh}
            loading={loading}
          >
            Làm mới
          </Button>
        </>
      )}
    </div>
  );
}
