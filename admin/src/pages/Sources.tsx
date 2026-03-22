import { ProTable } from '@ant-design/pro-components';
import { App as AntdApp, Card, Tag, Button, Modal, Form, Input, Select, Switch, Tooltip } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { usePagination } from '../hooks/usePagination';
import { useQuery } from '../hooks/useQuery';
import { ActionIcon, ActionIconConfirm, TableActions } from '../components/TableActions';
import { PageToolbar } from '../components/PageToolbar';
import { EmptyState } from '../components/EmptyState';
import { useCrudModal } from '../hooks/useCrudModal';
import { getSources, getSourceArticleCounts, createSource, updateSource, deleteSource } from '../api';
import { tierLabels } from '../constants';

type SourceRow = { id: string; type: string; tier: number; url?: string; enabled?: boolean };

export default function Sources() {
  const { message } = AntdApp.useApp();
  const { data: sources, loading, refetch, pagination } = usePagination(getSources);
  const { data: countsData, refetch: refetchCounts } = useQuery(getSourceArticleCounts);
  const articleCounts = countsData?.data ?? {};
  const [form] = Form.useForm();

  const crud = useCrudModal<SourceRow>({
    form,
    refetch,
    onCreate: async (vals) => {
      const res = await createSource({
        id: vals.id as string,
        type: vals.type as string,
        tier: vals.tier as number,
        url: (vals.url as string) || undefined,
        enabled: vals.enabled as boolean,
      });
      return res;
    },
    onUpdate: async (id, vals) => {
      const res = await updateSource(id, {
        tier: vals.tier as number,
        url: (vals.url as string) || undefined,
        enabled: vals.enabled as boolean,
      });
      return res;
    },
    onDelete: deleteSource,
    getEditValues: (r) => ({
      id: r.id,
      type: r.type,
      tier: r.tier,
      url: r.url ?? '',
      enabled: r.enabled ?? true,
    }),
    onSuccess: (msg) => message.success(msg),
    onError: (msg) => message.error(msg),
  });

  const arr = (sources ?? []) as SourceRow[];

  return (
    <>
      <Card title="Nguồn tin" styles={{ header: { padding: '16px 20px' } }}>
        <PageToolbar
          onRefresh={() => {
            refetch();
            refetchCounts();
          }}
          loading={loading}
        >
          <Button type="primary" size="small" icon={<PlusOutlined />} onClick={crud.handleAdd}>
            Thêm nguồn
          </Button>
        </PageToolbar>
        <ProTable
          search={false}
          options={false}
          loading={loading}
          dataSource={arr}
          rowKey="id"
          columns={[
            { title: 'ID', dataIndex: 'id', key: 'id', width: 120 },
            {
              title: 'Type',
              dataIndex: 'type',
              key: 'type',
              width: 90,
              render: (_: unknown, r: SourceRow) => <Tag>{r.type}</Tag>,
            },
            {
              title: 'Tier',
              dataIndex: 'tier',
              key: 'tier',
              width: 140,
              render: (_: unknown, r: SourceRow) => tierLabels[r.tier] ?? `Tier ${r.tier}`,
            },
            {
              title: 'Trạng thái',
              dataIndex: 'enabled',
              key: 'enabled',
              width: 100,
              render: (_: unknown, r: SourceRow) => (
                <Tag color={r.enabled ? 'success' : 'default'}>{r.enabled ? 'Bật' : 'Tắt'}</Tag>
              ),
            },
            {
              title: (
                <Tooltip title="Tổng số bài đã crawl từ nguồn này">
                  <span>Bài crawl</span>
                </Tooltip>
              ),
              key: 'articleCount',
              width: 100,
              sorter: (a: SourceRow, b: SourceRow) =>
                (articleCounts[b.id]?.total ?? 0) - (articleCounts[a.id]?.total ?? 0),
              render: (_: unknown, r: SourceRow) => {
                const c = articleCounts[r.id];
                if (!c) return '–';
                return (
                  <Tooltip title={`+${c.last24h} trong 24h gần nhất`}>
                    <span>
                      {c.total}
                      {c.last24h > 0 && (
                        <span style={{ color: '#52c41a', fontSize: 12, marginLeft: 4 }}>
                          (+{c.last24h})
                        </span>
                      )}
                    </span>
                  </Tooltip>
                );
              },
            },
            { title: 'URL', dataIndex: 'url', key: 'url', ellipsis: true },
            {
              title: '',
              key: 'actions',
              width: 80,
              render: (_: unknown, r: SourceRow) => (
                <TableActions>
                  <ActionIcon
                    icon={<EditOutlined />}
                    title="Sửa"
                    onClick={() => crud.handleEdit(r)}
                  />
                  <ActionIconConfirm
                    icon={<DeleteOutlined />}
                    title="Xóa"
                    confirmTitle="Xóa nguồn này?"
                    danger
                    onConfirm={() => crud.handleDelete(r.id)}
                  />
                </TableActions>
              ),
            },
          ]}
          pagination={pagination}
        />
        <EmptyState
          message="Chưa có nguồn. Thêm nguồn hoặc chạy Ingest để seed mặc định."
          loading={loading}
          count={arr.length}
        />
      </Card>

      <Modal
        open={crud.modalOpen}
        title={crud.editing ? 'Sửa nguồn' : 'Thêm nguồn'}
        onOk={crud.handleSave}
        onCancel={crud.closeModal}
        confirmLoading={crud.saving}
        destroyOnClose={false}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="id" label="ID" rules={[{ required: !crud.editing }]}>
            <Input placeholder="vd: vnexpress-thethao" disabled={!!crud.editing} />
          </Form.Item>
          <Form.Item name="type" label="Type" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'rss', label: 'RSS' },
                { value: 'scraper', label: 'Scraper' },
                { value: 'api', label: 'API' },
                { value: 'social', label: 'Social' },
              ]}
              disabled={!!crud.editing}
            />
          </Form.Item>
          <Form.Item name="tier" label="Tier" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 1, label: 'Tier 1 - Chính thức' },
                { value: 2, label: 'Tier 2 - Báo lớn' },
                { value: 3, label: 'Tier 3 - Cộng đồng' },
              ]}
            />
          </Form.Item>
          <Form.Item name="url" label="URL">
            <Input placeholder="https://..." />
          </Form.Item>
          <Form.Item name="enabled" label="Bật" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
