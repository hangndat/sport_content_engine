import { ProTable } from '@ant-design/pro-components';
import { Card } from 'antd';
import { usePagination } from '../hooks/usePagination';
import { PageToolbar } from '../components/PageToolbar';
import { EmptyState } from '../components/EmptyState';
import { getPosts } from '../api';

export default function Posts() {
  const { data: arr, loading, refetch, pagination } = usePagination(getPosts);
  const rows = (arr ?? []) as { id: string; platform: string; externalId?: string; publishedAt?: string; status?: string }[];

  return (
    <Card title="Bài đã đăng" styles={{ header: { padding: '16px 20px' } }}>
      <PageToolbar onRefresh={refetch} loading={loading} />
      <ProTable
        search={false}
        options={false}
        loading={loading}
        dataSource={rows}
        rowKey="id"
        columns={[
          { title: 'Platform', dataIndex: 'platform', key: 'platform', width: 100 },
          { title: 'External ID', dataIndex: 'externalId', key: 'externalId', ellipsis: true },
            {
              title: 'Ngày đăng',
              dataIndex: 'publishedAt',
              key: 'publishedAt',
              render: (_: unknown, r: { publishedAt?: string }) =>
                r.publishedAt ? new Date(r.publishedAt).toLocaleString('vi-VN') : '-',
            },
          { title: 'Trạng thái', dataIndex: 'status', key: 'status', width: 100 },
        ]}
        pagination={pagination}
      />
      <EmptyState
        message="Chưa có bài đăng. Duyệt draft rồi bấm Đăng."
        loading={loading}
        count={rows.length}
      />
    </Card>
  );
}
