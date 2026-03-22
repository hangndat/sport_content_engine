import { ProTable } from '@ant-design/pro-components';
import {
  App as AntdApp,
  Card,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Tabs,
  InputNumber,
} from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import {
  getTopics,
  createTopic,
  updateTopic,
  deleteTopic,
  getTopicRules,
  getTopicRuleTypes,
  createTopicRule,
  updateTopicRule,
  deleteTopicRule,
} from '../api';
import { useQuery } from '../hooks/useQuery';
import { ActionIcon, ActionIconConfirm, TableActions } from '../components/TableActions';
import { useCrudModal } from '../hooks/useCrudModal';

type TopicRow = { id: string; label: string; sortOrder?: number };
type RuleRow = {
  id: string;
  topicId: string;
  ruleType: string;
  ruleValue: object;
  priority: number;
};

function ruleValueDisplay(rv: object): string {
  const o = rv as { pattern?: string; values?: string[]; value?: string };
  if (o.pattern) return `pattern: ${o.pattern}`;
  if (o.values) return `values: [${o.values.slice(0, 3).join(', ')}${o.values.length > 3 ? '...' : ''}]`;
  if (o.value) return `value: ${o.value}`;
  return JSON.stringify(rv);
}

function buildRuleValue(ruleType: string, vals: Record<string, unknown>): object {
  if (ruleType === 'competition_regex' || ruleType === 'title_regex') {
    return { pattern: String(vals.pattern ?? '').trim() };
  }
  if (ruleType === 'teams_contains') {
    const raw = (vals.values as string) ?? '';
    const values = raw
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    return { values };
  }
  if (ruleType === 'content_type') {
    return { value: String(vals.value ?? '').trim() };
  }
  return {};
}

