import { Button, Tooltip, Popconfirm, Space } from 'antd';
import type { ButtonProps } from 'antd';
import type { ReactNode } from 'react';

export interface ActionIconProps {
  icon: ReactNode;
  title: string;
  onClick?: () => void;
  loading?: boolean;
  danger?: boolean;
  type?: ButtonProps['type'];
  disabled?: boolean;
}

/**
 * Icon-only button, text shown in tooltip on hover.
 */
export function ActionIcon({
  icon,
  title,
  onClick,
  loading,
  danger,
  type = 'default',
  disabled,
}: ActionIconProps) {
  const btn = (
    <Button
      type={type}
      size="small"
      icon={icon}
      loading={loading}
      danger={danger}
      disabled={disabled}
      onClick={onClick}
      style={{ padding: '4px 8px' }}
    />
  );
  return (
    <Tooltip title={title}>
      <span>{btn}</span>
    </Tooltip>
  );
}

export interface ActionIconConfirmProps extends ActionIconProps {
  confirmTitle: string;
  onConfirm: () => void | Promise<void>;
}

/**
 * Icon-only button with Popconfirm, text in tooltip on hover.
 */
export function ActionIconConfirm({
  icon,
  title,
  confirmTitle,
  onConfirm,
  loading,
  danger,
  type = 'default',
  disabled,
}: ActionIconConfirmProps) {
  const btn = (
    <Button
      type={type}
      size="small"
      icon={icon}
      loading={loading}
      danger={danger}
      disabled={disabled}
      style={{ padding: '4px 8px' }}
    />
  );
  return (
    <Tooltip title={title}>
      <span>
        <Popconfirm title={confirmTitle} onConfirm={onConfirm}>
          {btn}
        </Popconfirm>
      </span>
    </Tooltip>
  );
}

interface TableActionsProps {
  children: ReactNode;
  onClick?: (e: React.MouseEvent) => void;
}

/**
 * Compact horizontal group for table action buttons.
 */
export function TableActions({ children, onClick }: TableActionsProps) {
  return (
    <Space size={4} onClick={onClick} wrap>
      {children}
    </Space>
  );
}
