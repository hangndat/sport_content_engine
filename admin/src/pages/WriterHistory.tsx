import { useState } from 'react';
import { ProTable } from '@ant-design/pro-components';
import { Card, Tag, Typography, Select } from 'antd';
import { HistoryOutlined, FileTextOutlined, EditOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { usePagination } from '../hooks/usePagination';
import { getWriterHistory, type WriterHistoryItem } from '../api';
import { StepBlock } from '../components/StepBlock';
import type { StreamStep } from '../components/StepBlock';

export default function WriterHistory() {
  const navigate = useNavigate();
  const [typeFilter, setTypeFilter] = useState<string>('');
  const { data: items, loading, pagination } = usePagination(
    getWriterHistory,
    20,
    typeFilter ? { type: typeFilter as 'rewrite' | 'create' } : undefined,
    [typeFilter]
  );

  const arr = (items ?? []) as WriterHistoryItem[];

  return (
    <Card
      title={
        <span>
          <HistoryOutlined style={{ marginRight: 8 }} />
          Lịch sử viết
        </span>
      }
      extra={
        <Select
          placeholder="Loại"
          allowClear
          style={{ width: 140 }}
          value={typeFilter || undefined}
          onChange={(v) => setTypeFilter(v ?? '')}
          options={[
            { value: 'rewrite', label: 'Viết lại' },
            { value: 'create', label: 'Tạo bản nháp' },
          ]}
        />
      }
    >
      <ProTable
        dataSource={arr}
        loading={loading}
        rowKey="id"
        pagination={pagination}
        search={false}
        toolBarRender={() => []}
        columns={[
          {
            title: 'Thời gian',
            dataIndex: 'createdAt',
            width: 170,
            render: (_: unknown, r: WriterHistoryItem) =>
              r.createdAt ? new Date(r.createdAt).toLocaleString('vi-VN') : '-',
          },
          {
            title: 'Loại',
            dataIndex: 'type',
            width: 110,
            render: (_: unknown, r: WriterHistoryItem) => (
              <Tag color={r.type === 'rewrite' ? 'blue' : 'green'}>
                {r.type === 'rewrite' ? (
                  <><EditOutlined /> Viết lại</>
                ) : (
                  <><FileTextOutlined /> Tạo</>
                )}
              </Tag>
            ),
          },
          {
            title: 'Draft/Cluster',
            key: 'ref',
            render: (_: unknown, r: WriterHistoryItem) => (
              <span>
                {r.draftId && (
                  <a onClick={() => navigate(`/drafts/${r.draftId}`)}>
                    Draft {r.draftId.slice(0, 8)}…
                  </a>
                )}
                {r.clusterId && (
                  <a onClick={() => navigate(`/clusters/${r.clusterId}`)}>
                    Cluster {r.clusterId.slice(0, 8)}…
                  </a>
                )}
                {r.result?.draftId && r.type === 'create' && (
                  <a
                    onClick={() => navigate(`/drafts/${r.result!.draftId}`)}
                    style={{ marginLeft: 8 }}
                  >
                    → Draft {r.result.draftId.slice(0, 8)}…
                  </a>
                )}
              </span>
            ),
          },
          {
            title: 'Trạng thái',
            key: 'status',
            width: 80,
            render: (_: unknown, r: WriterHistoryItem) =>
              r.error ? (
                <Tag color="red">Lỗi</Tag>
              ) : (
                <Tag color="success">OK</Tag>
              ),
          },
        ]}
        expandable={{
          expandedRowRender: (record: WriterHistoryItem) => (
            <div style={{ padding: '12px 24px' }}>
              {record.instruction && (
                <Typography.Paragraph type="secondary" style={{ marginBottom: 12, fontSize: 12 }}>
                  Gợi ý: {record.instruction}
                </Typography.Paragraph>
              )}
              {(record.steps as StreamStep[]).map((step, i) => (
                <StepBlock key={step.id} step={step} index={i} maxHeight={140} />
              ))}
            </div>
          ),
          rowExpandable: () => true,
        }}
      />
    </Card>
  );
}
