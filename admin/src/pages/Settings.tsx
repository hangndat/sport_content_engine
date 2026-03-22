import {
  App as AntdApp,
  Card,
  Form,
  Input,
  InputNumber,
  Button,
  Tabs,
  Typography,
  Spin,
  Row,
  Col,
  Alert,
  Divider,
  Space,
  Modal,
  Table,
  Tag,
} from 'antd';
import { SettingOutlined, RiseOutlined, ThunderboltOutlined, CheckCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getGptWriterConfig, updateGptWriterConfig, getScoreConfig, updateScoreConfig, rescoreClusters, type RescoreResult } from '../api';

const SCORE_DEFAULTS = {
  tierWeight1: 3,
  tierWeight2: 2,
  tierWeight3: 1,
  freshnessHours: 24,
  confirmMaxArticles: 5,
  confirmMultiplier: 2,
  viralBonusCap: 10,
  viralHotEntityMax: 3,
  viralCompetitionBonus: 2,
  viralContentTypeResult: 2,
  viralContentTypeRumor: 1,
  viralContentTypeNews: 0,
  viralCrossSource2: 1,
  viralCrossSource3: 2,
  viralCrossSource4: 3,
};

export default function Settings() {
  const { message } = AntdApp.useApp();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [scoreForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scoreLoading, setScoreLoading] = useState(false);
  const [scoreSaving, setScoreSaving] = useState(false);
  const [rescoreLoading, setRescoreLoading] = useState(false);
  const [rescoreResult, setRescoreResult] = useState<RescoreResult | null>(null);

  useEffect(() => {
    setLoading(true);
    getGptWriterConfig()
      .then((c) => {
        form.setFieldsValue({
          model: c.model,
          temperature: c.temperature,
          basePromptRewrite: c.basePromptRewrite,
          basePromptContentWriter: c.basePromptContentWriter,
        });
      })
      .catch(() => message.error('Không tải được cấu hình'))
      .finally(() => setLoading(false));
  }, [form, message]);

  useEffect(() => {
    setScoreLoading(true);
    getScoreConfig()
      .then((c) => {
        scoreForm.setFieldsValue({
          tierWeight1: c.tierWeights?.['1'],
          tierWeight2: c.tierWeights?.['2'],
          tierWeight3: c.tierWeights?.['3'],
          freshnessHours: c.freshnessHours,
          confirmMaxArticles: c.confirmMaxArticles,
          confirmMultiplier: c.confirmMultiplier,
          viralBonusCap: c.viralBonusCap,
          viralHotEntityMax: c.viralHotEntityMax,
          viralCompetitionBonus: c.viralCompetitionBonus,
          viralContentTypeResult: c.viralContentTypeBonus?.result,
          viralContentTypeRumor: c.viralContentTypeBonus?.rumor,
          viralContentTypeNews: c.viralContentTypeBonus?.news,
          viralCrossSource2: c.viralCrossSourceBonus?.['2'],
          viralCrossSource3: c.viralCrossSourceBonus?.['3'],
          viralCrossSource4: c.viralCrossSourceBonus?.['4'],
        });
      })
      .catch(() => message.error('Không tải được cấu hình điểm'))
      .finally(() => setScoreLoading(false));
  }, [scoreForm, message]);

  const handleSave = async () => {
    const vals = await form.validateFields();
    setSaving(true);
    try {
      await updateGptWriterConfig({
        model: vals.model?.trim(),
        temperature: vals.temperature,
        basePromptRewrite: vals.basePromptRewrite?.trim() || undefined,
        basePromptContentWriter: vals.basePromptContentWriter?.trim() || undefined,
      });
      message.success('Đã lưu cấu hình GPT');
    } catch {
      message.error('Lưu thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleScoreSave = async () => {
    const vals = await scoreForm.validateFields();
    setScoreSaving(true);
    try {
      await updateScoreConfig({
        tierWeights: { '1': vals.tierWeight1, '2': vals.tierWeight2, '3': vals.tierWeight3 },
        freshnessHours: vals.freshnessHours,
        confirmMaxArticles: vals.confirmMaxArticles,
        confirmMultiplier: vals.confirmMultiplier,
        viralBonusCap: vals.viralBonusCap,
        viralHotEntityMax: vals.viralHotEntityMax,
        viralCompetitionBonus: vals.viralCompetitionBonus,
        viralContentTypeBonus: {
          result: vals.viralContentTypeResult,
          rumor: vals.viralContentTypeRumor,
          news: vals.viralContentTypeNews,
        },
        viralCrossSourceBonus: {
          '2': vals.viralCrossSource2,
          '3': vals.viralCrossSource3,
          '4': vals.viralCrossSource4,
        },
      });
      message.success('Đã lưu công thức điểm');
    } catch {
      message.error('Lưu thất bại');
    } finally {
      setScoreSaving(false);
    }
  };

  const handleScoreReset = () => {
    scoreForm.setFieldsValue(SCORE_DEFAULTS);
    message.info('Đã đặt về mặc định. Bấm Lưu để áp dụng.');
  };

  const handleRescore = async () => {
    setRescoreLoading(true);
    setRescoreResult(null);
    try {
      const result = await rescoreClusters();
      setRescoreResult(result);
      message.success(`Đã tính lại ${result.total} cluster. ${result.changed} thay đổi.`);
    } catch {
      message.error('Tính lại điểm thất bại');
    } finally {
      setRescoreLoading(false);
    }
  };

  return (
    <div style={{ padding: '0 24px', maxWidth: 960 }}>
      <div style={{ marginBottom: 24 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          <SettingOutlined style={{ marginRight: 8 }} />
          Cài đặt
        </Typography.Title>
        <Typography.Text type="secondary">
          Cấu hình GPT viết bài và công thức tính điểm cluster
        </Typography.Text>
      </div>

      <Tabs
        size="middle"
        destroyOnHidden={false}
        items={[
          {
            key: 'gpt',
            label: (
              <span>
                <ThunderboltOutlined style={{ marginRight: 6 }} />
                GPT viết bài
              </span>
            ),
            children: (
              <Card>
                <Spin spinning={loading}>
                  <Alert
                    type="info"
                    showIcon
                    message="Placeholder có sẵn"
                    description={
                      <Space size={4} wrap>
                        <code>{'{{headline}}'}</code>
                        <code>{'{{summary}}'}</code>
                        <code>{'{{content}}'}</code>
                        <code>{'{{teams}}'}</code>
                        <code>{'{{players}}'}</code>
                        <code>{'{{keyFacts}}'}</code>
                      </Space>
                    }
                    style={{ marginBottom: 24 }}
                  />
                  <Form form={form} layout="vertical" onFinish={handleSave}>
                    <Tabs
                      size="small"
                      items={[
                        {
                          key: 'general',
                          label: 'Chung',
                          children: (
                            <div style={{ paddingTop: 8 }}>
                              <Form.Item
                                name="model"
                                label="Model"
                                rules={[{ required: true }]}
                                tooltip="VD: gpt-4o-mini, gpt-4o, gpt-4-turbo"
                              >
                                <Input placeholder="gpt-4o-mini" style={{ maxWidth: 280 }} />
                              </Form.Item>
                              <Form.Item
                                name="temperature"
                                label="Temperature"
                                tooltip="0–2. Càng cao càng sáng tạo, càng thấp càng ổn định"
                              >
                                <InputNumber min={0} max={2} step={0.1} style={{ width: 120 }} />
                              </Form.Item>
                            </div>
                          ),
                        },
                        {
                          key: 'rewrite',
                          label: 'Prompt Viết lại',
                          children: (
                            <Form.Item
                              name="basePromptRewrite"
                              label="Base prompt (Viết lại)"
                              tooltip="Dùng {{headline}}, {{summary}}, {{content}}"
                              style={{ marginTop: 8 }}
                            >
                              <Input.TextArea rows={12} style={{ fontFamily: 'monospace', fontSize: 12 }} />
                            </Form.Item>
                          ),
                        },
                        {
                          key: 'content',
                          label: 'Prompt Tạo bản nháp',
                          children: (
                            <Form.Item
                              name="basePromptContentWriter"
                              label="Base prompt (Content Writer)"
                              tooltip="Dùng {{headline}}, {{summary}}, {{teams}}, {{players}}, {{keyFacts}}"
                              style={{ marginTop: 8 }}
                            >
                              <Input.TextArea rows={12} style={{ fontFamily: 'monospace', fontSize: 12 }} />
                            </Form.Item>
                          ),
                        },
                      ]}
                    />
                    <Divider />
                    <Form.Item style={{ marginBottom: 0 }}>
                      <Button type="primary" htmlType="submit" loading={saving} icon={<CheckCircleOutlined />}>
                        Lưu cấu hình GPT
                      </Button>
                    </Form.Item>
                  </Form>
                </Spin>
              </Card>
            ),
          },
          {
            key: 'score',
            label: (
              <span>
                <RiseOutlined style={{ marginRight: 6 }} />
                Công thức điểm
              </span>
            ),
            children: (
              <Card>
                <Spin spinning={scoreLoading}>
                  <Alert
                    type="info"
                    showIcon
                    icon={<ReloadOutlined />}
                    message="Tính lại điểm"
                    description={
                      <div>
                        Sau khi Lưu công thức mới, bấm <strong>Tính lại điểm</strong> để cập nhật tất cả cluster hiện có.
                        Kết quả sẽ hiển thị cluster nào thay đổi điểm.
                      </div>
                    }
                    style={{ marginBottom: 24 }}
                  />
                  <div style={{ marginBottom: 24 }}>
                    <Button
                      type="default"
                      icon={<ReloadOutlined spin={rescoreLoading} />}
                      loading={rescoreLoading}
                      onClick={handleRescore}
                    >
                      Tính lại điểm tất cả cluster
                    </Button>
                  </div>
                  <Form form={scoreForm} layout="vertical" onFinish={handleScoreSave}>
                    <Typography.Text strong style={{ display: 'block', marginBottom: 16 }}>
                      Nguồn & thời gian
                    </Typography.Text>
                    <Row gutter={[24, 8]}>
                      <Col xs={24} sm={12} md={8}>
                        <Form.Item name="tierWeight1" label="Tier 1" rules={[{ required: true }]} tooltip="Nguồn chính thức (CLB, giải đấu)">
                          <InputNumber min={1} max={10} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12} md={8}>
                        <Form.Item name="tierWeight2" label="Tier 2" rules={[{ required: true }]} tooltip="Báo lớn, nhà báo uy tín">
                          <InputNumber min={1} max={10} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12} md={8}>
                        <Form.Item name="tierWeight3" label="Tier 3" tooltip="Cộng đồng, rumor">
                          <InputNumber min={0} max={5} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12} md={8}>
                        <Form.Item name="freshnessHours" label="Freshness (giờ)" tooltip="Tin mới trong X giờ được cộng điểm">
                          <InputNumber min={1} max={168} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12} md={8}>
                        <Form.Item name="confirmMaxArticles" label="Xác nhận max (bài)" tooltip="Số nguồn tối đa được cộng">
                          <InputNumber min={1} max={10} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12} md={8}>
                        <Form.Item name="confirmMultiplier" label="Xác nhận × hệ số">
                          <InputNumber min={0} max={10} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Divider />

                    <Typography.Text strong style={{ display: 'block', marginBottom: 16 }}>
                      Viral bonus
                    </Typography.Text>
                    <Row gutter={[24, 8]}>
                      <Col xs={24} sm={12} md={8}>
                        <Form.Item name="viralBonusCap" label="Giới hạn tổng" tooltip="Tổng viral tối đa cộng vào điểm">
                          <InputNumber min={0} max={20} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12} md={8}>
                        <Form.Item name="viralHotEntityMax" label="Hot entity max" tooltip="Đội/cầu thủ hot (Messi, ĐT VN...)">
                          <InputNumber min={0} max={5} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12} md={8}>
                        <Form.Item name="viralCompetitionBonus" label="Giải hot" tooltip="C1, NHA, V-League...">
                          <InputNumber min={0} max={5} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12} md={8}>
                        <Form.Item name="viralContentTypeResult" label="Result">
                          <InputNumber min={0} max={5} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12} md={8}>
                        <Form.Item name="viralContentTypeRumor" label="Rumor">
                          <InputNumber min={0} max={5} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12} md={8}>
                        <Form.Item name="viralContentTypeNews" label="News">
                          <InputNumber min={0} max={5} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12} md={8}>
                        <Form.Item name="viralCrossSource2" label="2 nguồn">
                          <InputNumber min={0} max={5} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12} md={8}>
                        <Form.Item name="viralCrossSource3" label="3 nguồn">
                          <InputNumber min={0} max={5} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12} md={8}>
                        <Form.Item name="viralCrossSource4" label="4+ nguồn">
                          <InputNumber min={0} max={5} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Divider />
                    <Form.Item style={{ marginBottom: 0 }}>
                      <Space>
                        <Button type="primary" htmlType="submit" loading={scoreSaving} icon={<CheckCircleOutlined />}>
                          Lưu công thức
                        </Button>
                        <Button onClick={handleScoreReset}>
                          Đặt về mặc định
                        </Button>
                      </Space>
                    </Form.Item>
                  </Form>
                </Spin>
              </Card>
            ),
          },
        ]}
      />

      <Modal
        title="Kết quả tính lại điểm"
        open={!!rescoreResult}
        onCancel={() => setRescoreResult(null)}
        footer={[
          <Button key="close" onClick={() => setRescoreResult(null)}>
            Đóng
          </Button>,
          <Button key="clusters" type="primary" onClick={() => { setRescoreResult(null); navigate('/clusters'); }}>
            Xem Tin gom
          </Button>,
        ]}
        width={640}
      >
        {rescoreResult && (
          <div>
            <div style={{ marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <Tag color="blue">Tổng: {rescoreResult.total}</Tag>
              <Tag color="green">Thay đổi: {rescoreResult.changed}</Tag>
              <Tag color="default">Giữ nguyên: {rescoreResult.unchanged}</Tag>
              {rescoreResult.errors > 0 && <Tag color="red">Lỗi: {rescoreResult.errors}</Tag>}
            </div>
            {rescoreResult.changes.length > 0 ? (
              <>
                <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                  Chi tiết thay đổi (tối đa 200, sắp xếp theo |delta|):
                </Typography.Text>
                <Table
                  size="small"
                  dataSource={rescoreResult.changes}
                  rowKey="clusterId"
                  pagination={{ pageSize: 10, showSizeChanger: false }}
                  columns={[
                    {
                      title: 'Tiêu đề',
                      dataIndex: 'canonicalTitle',
                      ellipsis: true,
                      render: (title: string, r: { clusterId: string }) => (
                        <a onClick={() => { setRescoreResult(null); navigate(`/clusters/${r.clusterId}`); }}>
                          {title || r.clusterId.slice(0, 12) + '…'}
                        </a>
                      ),
                    },
                    {
                      title: 'Trước',
                      dataIndex: 'oldScore',
                      width: 70,
                      render: (v: number) => <Tag>{v}đ</Tag>,
                    },
                    {
                      title: 'Sau',
                      dataIndex: 'newScore',
                      width: 70,
                      render: (v: number) => <Tag color="blue">{v}đ</Tag>,
                    },
                    {
                      title: 'Δ',
                      dataIndex: 'delta',
                      width: 80,
                      render: (v: number) => (
                        <Tag color={v > 0 ? 'green' : v < 0 ? 'red' : 'default'}>
                          {v > 0 ? '+' : ''}{v}
                        </Tag>
                      ),
                    },
                  ]}
                />
              </>
            ) : (
              <Typography.Text type="secondary">
                Không có cluster nào thay đổi điểm.
              </Typography.Text>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
