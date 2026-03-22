import { Row, Col, Card, Statistic, Skeleton, Typography, Tag, Space, Breadcrumb } from 'antd';
import { Link } from 'react-router-dom';
import { ClusterOutlined, FileTextOutlined, LinkOutlined, SendOutlined, ReadOutlined, RiseOutlined, TagsOutlined, SyncOutlined, RightOutlined } from '@ant-design/icons';
import { useQuery } from '../hooks/useQuery';
import { getStats, getTrends, getTopTopics } from '../api';
import TrendDailyChart from '../components/TrendDailyChart';
import ArticlesByDayChart from '../components/ArticlesByDayChart';

/** Base: 8px. Section=24, Card padding=20, Gutter=16, Small=8 */
const SPACING = {
  section: 24,
  cardPadding: 20,
  gutter: 16,
  sm: 8,
} as const;

const CARD_ICON_STYLE: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: 10,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 18,
};

const iconBgMap: Record<string, { bg: string; color: string }> = {
  sources: { bg: '#e6f4ff', color: '#1677ff' },
  articles: { bg: '#e6fffb', color: '#13c2c2' },
  clusters: { bg: '#f0e6ff', color: '#722ed1' },
  drafts: { bg: '#fff7e6', color: '#fa8c16' },
  posts: { bg: '#e6ffed', color: '#52c41a' },
  crawl: { bg: '#f5f5f5', color: '#595959' },
};

function formatRelativeTime(iso: string): string {
  const d = new Date(iso);
  const now = Date.now();
  const diffMs = now - d.getTime();
  const diffM = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMs / 3600000);
  if (diffM < 1) return 'Vừa xong';
  if (diffM < 60) return `${diffM} phút trước`;
  if (diffH < 24) return `${diffH} giờ trước`;
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

function LastCrawlContent({ run }: { run: { status: string; startedAt: string; finishedAt?: string; articlesFetched?: number; clustersCreated?: number; error?: string } }) {
  const isOk = run.status === 'completed';
  const isErr = run.status === 'failed';
  return (
    <Space direction="vertical" size={SPACING.sm}>
      <Tag
        color={isOk ? 'success' : isErr ? 'error' : 'processing'}
        style={{ margin: 0 }}
      >
        {isOk ? 'Thành công' : isErr ? 'Lỗi' : 'Đang chạy'}
      </Tag>
      <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
        {run.finishedAt ? formatRelativeTime(run.finishedAt) : formatRelativeTime(run.startedAt)}
      </Typography.Text>
      {isOk && run.articlesFetched != null && (
        <Typography.Text style={{ fontSize: 12, fontWeight: 500 }}>
          {run.articlesFetched} bài · {run.clustersCreated ?? 0} clusters
        </Typography.Text>
      )}
      {isErr && run.error && (
        <Typography.Text type="danger" style={{ fontSize: 11 }} ellipsis={{ tooltip: run.error }}>
          {run.error}
        </Typography.Text>
      )}
    </Space>
  );
}

function CardStat({
  title,
  value,
  icon,
  iconKey,
  to,
  subValue,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  iconKey?: keyof typeof iconBgMap;
  to: string;
  subValue?: string;
}) {
  const style = iconKey ? iconBgMap[iconKey] : undefined;
  return (
    <Link to={to} style={{ display: 'block', color: 'inherit', textDecoration: 'none' }}>
      <Card hoverable size="small" styles={{ body: { padding: SPACING.cardPadding } }}>
        <Statistic
          title={
            <span style={{ display: 'flex', alignItems: 'center', gap: SPACING.sm }}>
              {style ? (
                <span style={{ ...CARD_ICON_STYLE, backgroundColor: style.bg, color: style.color }}>
                  {icon}
                </span>
              ) : (
                icon
              )}
              <span style={{ color: 'rgba(0,0,0,0.65)', fontWeight: 500 }}>{title}</span>
            </span>
          }
          value={value}
          suffix={subValue}
          valueStyle={{ fontSize: 24, fontWeight: 600 }}
        />
      </Card>
    </Link>
  );
}

