import { ProTable } from '@ant-design/pro-components';
import { Card, Button, Tag, Typography, Space, Collapse } from 'antd';
import { usePagination } from '../hooks/usePagination';
import { getIngestRuns, triggerIngest } from '../api';
import { useState } from 'react';
import {
  ThunderboltOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  MinusCircleOutlined,
} from '@ant-design/icons';
import { STATUS_MAP, getStepLabel } from '../constants';
import { PageToolbar } from '../components/PageToolbar';

type IngestStep = {
  name: string;
  status: 'ok' | 'failed' | 'skipped';
  output?: Record<string, unknown>;
  error?: string;
  durationMs?: number;
};

type Run = {
  id: string;
  status: string;
  triggeredBy: string;
  articlesFetched: number;
  clustersCreated: number;
  error: string | null;
  steps?: IngestStep[] | null;
  startedAt: string;
  finishedAt: string | null;
};

export default function Crawl() {
  const { data: runs, loading, refetch, pagination } = usePagination<Run>(getIngestRuns);
  const [ingesting, setIngesting] = useState(false);

  const arr = (runs ?? []) as Run[];

  const handleCrawl = async () => {
    setIngesting(true);
    try {
      const data = await triggerIngest();
      if (data.ok) refetch();
    } finally {
      setIngesting(false);
    }
  };

  const renderSteps = (steps: IngestStep[] | null | undefined, run: Run) => {
    if (!steps || steps.length === 0) return null;
    return (
      <div style={{ padding: '12px 24px' }}>
        <Typography.Text type="secondary" style={{ marginBottom: 12, display: 'block', fontSize: 12 }}>
          {run.startedAt && new Date(run.startedAt).toLocaleString('vi-VN')}
        </Typography.Text>
        <Collapse
          size="small"
          defaultActiveKey={['0']}
          items={steps.map((s, i) => ({
            key: String(i),
            label: (
              <Space>
                {s.status === 'ok' && <CheckCircleOutlined style={{ color: '#52c41a' }} />}
                {s.status === 'failed' && <CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
                {s.status === 'skipped' && <MinusCircleOutlined style={{ color: '#8c8c8c' }} />}
                <span style={{ fontWeight: 500 }}>{getStepLabel(s.name)}</span>
                {s.durationMs != null && <Tag color="blue">{s.durationMs}ms</Tag>}
                {s.error && <Typography.Text type="danger">{s.error}</Typography.Text>}
              </Space>
            ),
            children: (
              <pre
                style={{
                  margin: 0,
                  fontSize: 12,
                  background: '#fafafa',
                  padding: 12,
                  borderRadius: 4,
                  overflow: 'auto',
                  maxHeight: 200,
                }}
              >
                {JSON.stringify(s.output ?? {}, null, 2)}
              </pre>
            ),
          }))}
        />
      </div>
    );
  };

  const lastSuccess = arr.find((r) => r.status === 'completed');

  return (
    <Card title="Lịch sử crawl">
      <PageToolbar onRefresh={refetch} loading={loading}>
        <Button
          type="primary"
          size="small"
          icon={<ThunderboltOutlined />}
          loading={ingesting}
          onClick={handleCrawl}
        >
          Crawl ngay
        </Button>
      </PageToolbar>
      {lastSuccess && arr.length > 0 && (
        <div style={{ marginBottom: 16, padding: '8px 12px', background: '#fafafa', borderRadius: 6 }}>
          <Typography.Text type="secondary">
            Lần gần nhất hoàn thành: {lastSuccess.articlesFetched} bài, {lastSuccess.clustersCreated} clusters
            {lastSuccess.startedAt && (
              <> · {new Date(lastSuccess.startedAt).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}</>
            )}
          </Typography.Text>
        </div>
      )}

      <ProTable
        loading={loading}
        dataSource={arr}
        rowKey="id"
        size="small"
        search={false}
        options={false}
        columns={[
          {
            title: 'Thời gian',
            dataIndex: 'startedAt',
            key: 'startedAt',
            width: 160,
            render: (_: unknown, r: Run) =>
              r.startedAt
                ? new Date(r.startedAt).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
                : '-',
          },
          {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            width: 110,
            render: (_: unknown, r: Run) => {
              const m = STATUS_MAP[r.status];
              return m ? <Tag color={m.color}>{m.label}</Tag> : <Tag>{r.status}</Tag>;
            },
          },
          {
            title: 'Thời lượng',
            key: 'duration',
            width: 90,
            render: (_: unknown, r: Run) => {
              if (r.status === 'running' || !r.finishedAt) return '-';
              const s = Math.round(
                (new Date(r.finishedAt).getTime() - new Date(r.startedAt).getTime()) / 1000,
              );
              return s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`;
            },
          },
          {
            title: 'Bài',
            dataIndex: 'articlesFetched',
            key: 'articlesFetched',
            width: 70,
            render: (_: unknown, r: Run) => r.articlesFetched ?? '-',
          },
          {
            title: 'Clusters',
            dataIndex: 'clustersCreated',
            key: 'clustersCreated',
            width: 85,
            render: (_: unknown, r: Run) => r.clustersCreated ?? '-',
          },
          {
            title: 'Kích hoạt',
            dataIndex: 'triggeredBy',
            key: 'triggeredBy',
            width: 90,
            render: (_: unknown, r: Run) =>
              r.triggeredBy === 'scheduled' ? 'Tự động' : 'Thủ công',
          },
          {
            title: 'Lỗi',
            dataIndex: 'error',
            key: 'error',
            ellipsis: true,
            render: (_: unknown, r: Run) =>
              r.error ? (
                <Typography.Text type="danger" ellipsis title={r.error}>
                  {r.error}
                </Typography.Text>
              ) : (
                '-'
              ),
          },
        ]}
        expandable={{
          expandedRowRender: (r: Run) => renderSteps(r.steps, r),
          rowExpandable: (r: Run) => !!r.steps?.length,
        }}
        pagination={pagination}
      />
    </Card>
  );
}
