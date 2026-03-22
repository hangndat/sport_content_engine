import { ProTable } from '@ant-design/pro-components';
import { Card, Button, Tag, Typography, Select, Popover } from 'antd';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { usePagination } from '../hooks/usePagination';
import { ActionIcon, TableActions } from '../components/TableActions';
import { PageToolbar } from '../components/PageToolbar';
import { EmptyState } from '../components/EmptyState';
import { getClusters, getClustersTopics, getClustersCategories } from '../api';
import { useState, useEffect } from 'react';
import { LinkOutlined, FileAddOutlined, FullscreenOutlined } from '@ant-design/icons';
import { TOPIC_COLORS } from '../constants';
import { ScoreDetailBlock } from '../components/ScoreDetailBlock';

type ArticleInfo = {
  id: string;
  title: string;
  source: string;
  publishedAt: string;
  url?: string;
};
type ViralSignals = {
  hotEntityBonus: number;
  competitionBonus: number;
  contentTypeBonus: number;
  crossSourceBonus: number;
  totalViralBonus: number;
};
type ScoreDetail = {
  total: number;
  tierFreshness: number;
  confirmBonus: number;
  viralBonus: number;
  viralSignals: ViralSignals;
};
type Cluster = {
  id: string;
  score?: number;
  scoreDetail?: ScoreDetail;
  topicIds?: string[];
  articleIds?: string[];
  canonicalTitle?: string | null;
  articles?: ArticleInfo[];
  draftCount?: number;
};

