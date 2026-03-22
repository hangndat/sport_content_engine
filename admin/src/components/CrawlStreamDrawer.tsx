import { Drawer, Tag, Typography } from 'antd';
import { SyncOutlined, CheckCircleOutlined, LoadingOutlined } from '@ant-design/icons';
import { getStepLabel } from '../constants';

export type CrawlStreamSource = { sourceId: string; count: number; error?: string };
export type CrawlStreamStep = {
  name: string;
  status: string;
  durationMs?: number;
  output?: Record<string, unknown>;
  error?: string;
};

export type CrawlStreamDrawerProps = {
  open: boolean;
  onClose: () => void;
  loading: boolean;
  sources: CrawlStreamSource[];
  steps: CrawlStreamStep[];
  result?: { ok: boolean; articlesFetched?: number; clustersCreated?: number; error?: string };
  /** Khi crawl đang chạy từ nguồn khác (schedule/khác tab), không có stream data */
  runningExternally?: boolean;
};

export function CrawlStreamDrawer({
  open,
  onClose,
  loading,
  sources,
  steps,
  result,
  runningExternally = false,
}: CrawlStreamDrawerProps) {
  return (
    <Drawer
      title={
        <span>
          <SyncOutlined style={{ marginRight: 8 }} />
          Crawl – Theo dõi từng bước
        </span>
      }
      open={open}
      onClose={onClose}
      width={480}
      closable={!loading}
      maskClosable={false}
    >
      <div style={{ maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}>
        {runningExternally && (
          <div
            style={{
              marginBottom: 24,
              padding: 12,
              background: '#e6f7ff',
              border: '1px solid #91d5ff',
              borderRadius: 8,
            }}
          >
            <Typography.Text>
              Đang có lần crawl chạy (từ nguồn khác). Vui lòng đợi hoặc refresh trang để cập nhật trạng thái.
            </Typography.Text>
          </div>
        )}
        {/* Thu thập theo nguồn */}
        <div style={{ marginBottom: 24 }}>
          <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
            1. Thu thập theo nguồn
          </Typography.Text>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {sources.length > 0 ? (
              sources.map((s, i) => (
                <Tag key={i} color={s.error ? 'error' : 'default'}>
                  {s.sourceId}: {s.count} bài{s.error ? ` (${s.error})` : ''}
                </Tag>
              ))
            ) : (
              <Typography.Text type="secondary">Đang đợi...</Typography.Text>
            )}
          </div>
        </div>

        {/* Pipeline */}
        <div style={{ marginBottom: 24 }}>
          <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
            2. Pipeline
          </Typography.Text>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {steps.length > 0 ? (
              steps.map((s, i) => (
                <div
                  key={i}
                  style={{
                    padding: '10px 12px',
                    background: s.status === 'ok' ? '#f6ffed' : s.status === 'failed' ? '#fff2f0' : '#fafafa',
                    border: `1px solid ${s.status === 'ok' ? '#b7eb8f' : s.status === 'failed' ? '#ffccc7' : '#f0f0f0'}`,
                    borderRadius: 8,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <Tag color={s.status === 'ok' ? 'success' : s.status === 'failed' ? 'error' : 'default'}>
                      {i + 1}. {getStepLabel(s.name)}
                    </Tag>
                    {s.durationMs != null && <Tag color="blue">{s.durationMs}ms</Tag>}
                    {s.error && <Typography.Text type="danger">{s.error}</Typography.Text>}
                  </div>
                  {s.output && Object.keys(s.output).length > 0 && (
                    <pre
                      style={{
                        margin: '8px 0 0 0',
                        fontSize: 11,
                        background: '#fff',
                        padding: 8,
                        borderRadius: 4,
                        overflow: 'auto',
                        maxHeight: 100,
                      }}
                    >
                      {JSON.stringify(s.output, null, 2)}
                    </pre>
                  )}
                </div>
              ))
            ) : (
              <Typography.Text type="secondary">Đang đợi...</Typography.Text>
            )}
          </div>
        </div>

        {/* Kết quả */}
        {result && (
          <div
            style={{
              padding: 12,
              background: result.ok ? '#f6ffed' : '#fff2f0',
              border: `1px solid ${result.ok ? '#b7eb8f' : '#ffccc7'}`,
              borderRadius: 8,
            }}
          >
            {result.ok ? (
              <span>
                <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                Hoàn thành: {result.articlesFetched} bài, {result.clustersCreated} clusters
              </span>
            ) : (
              <span>
                <Typography.Text type="danger">{result.error ?? 'Lỗi'}</Typography.Text>
              </span>
            )}
          </div>
        )}

        {loading && !result && (
          <div style={{ textAlign: 'center', padding: 24 }}>
            <LoadingOutlined spin style={{ fontSize: 32, color: '#1890ff' }} />
          </div>
        )}
      </div>
    </Drawer>
  );
}
