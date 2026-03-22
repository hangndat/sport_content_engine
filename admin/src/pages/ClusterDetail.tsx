import { App as AntdApp, Card, Button, Tag, Typography, List, Tooltip } from 'antd';
import { ArrowLeftOutlined, FileAddOutlined, FileTextOutlined, LinkOutlined } from '@ant-design/icons';
import { ScoreDetailBlock } from '../components/ScoreDetailBlock';
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getCluster } from '../api';
import { TOPIC_COLORS, statusColors } from '../constants';

type ClusterDraft = { id: string; headline: string; status: string; format?: string; createdAt?: string };

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
type ClusterDetail = {
  id: string;
  score: number;
  scoreDetail?: ScoreDetail;
  topicIds?: string[];
  topicLabels?: { id: string; label: string }[];
  canonicalTitle?: string | null;
  articles: { id: string; title: string; source: string; publishedAt: string; url?: string }[];
  drafts: ClusterDraft[];
};

export default function ClusterDetail() {
  const { message } = AntdApp.useApp();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [cluster, setCluster] = useState<ClusterDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      setLoading(true);
      getCluster(id)
        .then((data) => {
          if (data.error) {
            message.error(data.error);
            setCluster(null);
          } else {
            setCluster(data as ClusterDetail);
          }
        })
        .catch(() => {
          message.error('Không tải được cluster');
          setCluster(null);
        })
        .finally(() => setLoading(false));
    }
  }, [id, message]);


  const hasActiveDraft = cluster?.drafts?.some((d) => d.status === 'pending' || d.status === 'approved');

  if (loading || !cluster) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <Typography.Text type="secondary">Đang tải...</Typography.Text>
      </div>
    );
  }

  return (
    <div style={{ padding: '0 24px' }}>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/clusters')}>
          Quay lại
        </Button>
        {(cluster.topicLabels ?? []).map((t) => (
          <Tag key={t.id} color={TOPIC_COLORS[t.id] ?? 'default'}>
            {t.label}
          </Tag>
        ))}
        <Tag color="blue">{cluster.score}đ</Tag>
        <Tag>{cluster.articles?.length ?? 0} nguồn</Tag>
        <span style={{ flex: 1 }} />
        <Tooltip title={hasActiveDraft ? 'Cluster đã có bản nháp chờ duyệt/đã duyệt' : undefined}>
          <span>
            <Button
              type="primary"
              icon={<FileAddOutlined />}
              disabled={!!hasActiveDraft}
              onClick={() => navigate(`/clusters/${id}/create-draft`)}
            >
              Tạo bản nháp
            </Button>
          </span>
        </Tooltip>
      </div>

      <Card title={cluster.canonicalTitle ?? cluster.id} styles={{ header: { padding: '16px 20px' } }}>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 8 }}>
          Cluster ID: {cluster.id}
        </Typography.Paragraph>
        {cluster.scoreDetail && (
          <div style={{ marginBottom: 16 }}>
            <ScoreDetailBlock scoreDetail={cluster.scoreDetail} />
          </div>
        )}

        {(cluster.drafts?.length ?? 0) > 0 && (
          <>
            <Typography.Title level={5}>Bản nháp từ cluster này</Typography.Title>
            <List
              size="small"
              dataSource={cluster.drafts}
              style={{ marginBottom: 24 }}
              renderItem={(d) => (
                <List.Item
                  actions={[
                    <Button
                      key="view"
                      type="link"
                      size="small"
                      icon={<FileTextOutlined />}
                      onClick={() => navigate(`/drafts/${d.id}`)}
                    >
                      Xem
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <a onClick={() => navigate(`/drafts/${d.id}`)}>{d.headline}</a>
                    }
                    description={
                      <span>
                        <Tag color={statusColors[d.status] ?? 'default'}>{d.status}</Tag>
                        {d.createdAt && (
                          <Typography.Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                            {new Date(d.createdAt).toLocaleString('vi-VN')}
                          </Typography.Text>
                        )}
                      </span>
                    }
                  />
                </List.Item>
              )}
            />
          </>
        )}

        <Typography.Title level={5}>Các bài trong cluster</Typography.Title>
        <List
          size="small"
          dataSource={cluster.articles ?? []}
          renderItem={(a) => (
            <List.Item>
              <div style={{ width: '100%' }}>
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
            </List.Item>
          )}
        />
      </Card>
    </div>
  );
}
