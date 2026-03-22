import { ProTable } from '@ant-design/pro-components';
import { Card, Tag, Typography, Modal } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import { usePagination } from '../hooks/usePagination';
import { ActionIcon, TableActions } from '../components/TableActions';
import { PageToolbar } from '../components/PageToolbar';
import { EmptyState } from '../components/EmptyState';
import { getArticles } from '../api';
import { useState } from 'react';

type ArticleRow = { id: string; title?: string; content?: string; url?: string; source?: string; contentType?: string; publishedAt?: string };

export default function Articles() {
  const { data: arr, loading, refetch, pagination } = usePagination(getArticles);
  const [detail, setDetail] = useState<{ title: string; content: string; url?: string; source?: string } | null>(null);
  const rows = (arr ?? []) as ArticleRow[];

  return (
    <>
      <Card title="Bài viết" styles={{ header: { padding: '16px 20px' } }}>
        <PageToolbar onRefresh={refetch} loading={loading} />
        <ProTable<ArticleRow>
          search={false}
          options={false}
          loading={loading}
          dataSource={rows}
          rowKey="id"
          expandable={{
            expandedRowRender: (r) => (
              <div style={{ padding: '8px 0' }}>
                <Typography.Paragraph
                  ellipsis={{ rows: 3, expandable: true }}
                  copyable
                  style={{ whiteSpace: 'pre-wrap', margin: 0 }}
                >
                  {r.content}
                </Typography.Paragraph>
                {r.url && (
                  <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12 }}>
                    Xem nguồn gốc
                  </a>
                )}
              </div>
            ),
            rowExpandable: (r) => !!r.content,
          }}
          columns={[
            {
              title: 'Tiêu đề',
              dataIndex: 'title',
              key: 'title',
              ellipsis: true,
              render: (_: unknown, r: ArticleRow) => (
                <a onClick={() => setDetail({ title: r.title ?? '', content: r.content ?? '', url: r.url, source: r.source })}>
                  {r.title}
                </a>
              ),
            },
            { title: 'Nguồn', dataIndex: 'source', key: 'source', width: 120 },
            {
              title: 'Loại',
              dataIndex: 'contentType',
              key: 'contentType',
              width: 90,
              render: (_: unknown, r: ArticleRow) => <Tag>{r.contentType}</Tag>,
            },
            {
              title: 'Ngày xuất bản',
              dataIndex: 'publishedAt',
              key: 'publishedAt',
              width: 160,
              render: (_: unknown, r: ArticleRow) => (r.publishedAt ? new Date(r.publishedAt).toLocaleString('vi-VN') : '-'),
            },
            {
              title: '',
              key: 'view',
              width: 48,
              render: (_: unknown, r: ArticleRow) => (
                <TableActions>
                  <ActionIcon
                    icon={<EyeOutlined />}
                    title="Chi tiết"
                    onClick={() => setDetail({
                      title: r.title ?? '',
                      content: r.content ?? '',
                      url: r.url,
                      source: r.source,
                    })}
                  />
                </TableActions>
              ),
            },
          ]}
          pagination={pagination}
        />
        <EmptyState
          message="Chưa có bài. Bấm Trigger Ingest để crawl."
          loading={loading}
          count={rows.length}
        />
      </Card>

      <Modal
        open={!!detail}
        title={detail?.title}
        footer={null}
        onCancel={() => setDetail(null)}
        width={680}
      >
        {detail && (
          <>
            {detail.source && <p style={{ color: '#666', marginBottom: 8 }}>Nguồn: {detail.source}</p>}
            {detail.url && (
              <p style={{ marginBottom: 12 }}>
                <a href={detail.url} target="_blank" rel="noopener noreferrer">Mở link gốc</a>
              </p>
            )}
            <div
              style={{
                maxHeight: 400,
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                padding: 12,
                background: '#fafafa',
                borderRadius: 6,
              }}
            >
              {detail.content}
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
