import { ProTable } from '@ant-design/pro-components';
import { Card, Button, Tag, Typography, Select } from 'antd';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { usePagination } from '../hooks/usePagination';
import { ActionIcon, TableActions } from '../components/TableActions';
import { PageToolbar } from '../components/PageToolbar';
import { EmptyState } from '../components/EmptyState';
import { getClusters, getClustersTopics, getClustersCategories } from '../api';
import { useState, useEffect } from 'react';
import { LinkOutlined, FileAddOutlined, FullscreenOutlined } from '@ant-design/icons';
import { TOPIC_COLORS } from '../constants';

type ArticleInfo = {
  id: string;
  title: string;
  source: string;
  publishedAt: string;
  url?: string;
};
type Cluster = {
  id: string;
  score?: number;
  topic?: string | null;
  articleIds?: string[];
  canonicalTitle?: string | null;
  articles?: ArticleInfo[];
  draftCount?: number;
};

export default function Clusters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const topicFromUrl = searchParams.get('topic') || undefined;
  const categoryFromUrl = searchParams.get('category') || undefined;
  const [category, setCategory] = useState<string>(categoryFromUrl || 'all');
  const [topic, setTopic] = useState<string | undefined>(topicFromUrl);
  const [topics, setTopics] = useState<{ id: string; label: string }[]>([]);
  const [categories, setCategories] = useState<{
    id: string;
    label: string;
    topicIds: string[];
  }[]>([]);

  useEffect(() => {
    setTopic(topicFromUrl);
    if (categoryFromUrl) setCategory(categoryFromUrl);
  }, [topicFromUrl, categoryFromUrl]);

  const filterParams =
    category && category !== 'all'
      ? { category }
      : topic
        ? { topic }
        : undefined;

  const {
    data: clusters,
    loading,
    refetch,
    pagination,
  } = usePagination<Cluster>(getClusters, 20, filterParams, [category, topic]);

  useEffect(() => {
    Promise.all([getClustersTopics(), getClustersCategories()])
      .then(([topicsRes, catsRes]) => {
        setTopics(topicsRes.data ?? []);
        setCategories(catsRes.data ?? []);
      })
      .catch(() => {});
  }, []);

  const arr = (clusters ?? []) as Cluster[];

  const categoryOptions = [
    { value: 'all', label: 'Tất cả nhóm' },
    ...categories.map((c) => ({ value: c.id, label: c.label })),
  ];

  const topicOptions = topics
    .filter((t) => t.id !== 'other')
    .map((t) => ({ value: t.id, label: t.label }));

  const hasFilter = category !== 'all' || !!topic;

  const clearFilters = () => {
    setCategory('all');
    setTopic(undefined);
    setSearchParams({});
  };

  return (
    <Card title="Tin gom">
      <PageToolbar onRefresh={refetch} loading={loading}>
        <Select
          size="small"
          placeholder="Lọc theo nhóm"
          style={{ width: 160 }}
          value={category}
          onChange={(v) => {
            const val = v ?? 'all';
            setCategory(val);
            setTopic(undefined);
            const next = new URLSearchParams(searchParams);
            if (val !== 'all') next.set('category', val);
            else next.delete('category');
            next.delete('topic');
            setSearchParams(next);
          }}
          options={categoryOptions}
        />
        <Select
          size="small"
          placeholder="Lọc theo chủ đề"
          allowClear
          style={{ width: 160 }}
          value={topic ?? undefined}
          onChange={(v) => {
            setTopic(v ?? undefined);
            if (v) setCategory('all');
            const next = new URLSearchParams(searchParams);
            if (v) next.set('topic', v);
            else next.delete('topic');
            next.delete('category');
            setSearchParams(next);
          }}
          options={topicOptions}
        />
        {hasFilter && (
          <Button type="link" size="small" onClick={clearFilters} style={{ padding: '0 4px' }}>
            Xóa lọc
          </Button>
        )}
      </PageToolbar>

      <ProTable<Cluster>
        loading={loading}
        dataSource={arr}
        rowKey="id"
        size="small"
        search={false}
        options={false}
        expandable={{
          expandedRowRender: (c) => {
            const articles = c.articles ?? [];
            return (
              <div style={{ padding: '8px 0' }}>
                <Typography.Text type="secondary" style={{ marginBottom: 8, display: 'block' }}>
                  Cluster ID: {c.id}
                </Typography.Text>
                {articles.map((a) => (
                  <div
                    key={a.id}
                    style={{
                      padding: '8px 0',
                      borderBottom: '1px solid #f0f0f0',
                    }}
                  >
                    <Typography.Text strong>{a.title}</Typography.Text>
                    <div style={{ marginTop: 4 }}>
                      <Tag>{a.source}</Tag>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {a.publishedAt
                          ? new Date(a.publishedAt).toLocaleString('vi-VN', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })
                          : '-'}
                      </Typography.Text>
                      {a.url && (
                        <a
                          href={a.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ marginLeft: 8, fontSize: 12 }}
                        >
                          <LinkOutlined /> Nguồn gốc
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            );
          },
          rowExpandable: (c) =>
            ((c.articles?.length ?? 0) + (c.articleIds?.length ?? 0)) > 0,
        }}
        columns={[
          {
            title: 'Tiêu đề',
            dataIndex: 'canonicalTitle',
            key: 'title',
            ellipsis: true,
            render: (_: unknown, r: Cluster) => (
              <a onClick={(e) => { e.stopPropagation(); navigate(`/clusters/${r.id}`); }}>
                {r.canonicalTitle ?? r.id}
              </a>
            ),
          },
          {
            title: 'Chủ đề',
            dataIndex: 'topic',
            key: 'topic',
            width: 130,
            render: (_: unknown, r: Cluster) =>
              r.topic ? (
                <Tag color={TOPIC_COLORS[r.topic] ?? 'default'}>
                  {topics.find((t) => t.id === r.topic)?.label ?? r.topic}
                </Tag>
              ) : (
                '-'
              ),
          },
          {
            title: 'Điểm',
            dataIndex: 'score',
            key: 'score',
            width: 80,
            render: (_: unknown, r: Cluster) => <Tag color="blue">{r.score ?? 0}đ</Tag>,
          },
          {
            title: 'Nguồn',
            key: 'count',
            width: 80,
            render: (_: unknown, r: Cluster) => {
              const n =
                (r.articles?.length ?? 0) || (r.articleIds ?? []).length;
              return <Tag>{n}</Tag>;
            },
          },
          {
            title: 'Bản nháp',
            key: 'draftCount',
            width: 90,
            render: (_: unknown, r: Cluster) => {
              const n = r.draftCount ?? 0;
              return (
                <Tag color={n > 0 ? 'green' : 'default'}>
                  {n}
                </Tag>
              );
            },
          },
          {
            title: '',
            key: 'action',
            width: 88,
            render: (_: unknown, r: Cluster) => (
              <TableActions onClick={(e) => e.stopPropagation()}>
                <ActionIcon
                  icon={<FullscreenOutlined />}
                  title="Chi tiết"
                  onClick={() => navigate(`/clusters/${r.id}`)}
                />
                <ActionIcon
                  icon={<FileAddOutlined />}
                  title="Tạo bản nháp"
                  type="primary"
                  onClick={() => navigate(`/clusters/${r.id}/create-draft`)}
                />
              </TableActions>
            ),
          },
        ]}
        pagination={{
          ...pagination,
          size: 'default',
        }}
      />
      <EmptyState
        message="Chưa có tin gom. Bấm Crawl ngay trên thanh header."
        loading={loading}
        count={arr.length}
      />
    </Card>
  );
}
