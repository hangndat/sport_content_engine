import { Row, Col, Card, Statistic, Skeleton, Typography, Tag } from 'antd';
import { Link } from 'react-router-dom';
import { ClusterOutlined, FileTextOutlined, LinkOutlined, SendOutlined, ReadOutlined, RiseOutlined, TagsOutlined } from '@ant-design/icons';
import { useQuery } from '../hooks/useQuery';
import { getStats, getTrends, getTopTopics } from '../api';
import TrendDailyChart from '../components/TrendDailyChart';

function CardStat({
  title,
  value,
  icon,
  to,
  subValue,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  to: string;
  subValue?: string;
}) {
  return (
    <Link to={to} style={{ display: 'block', color: 'inherit', textDecoration: 'none' }}>
      <Card hoverable>
        <Statistic
          title={
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {icon}
              {title}
            </span>
          }
          value={value}
          suffix={subValue}
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
      <Row gutter={[16, 16]}>
        {[1, 2, 3, 4].map((i) => (
          <Col xs={24} sm={12} lg={6} key={i}>
            <Card><Skeleton active paragraph={{ rows: 2 }} /></Card>
          </Col>
        ))}
      </Row>
    );
  }

  /** Thứ tự theo pipeline: Nguồn → Crawl → Gom tin → Bản nháp → Đăng */
  return (
    <>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
        Luồng: Nguồn tin → Crawl → Tin gom → Tạo bản nháp → Duyệt → Đăng
      </Typography.Paragraph>
      <Row gutter={[16, 16]}>
      <Col xs={24} sm={12} lg={6}>
        <CardStat
          title="Nguồn tin"
          value={stats?.sources ?? 0}
          icon={<LinkOutlined />}
          to="/sources"
        />
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <CardStat
          title="Bài crawl"
          value={stats?.articles ?? 0}
          icon={<ReadOutlined />}
          to="/articles"
        />
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <CardStat
          title="Tin gom"
          value={stats?.clusters ?? 0}
          icon={<ClusterOutlined />}
          to="/clusters"
        />
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <CardStat
          title="Bản nháp"
          value={stats?.drafts ?? 0}
          icon={<FileTextOutlined />}
          to="/drafts"
          subValue={pending > 0 ? `(${pending} chờ duyệt)` : approved > 0 ? `(${approved} sẵn sàng)` : undefined}
        />
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <CardStat
          title="Bài đã đăng"
          value={stats?.posts ?? 0}
          icon={<SendOutlined />}
          to="/posts"
        />
      </Col>
      {topTopics?.data && topTopics.data.length > 0 && (
        <Col xs={24}>
          <Card
            title={
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <TagsOutlined />
                Top chủ đề
              </span>
            }
            extra={<Link to="/clusters">Xem Tin gom</Link>}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {topTopics.data.map((t, i) => (
                <Link key={t.id} to={`/clusters?topic=${t.id}`}>
                  <Tag color={i < 3 ? 'blue' : 'default'} style={{ cursor: 'pointer', marginBottom: 4 }}>
                    {t.label} ({t.count})
                  </Tag>
                </Link>
              ))}
            </div>
          </Card>
        </Col>
      )}
      {trends && (trends.teams?.length > 0 || trends.competitions?.length > 0) && (
        <Col xs={24}>
          <Card
            title={
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <RiseOutlined />
                Đang trend (24h gần nhất)
              </span>
            }
          >
            <Row gutter={[16, 8]}>
              {trends.teams?.length > 0 && (
                <Col xs={24} md={8}>
                  <Typography.Text type="secondary">Đội bóng</Typography.Text>
                  <div style={{ marginTop: 4 }}>
                    {trends.teams.map((t, i) => (
                      <Tag key={t.name} color={i < 3 ? 'blue' : 'default'}>
                        {t.name} ({t.count})
                      </Tag>
                    ))}
                  </div>
                </Col>
              )}
              {trends.competitions?.length > 0 && (
                <Col xs={24} md={8}>
                  <Typography.Text type="secondary">Giải đấu</Typography.Text>
                  <div style={{ marginTop: 4 }}>
                    {trends.competitions.map((c, i) => (
                      <Tag key={c.name} color={i < 3 ? 'green' : 'default'}>
                        {c.name} ({c.count})
                      </Tag>
                    ))}
                  </div>
                </Col>
              )}
              {trends.players?.length > 0 && (
                <Col xs={24} md={8}>
                  <Typography.Text type="secondary">Cầu thủ</Typography.Text>
                  <div style={{ marginTop: 4 }}>
                    {trends.players.map((p, i) => (
                      <Tag key={p.name} color={i < 3 ? 'orange' : 'default'}>
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
      <Col xs={24}>
        <TrendDailyChart />
      </Col>
    </Row>
    </>
  );
}
