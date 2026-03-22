import { App as AntdApp, Card, Button, Form, Select, Input, Typography } from 'antd';
import { ArrowLeftOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getCluster } from '../api';
import { CreateDraftWriterDrawer } from '../components/CreateDraftWriterDrawer';
import { FORMAT_OPTIONS, TONE_OPTIONS } from '../constants';

type ClusterInfo = {
  id: string;
  canonicalTitle?: string | null;
  topic?: string | null;
  topicLabel?: string | null;
  score?: number;
};

export default function DraftCreator() {
  const { message } = AntdApp.useApp();
  const { clusterId } = useParams<{ clusterId: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [cluster, setCluster] = useState<ClusterInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [createOptions, setCreateOptions] = useState<{
    format?: string;
    tone?: string;
    instruction?: string;
  }>({});

  useEffect(() => {
    if (clusterId) {
      setLoading(true);
      getCluster(clusterId)
        .then((data) => {
          if (data.error) {
            message.error(data.error);
            setCluster(null);
          } else {
            setCluster(data as ClusterInfo);
          }
        })
        .catch(() => {
          message.error('Không tải được cluster');
          setCluster(null);
        })
        .finally(() => setLoading(false));
    }
  }, [clusterId, message]);

  const handleSubmit = async () => {
    if (!clusterId) return;
    const vals = await form.validateFields();
    const format = vals.format === 'auto' ? undefined : vals.format;
    const tone = vals.tone;
    const instruction = vals.instruction?.trim() || undefined;

    setCreateOptions({ format, tone: tone || undefined, instruction });
    setCreateDrawerOpen(true);
  };

  if (loading || !cluster) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <Typography.Text type="secondary">Đang tải...</Typography.Text>
      </div>
    );
  }

  return (
    <div style={{ padding: '0 24px', maxWidth: 560 }}>
      <div style={{ marginBottom: 24 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/clusters/${clusterId}`)}>
          Quay lại
        </Button>
      </div>

      <Card
        title={
          <span>
            <ThunderboltOutlined style={{ marginRight: 8 }} />
            Tạo bản nháp
          </span>
        }
        styles={{ header: { padding: '16px 20px' } }}
      >
        <Typography.Paragraph type="secondary" style={{ marginBottom: 24 }}>
          {cluster.canonicalTitle ?? cluster.id}
        </Typography.Paragraph>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ format: 'auto', tone: 'neutral' }}
        >
          <Form.Item
            name="format"
            label="Format nội dung"
            tooltip="Tự động: AI chọn format phù hợp. Hoặc chọn format cụ thể."
          >
            <Select options={FORMAT_OPTIONS} />
          </Form.Item>

          <Form.Item
            name="tone"
            label="Văn phong"
            tooltip="Giọng văn áp dụng cho caption."
          >
            <Select options={TONE_OPTIONS} />
          </Form.Item>

          <Form.Item
            name="instruction"
            label="Gợi ý thêm cho GPT (tùy chọn)"
            tooltip="VD: Viết ngắn gọn hơn, Thêm emoji, Nhấn mạnh tỷ số..."
          >
            <Input.TextArea
              rows={3}
              placeholder="Viết ngắn gọn hơn, Thêm emoji, Giọng vui hơn..."
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" icon={<ThunderboltOutlined />}>
              Tạo bản nháp
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <CreateDraftWriterDrawer
        open={createDrawerOpen}
        onClose={() => setCreateDrawerOpen(false)}
        clusterId={clusterId!}
        options={createOptions}
        onSuccess={() => message.success('Đã tạo bản nháp')}
        onError={(err) => message.error(err)}
        onNavigateToDraft={(draftId) => {
          setCreateDrawerOpen(false);
          navigate(`/drafts/${draftId}`);
        }}
      />
    </div>
  );
}
