import { ProTable } from '@ant-design/pro-components';
import { App as AntdApp, Card, Button, Modal, Form, Input, Select } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { getClusterCategoriesConfig, createClusterCategory, updateClusterCategory, deleteClusterCategory, getClustersTopics } from '../api';
import { useQuery } from '../hooks/useQuery';
import { ActionIcon, ActionIconConfirm, TableActions } from '../components/TableActions';
import { PageToolbar } from '../components/PageToolbar';
import { EmptyState } from '../components/EmptyState';
import { useCrudModal } from '../hooks/useCrudModal';

type CategoryRow = { id: string; label: string; topicIds: string[]; sortOrder?: number };

export default function ClusterCategories() {
  const { message } = AntdApp.useApp();
  const { data: categories, loading, refetch } = useQuery(getClusterCategoriesConfig);
  const { data: topicsData } = useQuery(getClustersTopics);
  const topics = topicsData?.data ?? [];
  const [form] = Form.useForm();

  const crud = useCrudModal<CategoryRow>({
    form,
    refetch,
    onCreate: async (vals) =>
      createClusterCategory({
        id: vals.id as string,
        label: vals.label as string,
        topicIds: vals.topicIds as string[],
        sortOrder: vals.sortOrder as number,
      }),
    onUpdate: async (id, vals) =>
      updateClusterCategory(id, {
        label: vals.label as string,
        topicIds: vals.topicIds as string[],
        sortOrder: vals.sortOrder as number,
      }),
    onDelete: deleteClusterCategory,
    getEditValues: (r) => ({
      id: r.id,
      label: r.label,
      topicIds: r.topicIds,
      sortOrder: r.sortOrder ?? 0,
    }),
    onSuccess: (msg) => message.success(msg),
    onError: (msg) => message.error(msg),
  });

  const arr = (categories?.data ?? []) as CategoryRow[];

  return (
    <>
      <Card title="Nhóm chủ đề" styles={{ header: { padding: '16px 20px' } }}>
        <p style={{ color: '#666', marginBottom: 12 }}>
          Nhóm chủ đề hiển thị trên trang Tin gom. Mỗi nhóm gồm nhiều chủ đề (topic).
        </p>
        <PageToolbar onRefresh={refetch} loading={loading}>
          <Button type="primary" size="small" icon={<PlusOutlined />} onClick={crud.handleAdd}>
            Thêm nhóm
          </Button>
        </PageToolbar>
        <ProTable
          search={false}
          options={false}
          loading={loading}
          dataSource={arr}
          rowKey="id"
          columns={[
            { title: 'ID', dataIndex: 'id', key: 'id', width: 140 },
            { title: 'Tên hiển thị', dataIndex: 'label', key: 'label' },
            {
              title: 'Chủ đề',
              dataIndex: 'topicIds',
              key: 'topicIds',
              render: (_: unknown, r: CategoryRow) =>
                (r.topicIds ?? []).length > 0 ? (
                  (r.topicIds ?? [])
                    .map((tid) => topics.find((x) => x.id === tid)?.label ?? tid)
                    .join(', ')
                ) : (
                  '-'
                ),
            },
            {
              title: 'Thứ tự',
              dataIndex: 'sortOrder',
              key: 'sortOrder',
              width: 80,
            },
            {
              title: '',
              key: 'actions',
              width: 80,
              render: (_: unknown, r: CategoryRow) => (
                <TableActions>
                  <ActionIcon
                    icon={<EditOutlined />}
                    title="Sửa"
                    onClick={() => crud.handleEdit(r)}
                  />
                  <ActionIconConfirm
                    icon={<DeleteOutlined />}
                    title="Xóa"
                    confirmTitle="Xóa nhóm này?"
                    danger
                    onConfirm={() => crud.handleDelete(r.id)}
                  />
                </TableActions>
              ),
            },
          ]}
        />
        <EmptyState
          message="Chưa có nhóm. Thêm mới hoặc chạy npm run db:init"
          loading={loading}
          count={arr.length}
        />
      </Card>

      <Modal
        open={crud.modalOpen}
        title={crud.editing ? 'Sửa nhóm' : 'Thêm nhóm'}
        onOk={crud.handleSave}
        onCancel={crud.closeModal}
        confirmLoading={crud.saving}
        destroyOnHidden={false}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="id" label="ID" rules={[{ required: !crud.editing }]}>
            <Input placeholder="vd: cat_schedule" disabled={!!crud.editing} />
          </Form.Item>
          <Form.Item name="label" label="Tên hiển thị" rules={[{ required: true }]}>
            <Input placeholder="vd: Lịch / Kết quả" />
          </Form.Item>
          <Form.Item name="topicIds" label="Topic IDs" rules={[{ required: true }]}>
            <Select
              mode="multiple"
              placeholder="Chọn chủ đề"
              options={topics.filter((t) => t.id !== 'other').map((t) => ({ value: t.id, label: t.label }))}
            />
          </Form.Item>
          <Form.Item name="sortOrder" label="Thứ tự" initialValue={0}>
            <Input type="number" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
