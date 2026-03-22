import { App as AntdApp, Card, Form, Input, InputNumber, Button, Tabs, Typography } from 'antd';
import { SettingOutlined } from '@ant-design/icons';
import { useState, useEffect } from 'react';
import { getGptWriterConfig, updateGptWriterConfig } from '../api';

export default function Settings() {
  const { message } = AntdApp.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

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

  return (
    <div style={{ padding: '0 24px', maxWidth: 800 }}>
      <Card
        title={
          <span>
            <SettingOutlined style={{ marginRight: 8 }} />
            Cài đặt GPT viết bài
          </span>
        }
        loading={loading}
      >
        <Typography.Paragraph type="secondary" style={{ marginBottom: 24 }}>
          Cấu hình model, temperature và prompt mẫu cho Viết lại và Tạo bản nháp. Placeholder:{' '}
          <code>{'{{headline}}'}</code>, <code>{'{{summary}}'}</code>, <code>{'{{content}}'}</code>,{' '}
          <code>{'{{teams}}'}</code>, <code>{'{{players}}'}</code>, <code>{'{{keyFacts}}'}</code>
        </Typography.Paragraph>

        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Tabs
            items={[
              {
                key: 'general',
                label: 'Chung',
                children: (
                  <>
                    <Form.Item
                      name="model"
                      label="Model"
                      rules={[{ required: true }]}
                      tooltip="VD: gpt-4o-mini, gpt-4o, gpt-4-turbo"
                    >
                      <Input placeholder="gpt-4o-mini" />
                    </Form.Item>
                    <Form.Item
                      name="temperature"
                      label="Temperature"
                      tooltip="0–2. Càng cao càng sáng tạo, càng thấp càng ổn định."
                    >
                      <InputNumber min={0} max={2} step={0.1} style={{ width: 120 }} />
                    </Form.Item>
                  </>
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
                  >
                    <Input.TextArea rows={14} style={{ fontFamily: 'monospace', fontSize: 12 }} />
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
                  >
                    <Input.TextArea rows={14} style={{ fontFamily: 'monospace', fontSize: 12 }} />
                  </Form.Item>
                ),
              },
            ]}
          />
          <Form.Item style={{ marginTop: 24 }}>
            <Button type="primary" htmlType="submit" loading={saving}>
              Lưu cấu hình
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
