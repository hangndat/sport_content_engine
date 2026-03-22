import { ProTable } from '@ant-design/pro-components';
import { Card, Button, Tag, Typography, Space, Collapse, App as AntdApp } from 'antd';
import { usePagination } from '../hooks/usePagination';
import { getIngestRuns, triggerIngestStream, type IngestStreamEvent } from '../api';
import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ThunderboltOutlined, CheckCircleOutlined, CloseCircleOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { STATUS_MAP, getStepLabel } from '../constants';
import { PageToolbar } from '../components/PageToolbar';
import { CrawlStreamDrawer, type CrawlStreamDrawerProps } from '../components/CrawlStreamDrawer';

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
  const { message } = AntdApp.useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: runs, loading, refetch, pagination } = usePagination<Run>(getIngestRuns, 100);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [streamSources, setStreamSources] = useState<CrawlStreamDrawerProps['sources']>([]);
  const [streamSteps, setStreamSteps] = useState<CrawlStreamDrawerProps['steps']>([]);
  const [streamResult, setStreamResult] = useState<CrawlStreamDrawerProps['result']>();
  const hasAutoStarted = useRef(false);

  const arr = (runs ?? []) as Run[];
  const hasRunning = arr.some((r) => r.status === 'running');

  useEffect(() => {
    if (searchParams.get('start') === '1' && !hasAutoStarted.current) {
      hasAutoStarted.current = true;
      setSearchParams({}, { replace: true });
      openDrawerAndCrawl();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get('start')]);

  const openDrawerAndCrawl = async () => {
    if (hasRunning) {
      setDrawerOpen(true);
      message.warning('Đang có lần crawl chạy. Vui lòng đợi hoàn thành.');
      return;
    }
    setDrawerOpen(true);
    setIngesting(true);
    setStreamSources([]);
    setStreamSteps([]);
    setStreamResult(undefined);
    try {
      const data = await triggerIngestStream((ev: IngestStreamEvent) => {
        if (ev.t === 'source') {
          setStreamSources((prev) => [...prev, { sourceId: ev.sourceId, count: ev.count, error: ev.error }]);
        } else if (ev.t === 'step') {
          setStreamSteps((prev) => [
            ...prev,
            {
              name: ev.step.name,
              status: ev.step.status,
              durationMs: ev.step.durationMs,
              output: ev.step.output,
              error: ev.step.error,
            },
          ]);
        } else if (ev.t === 'done') {
          setStreamResult({
            ok: ev.result.ok,
            articlesFetched: ev.result.articlesFetched,
            clustersCreated: ev.result.clustersCreated,
            error: ev.result.error,
          });
        }
      });
      if (data.ok) {
        message.success('Crawl hoàn thành');
        refetch();
      } else if (data.error?.includes('Đang có lần crawl')) {
        message.warning(data.error);
        refetch();
      } else {
        message.error(data.error ?? 'Crawl thất bại');
        refetch();
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Crawl thất bại';
      setStreamResult({ ok: false, error: msg });
      message.error(msg);
      refetch();
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
    <Card title="Lịch sử crawl" styles={{ header: { padding: '16px 20px' } }}>
      <PageToolbar onRefresh={refetch} loading={loading}>
        <Button
          type="primary"
          size="small"
          icon={<ThunderboltOutlined />}
          loading={ingesting}
          onClick={openDrawerAndCrawl}
        >
          Crawl ngay
        </Button>
      </PageToolbar>
      {hasRunning && !ingesting && (
        <div style={{ marginBottom: 16, padding: '12px 16px', background: '#e6f7ff', border: '1px solid #91d5ff', borderRadius: 6 }}>
          <Typography.Text>
            Đang crawl... Vui lòng đợi. Bạn có thể refresh trang để cập nhật trạng thái.
          </Typography.Text>
        </div>
      )}

      <CrawlStreamDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        loading={ingesting}
        sources={streamSources}
        steps={streamSteps}
        result={streamResult}
        runningExternally={hasRunning && !ingesting && streamSources.length === 0 && streamSteps.length === 0}
      />
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
        scroll={{ x: 720 }}
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
            responsive: ['sm'],
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
            responsive: ['md'],
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
