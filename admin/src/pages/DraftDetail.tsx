import {
  App as AntdApp,
  Card,
  Button,
  Tag,
  Space,
  Divider,
  Spin,
} from 'antd';
import { ArrowLeftOutlined, ClusterOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import {
  getDraft,
  selectVariant,
} from '../api';
import {
  statusColors,
  statusLabels,
  toneLabels,
  applyTone,
  type DraftRow,
} from '../lib/draftShared';
import { useDraftActions } from '../hooks/useDraftActions';
import { useDraftEdit } from '../hooks/useDraftEdit';
import { DraftEditForm } from '../components/DraftEditForm';
import { DraftActionButtons } from '../components/DraftActionButtons';

export default function DraftDetail() {
  const { message } = AntdApp.useApp();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<DraftRow | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDraft = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const d = await getDraft(id);
      setDraft(d as DraftRow);
    } catch {
      message.error('Không tải được draft');
    } finally {
      setLoading(false);
    }
  }, [id, message]);

  useEffect(() => {
    loadDraft();
  }, [loadDraft]);

  const { actioning, handleApprove, handleReject, handlePublish } = useDraftActions({
    draftId: draft?.id,
    onSuccess: (msg) => message.success(msg),
    onError: (msg) => message.error(msg),
    refreshDraft: setDraft,
    onPublishSuccess: () => navigate('/drafts'),
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
    draft,
    onSuccess: (updated) => setDraft(updated),
    onError: (msg) => message.error(msg),
    refetch: loadDraft,
  });

  const handleVariantChange = async (variant: string) => {
    if (!draft) return;
    await selectVariant(draft.id, variant);
    const fresh = await getDraft(draft.id);
    setDraft(fresh as DraftRow);
    setEditContent((fresh as DraftRow).content);
  };

  const handleSaveClick = async () => {
    const didSave = await handleSaveEdit();
    if (!didSave) message.info('Không có thay đổi');
  };

  if (loading || !draft) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  const d = draft;
  const previewContent = applyTone(editContent || d.content, editTone);

  return (
    <div style={{ padding: '0 24px' }}>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/drafts')}>
          Quay lại
        </Button>
        {d.storyClusterId && (
          <Button
            icon={<ClusterOutlined />}
            onClick={() => navigate(`/clusters/${d.storyClusterId}`)}
          >
            Tin gom
          </Button>
        )}
        <Tag color={statusColors[d.status] ?? 'default'}>
          {statusLabels[d.status] ?? d.status}
        </Tag>
        <Tag>{toneLabels[d.tone ?? 'neutral'] ?? 'Trung lập'}</Tag>
        {d.confidenceScore != null && <Tag>Độ tin: {d.confidenceScore}%</Tag>}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 380px',
          gap: 24,
          alignItems: 'start',
        }}
      >
        <Card title="Chỉnh sửa">
          <DraftEditForm
            draft={d}
            editHeadline={editHeadline}
            setEditHeadline={setEditHeadline}
            editContent={editContent}
            setEditContent={setEditContent}
            editTone={editTone}
            setEditTone={setEditTone}
            onVariantChange={handleVariantChange}
            contentRows={8}
            showPreview={false}
            toneSelectWidth={200}
          />
        </Card>

        <Card title="Preview Facebook">
          <div
            style={{
              background: '#f0f2f5',
              borderRadius: 8,
              padding: 16,
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            <div
              style={{
                background: '#fff',
                borderRadius: 8,
                padding: 12,
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
              }}
            >
              <div style={{ fontSize: 15, whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
                {previewContent}
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Divider />

      <Space wrap>
        <Button onClick={() => navigate('/drafts')}>Đóng</Button>
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
            setDraft({ ...d, headline: result.headline, content: result.content });
          }}
          onRewriteError={(err) => message.error(err)}
        />
      </Space>
    </div>
  );
}