export default function Topics() {
  const { message } = AntdApp.useApp();
  const { data: topicsRes, loading: topicsLoading, refetch: refetchTopics } = useQuery(getTopics);
  const { data: rulesRes, loading: rulesLoading, refetch: refetchRules } = useQuery(getTopicRules);
  const { data: typesRes } = useQuery(getTopicRuleTypes);
  const topics = topicsRes?.data ?? [];
  const rules = rulesRes?.data ?? [];
  const ruleTypes = typesRes?.data ?? [];

  const [topicForm] = Form.useForm();
  const [ruleForm] = Form.useForm();

  const topicCrud = useCrudModal<TopicRow>({
    form: topicForm,
    refetch: () => {
      refetchTopics();
      refetchRules();
    },
    onCreate: (vals) => createTopic({ id: vals.id as string, label: vals.label as string, sortOrder: vals.sortOrder as number }),
    onUpdate: (id, vals) => updateTopic(id, { label: vals.label as string, sortOrder: vals.sortOrder as number }),
    onDelete: async (id) => {
      if (id === 'other') {
        return { ok: false, error: "Không thể xóa chủ đề 'other'" };
      }
      return deleteTopic(id);
    },
    getEditValues: (r) => ({ id: r.id, label: r.label, sortOrder: r.sortOrder ?? 0 }),
    onSuccess: (msg) => message.success(msg),
    onError: (msg) => message.error(msg),
  });

  const ruleCrud = useCrudModal<RuleRow>({
    form: ruleForm,
    refetch: refetchRules,
    onCreate: async (vals) => {
      const ruleValue = buildRuleValue(vals.ruleType as string, vals);
      return createTopicRule({
        topicId: vals.topicId as string,
        ruleType: vals.ruleType as string,
        ruleValue,
        priority: vals.priority as number,
      });
    },
    onUpdate: async (id, vals) => {
      const ruleValue = buildRuleValue(vals.ruleType as string, vals);
      return updateTopicRule(id, {
        topicId: vals.topicId as string,
        ruleType: vals.ruleType as string,
        ruleValue,
        priority: vals.priority as number,
      });
    },
    onDelete: deleteTopicRule,
    getEditValues: (r) => {
      const rv = r.ruleValue as { pattern?: string; values?: string[]; value?: string };
      return {
        topicId: r.topicId,
        ruleType: r.ruleType,
        priority: r.priority ?? 0,
        pattern: rv.pattern,
        values: rv.values?.join('\n'),
        value: rv.value,
      };
    },
    onSuccess: (msg) => message.success(msg),
    onError: (msg) => message.error(msg),
  });

  const topicArr = topics as TopicRow[];
  const ruleArr = rules as RuleRow[];

  return (
    <>
      <Card title="Chủ đề & Quy tắc suy luận" styles={{ header: { padding: '16px 20px' } }}>
        <p style={{ color: '#666', marginBottom: 16 }}>
          Chủ đề suy luận từ bài viết theo các quy tắc (ưu tiên thấp = chạy trước). Chạy{' '}
          <code>npm run db:init</code> nếu chưa có dữ liệu.
        </p>
        <Tabs
          items={[
            {
              key: 'topics',
              label: 'Chủ đề',
              children: (
                <>
                  <Space style={{ marginBottom: 16 }}>
                    <Button type="primary" onClick={topicCrud.handleAdd}>
                      Thêm chủ đề
                    </Button>
                  </Space>
                  <ProTable
                    loading={topicsLoading}
                    dataSource={topicArr}
                    rowKey="id"
                    pagination={false}
                    size="small"
                    search={false}
                    options={false}
                    scroll={{ x: 400 }}
                    columns={[
                      { title: 'ID', dataIndex: 'id', key: 'id', width: 140, responsive: ['sm'] },
                      { title: 'Tên', dataIndex: 'label', key: 'label' },
                      { title: 'Thứ tự', dataIndex: 'sortOrder', key: 'sortOrder', width: 80, responsive: ['md'] },
                      {
                        title: '',
                        key: 'actions',
                        width: 80,
                        render: (_: unknown, r: TopicRow) => (
                          <TableActions>
                            <ActionIcon
                              icon={<EditOutlined />}
                              title="Sửa"
                              disabled={r.id === 'other'}
                              onClick={() => topicCrud.handleEdit(r)}
                            />
                            <ActionIconConfirm
                              icon={<DeleteOutlined />}
                              title="Xóa"
                              confirmTitle="Xóa chủ đề này?"
                              danger
                              disabled={r.id === 'other'}
                              onConfirm={() => topicCrud.handleDelete(r.id)}
                            />
                          </TableActions>
                        ),
                      },
                    ]}
                  />
                </>
              ),
            },
            {
              key: 'rules',
              label: 'Quy tắc',
              children: (
                <>
                  <Space style={{ marginBottom: 16 }}>
                    <Button type="primary" onClick={ruleCrud.handleAdd}>
                      Thêm quy tắc
                    </Button>
                  </Space>
                  <ProTable
                    loading={rulesLoading}
                    dataSource={ruleArr}
                    rowKey="id"
                    pagination={{ pageSize: 20 }}
                    size="small"
                    search={false}
                    options={false}
                    scroll={{ x: 600 }}
                    columns={[
                      { title: 'Chủ đề', dataIndex: 'topicId', key: 'topicId', width: 120, responsive: ['sm'] },
                      { title: 'Loại quy tắc', dataIndex: 'ruleType', key: 'ruleType', width: 140 },
                      {
                        title: 'Giá trị',
                        dataIndex: 'ruleValue',
                        key: 'ruleValue',
                        ellipsis: true,
                        render: (_: unknown, r: RuleRow) => (
                          <code style={{ fontSize: 12 }}>{ruleValueDisplay(r.ruleValue)}</code>
                        ),
                      },
                      { title: 'Ưu tiên', dataIndex: 'priority', key: 'priority', width: 80, responsive: ['md'] },
                      {
                        title: '',
                        key: 'actions',
                        width: 80,
                        render: (_: unknown, r: RuleRow) => (
                          <TableActions>
                            <ActionIcon
                              icon={<EditOutlined />}
                              title="Sửa"
                              onClick={() => ruleCrud.handleEdit(r)}
                            />
                            <ActionIconConfirm
                              icon={<DeleteOutlined />}
                              title="Xóa"
                              confirmTitle="Xóa quy tắc này?"
                              danger
                              onConfirm={() => ruleCrud.handleDelete(r.id)}
                            />
                          </TableActions>
                        ),
                      },
                    ]}
                  />
                </>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        open={topicCrud.modalOpen}
        title={topicCrud.editing ? 'Sửa chủ đề' : 'Thêm chủ đề'}
        onOk={topicCrud.handleSave}
        onCancel={topicCrud.closeModal}
        confirmLoading={topicCrud.saving}
        destroyOnHidden={false}
      >
        <Form form={topicForm} layout="vertical">
          <Form.Item name="id" label="ID" rules={[{ required: !topicCrud.editing }]}>
            <Input placeholder="vd: nha, vleague" disabled={!!topicCrud.editing} />
          </Form.Item>
          <Form.Item name="label" label="Tên hiển thị" rules={[{ required: true }]}>
            <Input placeholder="vd: V-League" />
          </Form.Item>
          <Form.Item name="sortOrder" label="Thứ tự" initialValue={0}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={ruleCrud.modalOpen}
        title={ruleCrud.editing ? 'Sửa quy tắc' : 'Thêm quy tắc'}
        onOk={ruleCrud.handleSave}
        onCancel={ruleCrud.closeModal}
        confirmLoading={ruleCrud.saving}
        destroyOnHidden={false}
        width={520}
      >
        <Form form={ruleForm} layout="vertical">
          <Form.Item name="topicId" label="Chủ đề" rules={[{ required: true }]}>
            <Select
              placeholder="Chọn chủ đề"
              options={topics.map((t: TopicRow) => ({ value: t.id, label: `${t.label} (${t.id})` }))}
            />
          </Form.Item>
          <Form.Item name="ruleType" label="Loại quy tắc" rules={[{ required: true }]}>
            <Select
              placeholder="Chọn loại"
              options={ruleTypes.map((t: string) => ({ value: t, label: t }))}
              onChange={() => ruleForm.setFieldsValue({ pattern: '', values: '', value: '' })}
            />
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.ruleType !== curr.ruleType}>
            {({ getFieldValue }) => {
              const rt = getFieldValue('ruleType');
              if (rt === 'competition_regex' || rt === 'title_regex') {
                return (
                  <Form.Item name="pattern" label="Regex pattern" rules={[{ required: true }]}>
                    <Input placeholder="vd: v-?league|v\s*league" />
                  </Form.Item>
                );
              }
              if (rt === 'teams_contains') {
                return (
                  <Form.Item
                    name="values"
                    label="Danh sách đội (mỗi dòng một giá trị)"
                    rules={[{ required: true }]}
                  >
                    <Input.TextArea rows={4} placeholder="arsenal&#10;chelsea&#10;man city" />
                  </Form.Item>
                );
              }
              if (rt === 'content_type') {
                return (
                  <Form.Item name="value" label="Content type" rules={[{ required: true }]}>
                    <Input placeholder="vd: result" />
                  </Form.Item>
                );
              }
              return null;
            }}
          </Form.Item>
          <Form.Item name="priority" label="Ưu tiên (số nhỏ = chạy trước)" initialValue={0}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
