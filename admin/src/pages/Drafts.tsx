import { ProTable } from '@ant-design/pro-components';
import {
  App as AntdApp,
  Card,
  Button,
  Tag,
  Space,
  Drawer,
  Segmented,
  Select,
} from 'antd';
import {
  EditOutlined,
  FullscreenOutlined,
  CheckOutlined,
  CloseOutlined,
  SendOutlined,
  ClusterOutlined,
} from '@ant-design/icons';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePagination } from '../hooks/usePagination';
import { useDraftActions } from '../hooks/useDraftActions';
import { useDraftEdit } from '../hooks/useDraftEdit';
import {
  getDrafts,
  getDraft,
  selectVariant,
} from '../api';
import {
  statusColors,
  statusLabels,
  variantLabels,
  toneLabels,
  applyTone,
  type DraftRow,
} from '../lib/draftShared';
import { VARIANT_EXCLUDE_KEYS } from '../constants';
import { ActionIcon, ActionIconConfirm, TableActions } from '../components/TableActions';
import { PageToolbar } from '../components/PageToolbar';
import { EmptyState } from '../components/EmptyState';
import { DraftEditForm } from '../components/DraftEditForm';
import { DraftActionButtons } from '../components/DraftActionButtons';


export default function Drafts() {
  const { message } = AntdApp.useApp();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [formatFilter, setFormatFilter] = useState<string>('');
  const filterParams = {
    ...(statusFilter && { status: statusFilter }),
    ...(formatFilter && { format: formatFilter }),
  };
  const { data: drafts, loading, refetch, pagination } = usePagination(
    getDrafts,
    20,
    filterParams,
    [statusFilter, formatFilter]
  );
  const [drawerDraft, setDrawerDraft] = useState<DraftRow | null>(null);

  const { actioning, handleApprove, handleReject, handlePublish } = useDraftActions({
    draftId: drawerDraft?.id,
    onSuccess: (msg) => message.success(msg),
    onError: (msg) => message.error(msg),
    refetch,
    refreshDraft: setDrawerDraft,
    onPublishSuccess: () => setDrawerDraft(null),
  });

  const {
    editHeadline,
    setEditHeadline,
    editContent,
    setEditContent,
    editTone,
    setEditTone,
    saving,
    handleSaveEdit,
  } = useDraftEdit({
    draft: drawerDraft,
    onSuccess: (updated) => setDrawerDraft(updated),
    onError: (msg) => message.error(msg),
    refetch,
  });

  const arr = (drafts ?? []) as DraftRow[];
  const d = drawerDraft;

  const handleSaveClick = async () => {
    const didSave = await handleSaveEdit();
    if (!didSave) message.info('Không có thay đổi');
  };

  const handleVariantChange = async (variant: string) => {
    if (!d) return;
    await selectVariant(d.id, variant);
    refetch();
    const fresh = await getDraft(d.id);
    setDrawerDraft(fresh as DraftRow);
  };

  return (
    <>
      <Card title="Bản nháp">
        <PageToolbar onRefresh={refetch} loading={loading}>
          <Select
            size="small"
            placeholder="Trạng thái"
            style={{ width: 140 }}
            allowClear
            value={statusFilter || undefined}
            onChange={(v) => setStatusFilter(v ?? '')}
            options={[
              { value: '', label: 'Tất cả' },
              { value: 'pending', label: statusLabels.pending },
              { value: 'approved', label: statusLabels.approved },
              { value: 'rejected', label: statusLabels.rejected },
            ]}
          />
          <Select
            size="small"
            placeholder="Format"
            style={{ width: 140 }}
            allowClear
            value={formatFilter || undefined}
            onChange={(v) => setFormatFilter(v ?? '')}
            options={[
              { value: '', label: 'Tất cả' },
              ...Object.entries(variantLabels).map(([k, v]) => ({ value: k, label: v })),
            ]}
          />
        </PageToolbar>

        <ProTable<DraftRow>
          loading={loading}
          dataSource={arr}
          rowKey="id"
          size="small"
          search={false}
          options={false}
          pagination={pagination}
          onRow={(r) => ({ style: { cursor: 'pointer' }, onClick: () => setDrawerDraft(r) })}
          expandable={{
            expandedRowRender: (row) => {
              const variants = row.variants ?? {};
              const variantKeys = Object.keys(variants).filter(
                (k) => !VARIANT_EXCLUDE_KEYS.includes(k)
              );
              return (
                <div style={{ padding: '8px 24px' }} onClick={(e) => e.stopPropagation()}>
                  <div style={{ whiteSpace: 'pre-wrap', marginBottom: 12 }}>
                    {applyTone(row.content, row.tone)}
                  </div>
                  {variantKeys.length > 0 && (
                    <Space wrap>
                      <span style={{ fontSize: 12, color: '#666' }}>Variant:</span>
                      <Segmented
                        size="small"
                        value={row.format}
                        options={variantKeys.map((k) => ({
                          label: variantLabels[k] ?? k,
                          value: k,
                        }))}
                        onChange={async (v) => {
                          if (typeof v === 'string') {
                            await selectVariant(row.id, v);
                            refetch();
                          }
                        }}
                      />
                    </Space>
                  )}
                </div>
              );
            },
          }}
          columns={[
            {
              title: 'Tiêu đề',
              dataIndex: 'headline',
              key: 'headline',
              ellipsis: true,
              render: (_: unknown, r: DraftRow) => (
                <a
                  onClick={(e) => {
                    e.stopPropagation();
                    setDrawerDraft(r);
                  }}
                >
                  {r.headline}
                </a>
              ),
            },
            {
              title: 'Trạng thái',
              dataIndex: 'status',
              key: 'status',
              width: 110,
              render: (_: unknown, r: DraftRow) => (
                <Tag color={statusColors[r.status] ?? 'default'}>
                  {statusLabels[r.status] ?? r.status}
                </Tag>
              ),
            },
            {
              title: 'Văn phong',
              dataIndex: 'tone',
              key: 'tone',
              width: 100,
              render: (_: unknown, r: DraftRow) => (
                <Tag>{toneLabels[r.tone ?? 'neutral'] ?? 'Trung lập'}</Tag>
              ),
            },
            {
              title: 'Độ tin',
              dataIndex: 'confidenceScore',
              key: 'confidenceScore',
              width: 80,
              render: (_: unknown, r: DraftRow) =>
                r.confidenceScore != null ? (
                  <Tag>{r.confidenceScore}%</Tag>
                ) : (
                  '-'
                ),
            },
            {
              title: 'Format',
              dataIndex: 'format',
              key: 'format',
              width: 100,
              render: (_: unknown, r: DraftRow) => variantLabels[r.format] ?? r.format,
            },
            {
              title: '',
              key: 'actions',
              width: 130,
              render: (_: unknown, row: DraftRow) => (
                <TableActions onClick={(e) => e.stopPropagation()}>
                  {row.storyClusterId && (
                    <ActionIcon
                      icon={<ClusterOutlined />}
                      title="Xem tin gom"
                      onClick={() => navigate(`/clusters/${row.storyClusterId}`)}
                    />
                  )}
                  <ActionIcon
                    icon={<EditOutlined />}
                    title="Chi tiết"
                    onClick={() => setDrawerDraft(row)}
                  />
                  {row.status === 'pending' && (
                    <>
                      <ActionIcon
                        icon={<CheckOutlined />}
                        title="Duyệt"
                        type="primary"
                        loading={actioning === row.id}
                        onClick={() => handleApprove(row.id)}
                      />
                      <ActionIconConfirm
                        icon={<CloseOutlined />}
                        title="Từ chối"
                        confirmTitle="Từ chối draft?"
                        danger
                        loading={actioning === row.id}
                        onConfirm={() => handleReject(row.id)}
                      />
                    </>
                  )}
                  {row.status === 'approved' && (
                    <ActionIcon
                      icon={<SendOutlined />}
                      title="Đăng"
                      type="primary"
                      loading={actioning === row.id}
                      onClick={() => handlePublish(row.id)}
                    />
                  )}
                </TableActions>
              ),
            },
          ]}
        />
        <EmptyState
          message="Chưa có bản nháp. Vào Tin gom → Tạo bản nháp."
          loading={loading}
          count={arr.length}
        />
      </Card>

      <Drawer
        title={d?.headline ?? 'Chi tiết bản nháp'}
        open={!!d}
        onClose={() => setDrawerDraft(null)}
        width={560}
        footer={
          d ? (
            <Space wrap>
              {d.storyClusterId && (
                <Button
                  icon={<ClusterOutlined />}
                  onClick={() => navigate(`/clusters/${d.storyClusterId}`)}
                >
                  Tin gom
                </Button>
              )}
              <Button onClick={() => setDrawerDraft(null)}>Đóng</Button>
              <Button type="primary" loading={saving} onClick={handleSaveClick}>
                Lưu chỉnh sửa
              </Button>
              <DraftActionButtons
                draft={d}
                actioning={actioning}
                onApprove={handleApprove}
                onReject={handleReject}
                onPublish={handlePublish}
                onRewriteSuccess={(result) => {
                  message.success('Đã viết lại');
                  setEditHeadline(result.headline);
                  setEditContent(result.content);
                  setDrawerDraft({
                    ...d,
                    headline: result.headline,
                    content: result.content,
                  });
                  refetch();
                }}
                onRewriteError={(err) => message.error(err)}
              />
            </Space>
          ) : null
        }
      >
        {d && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ marginBottom: -8 }}>
              <Button
                type="link"
                size="small"
                icon={<FullscreenOutlined />}
                onClick={() => navigate(`/drafts/${d.id}`)}
              >
                Mở trang chi tiết
              </Button>
            </div>
            <DraftEditForm
              draft={d}
              editHeadline={editHeadline}
              setEditHeadline={setEditHeadline}
              editContent={editContent}
              setEditContent={setEditContent}
              editTone={editTone}
              setEditTone={setEditTone}
              onVariantChange={handleVariantChange}
              contentRows={6}
              showPreview
            />
          </div>
        )}
      </Drawer>
    </>
  );
}