export default function Clusters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const topicsFromUrl = searchParams.getAll('topic');
  const categoriesFromUrl = searchParams.getAll('category');
  const teamFromUrl = searchParams.get('team') ?? '';
  const competitionFromUrl = searchParams.get('competition') ?? '';
  const playerFromUrl = searchParams.get('player') ?? '';
  const hoursFromUrl = searchParams.get('hours') ?? '';
  const [categories, setCategories] = useState<string[]>(
    categoriesFromUrl.length > 0 ? categoriesFromUrl : []
  );
  const [selectedTopics, setSelectedTopics] = useState<string[]>(
    topicsFromUrl.length > 0 ? topicsFromUrl : []
  );
  const [topics, setTopics] = useState<{ id: string; label: string }[]>([]);
  const [categoryList, setCategoryList] = useState<{
    id: string;
    label: string;
    topicIds: string[];
  }[]>([]);

  useEffect(() => {
    const cats = searchParams.getAll('category');
    const tops = searchParams.getAll('topic');
    setCategories(cats.length > 0 ? cats : []);
    setSelectedTopics(tops.length > 0 ? tops : []);
  }, [searchParams]);

  const hasEntityFilter = !!(teamFromUrl || competitionFromUrl || playerFromUrl);
  const hoursNum = hoursFromUrl ? parseInt(hoursFromUrl, 10) : undefined;
  const hasTimeFilter = !!hoursNum && hoursNum > 0;
  const filterParams =
    categories.length > 0 || selectedTopics.length > 0 || hasEntityFilter || hasTimeFilter
      ? {
          ...(categories.length > 0 && { category: categories }),
          ...(selectedTopics.length > 0 && { topic: selectedTopics }),
          ...(teamFromUrl && { team: teamFromUrl }),
          ...(competitionFromUrl && { competition: competitionFromUrl }),
          ...(playerFromUrl && { player: playerFromUrl }),
          ...(hasTimeFilter && { hours: hoursNum }),
        }
      : undefined;

  const {
    data: clusters,
    loading,
    refetch,
    pagination,
  } = usePagination<Cluster>(getClusters, 20, filterParams, [
    categories.join(','),
    selectedTopics.join(','),
    teamFromUrl,
    competitionFromUrl,
    playerFromUrl,
    hoursFromUrl,
  ]);

  useEffect(() => {
    Promise.all([getClustersTopics(), getClustersCategories()])
      .then(([topicsRes, catsRes]) => {
        setTopics(topicsRes.data ?? []);
        setCategoryList(catsRes.data ?? []);
      })
      .catch(() => {});
  }, []);

  const arr = (clusters ?? []) as Cluster[];

  const categoryOptions = categoryList.map((c) => ({ value: c.id, label: c.label }));

  const topicOptions = topics
    .filter((t) => t.id !== 'other')
    .map((t) => ({ value: t.id, label: t.label }));

  const hasFilter = categories.length > 0 || selectedTopics.length > 0 || hasEntityFilter || hasTimeFilter;

  const TIME_OPTIONS = [
    { value: '', label: 'Tất cả thời gian' },
    { value: '24', label: '24h gần nhất' },
    { value: '168', label: '7 ngày' },
    { value: '720', label: '30 ngày' },
  ];

  const clearFilters = () => {
    setCategories([]);
    setSelectedTopics([]);
    setSearchParams({});
  };

  return (
    <Card title="Tin gom" styles={{ header: { padding: '16px 20px' } }}>
      <PageToolbar onRefresh={refetch} loading={loading}>
        <Select
          mode="multiple"
          size="small"
          placeholder="Lọc theo nhóm"
          style={{ width: '100%', minWidth: 140, maxWidth: 280 }}
          value={categories}
          onChange={(v) => {
            const val = (v ?? []) as string[];
            setCategories(val);
            const next = new URLSearchParams(searchParams);
            next.delete('category');
            next.delete('topic');
            val.forEach((id) => next.append('category', id));
            selectedTopics.forEach((id) => next.append('topic', id));
            setSearchParams(next);
          }}
          options={categoryOptions}
          showSearch
          filterOption={(input, opt) =>
            (opt?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
          }
          maxTagCount="responsive"
        />
        <Select
          mode="multiple"
          size="small"
          placeholder="Lọc theo chủ đề"
          style={{ width: '100%', minWidth: 140, maxWidth: 280 }}
          value={selectedTopics}
          onChange={(v) => {
            const val = (v ?? []) as string[];
            setSelectedTopics(val);
            const next = new URLSearchParams(searchParams);
            next.delete('category');
            next.delete('topic');
            categories.forEach((id) => next.append('category', id));
            val.forEach((id) => next.append('topic', id));
            setSearchParams(next);
          }}
          options={topicOptions}
          showSearch
          filterOption={(input, opt) =>
            (opt?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
          }
          maxTagCount="responsive"
        />
        <Select
          size="small"
          placeholder="Thời gian"
          style={{ width: '100%', minWidth: 120, maxWidth: 160 }}
          value={hoursFromUrl}
          onChange={(v) => {
            const next = new URLSearchParams(searchParams);
            if (v) next.set('hours', String(v));
            else next.delete('hours');
            setSearchParams(next);
          }}
          options={TIME_OPTIONS}
          allowClear
        />
        {(teamFromUrl || competitionFromUrl || playerFromUrl) && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
            {teamFromUrl && <Tag color="blue">Đội: {teamFromUrl}</Tag>}
            {competitionFromUrl && <Tag color="green">Giải: {competitionFromUrl}</Tag>}
            {playerFromUrl && <Tag color="orange">Cầu thủ: {playerFromUrl}</Tag>}
          </span>
        )}
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
        scroll={{ x: 720 }}
        expandable={{
          expandedRowRender: (c) => {
            const articles = c.articles ?? [];
            const sd = c.scoreDetail;
            return (
              <div style={{ padding: '16px 20px', background: '#fafafa', borderRadius: 6 }}>
                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                  {sd && (
                    <div style={{ flex: '1 1 280px', minWidth: 0 }}>
                      <Typography.Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Chi tiết điểm
                      </Typography.Text>
                      <div style={{ marginTop: 6 }}>
                        <ScoreDetailBlock scoreDetail={sd} compact />
                      </div>
                    </div>
                  )}
                  <div style={{ flex: '2 1 320px', minWidth: 0 }}>
                    <Typography.Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Các bài trong cluster ({articles.length})
                    </Typography.Text>
                    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {articles.map((a) => (
                        <div
                          key={a.id}
                          style={{
                            padding: '10px 12px',
                            background: '#fff',
                            borderRadius: 6,
                            border: '1px solid #f0f0f0',
                          }}
                        >
                          <Typography.Text strong style={{ fontSize: 13 }}>{a.title}</Typography.Text>
                          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                            <Tag style={{ margin: 0 }}>{a.source}</Tag>
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
                                style={{ fontSize: 12 }}
                              >
                                <LinkOutlined /> Nguồn
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          },
          rowExpandable: (c) =>
            ((c.articles?.length ?? 0) + (c.articleIds?.length ?? 0)) > 0,
        }}
        columns={[
          {
            title: 'ID',
            dataIndex: 'id',
            key: 'id',
            width: 160,
            ellipsis: true,
            copyable: true,
            responsive: ['md'],
          },
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
            dataIndex: 'topicIds',
            key: 'topicIds',
            width: 180,
            responsive: ['sm'],
            render: (_: unknown, r: Cluster) =>
              r.topicIds?.length ? (
                <span style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {r.topicIds.map((tid) => (
                    <Tag key={tid} color={TOPIC_COLORS[tid] ?? 'default'}>
                      {topics.find((t) => t.id === tid)?.label ?? tid}
                    </Tag>
                  ))}
                </span>
              ) : (
                '-'
              ),
          },
          {
            title: 'Điểm',
            dataIndex: 'score',
            key: 'score',
            width: 80,
            render: (_: unknown, r: Cluster) => (
              <Popover
                trigger="hover"
                placement="left"
                content={
                  r.scoreDetail ? (
                    <ScoreDetailBlock scoreDetail={r.scoreDetail} compact />
                  ) : (
                    <Typography.Text type="secondary">Chưa có chi tiết</Typography.Text>
                  )
                }
              >
                <span style={{ cursor: 'help' }}>
                  <Tag color="blue">{r.score ?? 0}đ</Tag>
                </span>
              </Popover>
            ),
          },
          {
            title: 'Nguồn',
            key: 'count',
            width: 80,
            responsive: ['md'],
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
