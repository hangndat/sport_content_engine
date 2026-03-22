import { Row, Col, Card, Statistic, Skeleton, Typography, Tag, Space, Tooltip } from 'antd';
import { Link } from 'react-router-dom';
import { ClusterOutlined, FileTextOutlined, LinkOutlined, SendOutlined, ReadOutlined, RiseOutlined, TagsOutlined, SyncOutlined, RightOutlined } from '@ant-design/icons';
import { useQuery } from '../hooks/useQuery';
import { getStats, getTrends, getTopTopics } from '../api';
import TrendDailyChart from '../components/TrendDailyChart';
import ArticlesByDayChart from '../components/ArticlesByDayChart';

/** Base: 8px. Section=24, Card padding=20, Gutter=16 */
const SPACING = {
  section: 24,
  cardPadding: 20,
  gutter: 16,
  sm: 8,
} as const;

const STAT_CARD_MIN_HEIGHT = 120;

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

const PIPELINE_STEPS = [
  { title: 'Nguồn tin', link: '/sources' },
  { title: 'Crawl', link: '/crawl' },
  { title: 'Tin gom', link: '/clusters' },
  { title: 'Bản nháp', link: '/drafts' },
  { title: 'Đăng', link: '/posts' },
];

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Tag color={isOk ? 'success' : isErr ? 'error' : 'processing'} style={{ margin: 0 }}>
          {isOk ? 'Thành công' : isErr ? 'Lỗi' : 'Đang chạy'}
        </Tag>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {run.finishedAt ? formatRelativeTime(run.finishedAt) : formatRelativeTime(run.startedAt)}
        </Typography.Text>
      </div>
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
    </div>
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
    <Link to={to} style={{ display: 'block', height: '100%', color: 'inherit', textDecoration: 'none' }}>
      <Card
        hoverable
        size="small"
        styles={{ body: { padding: SPACING.cardPadding, minHeight: STAT_CARD_MIN_HEIGHT } }}
      >
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
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ marginBottom: SPACING.section, height: 64 }}><Skeleton.Input active block style={{ height: 48 }} /></div>
        <Row gutter={[SPACING.gutter, SPACING.gutter]}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Col xs={24} sm={12} xl={8} key={i}>
              <Card size="small"><Skeleton active paragraph={{ rows: 2 }} /></Card>
            </Col>
          ))}
        </Row>
      </div>
    );
  }

  /** Thứ tự theo pipeline: Nguồn → Crawl → Gom tin → Bản nháp → Đăng */
  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      <div
        style={{
          marginBottom: SPACING.section,
          padding: '16px 24px',
          background: 'linear-gradient(135deg, #f0f5ff 0%, #e6f4ff 50%, #f0f5ff 100%)',
          borderRadius: 12,
          border: '1px solid #d6e4ff',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          {PIPELINE_STEPS.map((s, i) => (
            <span key={s.link}>
              {i > 0 && <Typography.Text type="secondary" style={{ margin: '0 4px', fontSize: 10 }}>›</Typography.Text>}
              <Link
                to={s.link}
                style={{ color: '#1677ff', fontWeight: 500, fontSize: 14 }}
              >
                {s.title}
              </Link>
            </span>
          ))}
        </div>
      </div>
      <Row gutter={[SPACING.gutter, SPACING.gutter]} style={{ alignItems: 'stretch' }}>
      <Col xs={24} sm={12} xl={8}>
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
      <Col xs={24} sm={12} xl={8}>
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
      <Col xs={24} sm={12} xl={8}>
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
      <Col xs={24} sm={12} xl={8}>
        <CardStat
          title="Bản nháp"
          value={stats?.drafts ?? 0}
          icon={<FileTextOutlined />}
          iconKey="drafts"
          to="/drafts"
          subValue={pending > 0 ? `(${pending} chờ duyệt)` : approved > 0 ? `(${approved} sẵn sàng)` : undefined}
        />
      </Col>
      <Col xs={24} sm={12} xl={8}>
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
      <Col xs={24} sm={12} xl={8}>
        <Link to="/crawl" style={{ display: 'block', height: '100%', color: 'inherit', textDecoration: 'none' }}>
          <Card
            hoverable
            size="small"
            styles={{ body: { padding: SPACING.cardPadding, minHeight: STAT_CARD_MIN_HEIGHT } }}
          >
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
                      <Tooltip key={t.name} title={`${t.count} tin gom trong 24h`}>
                        <Link to={`/clusters?team=${encodeURIComponent(t.name)}&hours=24`}>
                          <Tag color={i < 3 ? 'blue' : undefined} style={{ cursor: 'pointer' }}>
                            {t.name} ({t.count})
                          </Tag>
                        </Link>
                      </Tooltip>
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
                      <Tooltip key={c.name} title={`${c.count} tin gom trong 24h`}>
                        <Link to={`/clusters?competition=${encodeURIComponent(c.name)}&hours=24`}>
                          <Tag color={i < 3 ? 'green' : undefined} style={{ cursor: 'pointer' }}>
                            {c.name} ({c.count})
                          </Tag>
                        </Link>
                      </Tooltip>
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
                      <Tooltip key={p.name} title={`${p.count} tin gom trong 24h`}>
                        <Link to={`/clusters?player=${encodeURIComponent(p.name)}&hours=24`}>
                          <Tag color={i < 3 ? 'orange' : undefined} style={{ cursor: 'pointer' }}>
                            {p.name} ({p.count})
                          </Tag>
                        </Link>
                      </Tooltip>
                    ))}
                  </div>
                </Col>
              )}
            </Row>
          </Card>
        </Col>
      )}
      <Col xs={24} xl={12}>
        <ArticlesByDayChart />
      </Col>
      <Col xs={24} xl={12}>
        <TrendDailyChart />
      </Col>
    </Row>
    </div>
  );
}