export default function Dashboard() {
  const { data: stats, loading } = useQuery(getStats);
  const { data: trends } = useQuery(getTrends);
  const { data: topTopics } = useQuery(() => getTopTopics({ limit: 10 }));
  const pending = stats?.draftsPending ?? 0;
  const approved = stats?.draftsApproved ?? 0;

  if (loading) {
    return (
      <div>
        <div style={{ marginBottom: SPACING.section, height: 64 }}><Skeleton.Input active block style={{ height: 48 }} /></div>
        <Row gutter={[SPACING.gutter, SPACING.section]}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Col xs={24} sm={12} lg={6} key={i}>
              <Card size="small"><Skeleton active paragraph={{ rows: 2 }} /></Card>
            </Col>
          ))}
        </Row>
      </div>
    );
  }

  /** Thứ tự theo pipeline: Nguồn → Crawl → Gom tin → Bản nháp → Đăng */
  return (
    <div>
      <div
        style={{
          marginBottom: SPACING.section,
          padding: SPACING.cardPadding,
          background: 'linear-gradient(135deg, #f6f9fc 0%, #eef2f7 100%)',
          borderRadius: 12,
          border: '1px solid #e8ecf1',
        }}
      >
        <Breadcrumb
          items={[
            { title: 'Nguồn tin' },
            { title: 'Crawl' },
            { title: 'Tin gom' },
            { title: 'Bản nháp' },
            { title: 'Đăng' },
          ]}
          separator={<RightOutlined style={{ fontSize: 10, color: '#8c8c8c' }} />}
        />
        <Typography.Text type="secondary" style={{ fontSize: 12, marginTop: SPACING.sm, display: 'block' }}>
          Luồng xử lý nội dung từ thu thập đến xuất bản
        </Typography.Text>
      </div>
      <Row gutter={[SPACING.gutter, SPACING.section]}>
      <Col xs={24} sm={12} lg={6}>
        <CardStat
          title="Nguồn tin"
          value={stats?.sources ?? 0}
          icon={<LinkOutlined />}
          iconKey="sources"
          to="/sources"
          subValue={
            stats?.sourcesEnabled != null && stats?.sources != null && stats.sources > 0
              ? `(${stats.sourcesEnabled}/${stats.sources} bật)`
              : undefined
          }
        />
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <CardStat
          title="Bài crawl"
          value={stats?.articles ?? 0}
          icon={<ReadOutlined />}
          iconKey="articles"
          to="/articles"
          subValue={
            (stats?.articlesLast24h ?? 0) > 0 ? `(+${stats?.articlesLast24h} 24h)` : undefined
          }
        />
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <CardStat
          title="Tin gom"
          value={stats?.clusters ?? 0}
          icon={<ClusterOutlined />}
          iconKey="clusters"
          to="/clusters"
          subValue={
            (stats?.clustersLast24h ?? 0) > 0 ? `(+${stats?.clustersLast24h} 24h)` : undefined
          }
        />
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <CardStat
          title="Bản nháp"
          value={stats?.drafts ?? 0}
          icon={<FileTextOutlined />}
          iconKey="drafts"
          to="/drafts"
          subValue={pending > 0 ? `(${pending} chờ duyệt)` : approved > 0 ? `(${approved} sẵn sàng)` : undefined}
        />
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <CardStat
          title="Bài đã đăng"
          value={stats?.posts ?? 0}
          icon={<SendOutlined />}
          iconKey="posts"
          to="/posts"
          subValue={
            (stats?.postsLast24h ?? 0) > 0 ? `(+${stats?.postsLast24h} 24h)` : undefined
          }
        />
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Link to="/crawl" style={{ display: 'block', color: 'inherit', textDecoration: 'none' }}>
          <Card hoverable size="small" styles={{ body: { padding: SPACING.cardPadding } }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm * 2 }}>
              <span style={{ ...CARD_ICON_STYLE, backgroundColor: iconBgMap.crawl.bg, color: iconBgMap.crawl.color }}>
                <SyncOutlined />
              </span>
              <span style={{ color: 'rgba(0,0,0,0.65)', fontWeight: 500 }}>Crawl gần nhất</span>
            </div>
            {stats?.lastIngestRun ? (
              <LastCrawlContent run={stats.lastIngestRun} />
            ) : (
              <Typography.Text type="secondary">Chưa chạy</Typography.Text>
            )}
          </Card>
        </Link>
      </Col>
      {(stats?.clustersWithoutDraft ?? 0) > 0 && (
        <Col xs={24}>
          <Card
            size="small"
            styles={{ body: { padding: SPACING.cardPadding } }}
            style={{
              background: 'linear-gradient(90deg, #f6ffed 0%, #fcffe6 100%)',
              border: '1px solid #b7eb8f',
              borderRadius: 10,
            }}
          >
            <Space size={SPACING.gutter} style={{ width: '100%', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <Space>
                <FileTextOutlined style={{ color: '#52c41a', fontSize: 18 }} />
                <Typography.Text>
                  Có <strong>{stats?.clustersWithoutDraft ?? 0}</strong> clusters chưa có bản nháp – cần xử lý
                </Typography.Text>
              </Space>
              <Link
                to="/clusters"
                style={{
                  color: '#1677ff',
                  fontWeight: 500,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: SPACING.sm,
                }}
              >
                Xem và tạo draft
                <RightOutlined style={{ fontSize: 10 }} />
              </Link>
            </Space>
          </Card>
        </Col>
      )}
      {topTopics?.data && topTopics.data.length > 0 && (
        <Col xs={24}>
          <Card
            size="small"
            styles={{ header: { padding: '16px 20px' }, body: { padding: SPACING.cardPadding } }}
            title={
              <span style={{ display: 'flex', alignItems: 'center', gap: SPACING.sm }}>
                <span style={{ ...CARD_ICON_STYLE, backgroundColor: iconBgMap.clusters.bg, color: iconBgMap.clusters.color }}>
                  <TagsOutlined />
                </span>
                <span>Top chủ đề</span>
              </span>
            }
            extra={
              <Link to="/clusters" style={{ color: '#1677ff', fontSize: 13 }}>
                Xem Tin gom
              </Link>
            }
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: SPACING.sm }}>
              {topTopics.data.map((t, i) => (
                <Link key={t.id} to={`/clusters?topic=${t.id}`}>
                  <Tag
                    color={i < 3 ? 'blue' : undefined}
                    style={{
                      cursor: 'pointer',
                      padding: '4px 12px',
                      borderRadius: 6,
                    }}
                  >
                    {t.label} <span style={{ opacity: 0.85 }}>({t.count})</span>
                  </Tag>
                </Link>
              ))}
            </div>
          </Card>
        </Col>
      )}
      {trends && (trends.teams?.length > 0 || trends.competitions?.length > 0 || trends.players?.length > 0) && (
        <Col xs={24}>
          <Card
            size="small"
            styles={{ header: { padding: '16px 20px' }, body: { padding: SPACING.cardPadding } }}
            title={
              <span style={{ display: 'flex', alignItems: 'center', gap: SPACING.sm }}>
                <span style={{ ...CARD_ICON_STYLE, backgroundColor: '#fff7e6', color: '#fa8c16' }}>
                  <RiseOutlined />
                </span>
                <span>Đang trend (24h gần nhất)</span>
              </span>
            }
          >
            <Row gutter={[SPACING.section, SPACING.gutter]}>
              {trends.teams?.length > 0 && (
                <Col xs={24} md={8}>
                  <div style={{ marginBottom: SPACING.sm }}>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      Đội bóng
                    </Typography.Text>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: SPACING.sm }}>
                    {trends.teams.map((t, i) => (
                      <Tag key={t.name} color={i < 3 ? 'blue' : undefined}>
                        {t.name} ({t.count})
                      </Tag>
                    ))}
                  </div>
                </Col>
              )}
              {trends.competitions?.length > 0 && (
                <Col xs={24} md={8}>
                  <div style={{ marginBottom: SPACING.sm }}>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      Giải đấu
                    </Typography.Text>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: SPACING.sm }}>
                    {trends.competitions.map((c, i) => (
                      <Tag key={c.name} color={i < 3 ? 'green' : undefined}>
                        {c.name} ({c.count})
                      </Tag>
                    ))}
                  </div>
                </Col>
              )}
              {trends.players?.length > 0 && (
                <Col xs={24} md={8}>
                  <div style={{ marginBottom: SPACING.sm }}>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      Cầu thủ
                    </Typography.Text>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: SPACING.sm }}>
                    {trends.players.map((p, i) => (
                      <Tag key={p.name} color={i < 3 ? 'orange' : undefined}>
                        {p.name} ({p.count})
                      </Tag>
                    ))}
                  </div>
                </Col>
              )}
            </Row>
          </Card>
        </Col>
      )}
      <Col xs={24} lg={12}>
        <ArticlesByDayChart />
      </Col>
      <Col xs={24} lg={12}>
        <TrendDailyChart />
      </Col>
    </Row>
    </div>
  );
}
