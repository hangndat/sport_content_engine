export interface EmptyStateProps {
  message: string;
  loading?: boolean;
  count?: number;
}

const emptyStyle: React.CSSProperties = {
  color: '#666',
  textAlign: 'center',
  padding: 24,
};

export function EmptyState({ message, loading = false, count = 0 }: EmptyStateProps) {
  if (loading || count > 0) return null;
  return <p style={emptyStyle}>{message}</p>;
}
