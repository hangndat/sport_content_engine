import { Input, Select, Typography, Space, Tag, Segmented, Divider } from 'antd';
import { toneLabels, variantLabels, applyTone, VARIANT_EXCLUDE_KEYS } from '../constants';
import type { DraftRow } from '../lib/draftShared';


function getVariantKeys(variants?: Record<string, string>): string[] {
  if (!variants) return [];
  return Object.keys(variants).filter((k) => !VARIANT_EXCLUDE_KEYS.includes(k));
}

export interface DraftEditFormProps {
  draft: DraftRow;
  editHeadline: string;
  setEditHeadline: (v: string) => void;
  editContent: string;
  setEditContent: (v: string) => void;
  editTone: string;
  setEditTone: (v: string) => void;
  onVariantChange?: (variant: string) => Promise<void>;
  contentRows?: number;
  showPreview?: boolean;
  toneSelectWidth?: number | string;
}

export function DraftEditForm({
  draft,
  editHeadline,
  setEditHeadline,
  editContent,
  setEditContent,
  editTone,
  setEditTone,
  onVariantChange,
  contentRows = 6,
  showPreview = true,
  toneSelectWidth = '100%',
}: DraftEditFormProps) {
  const variantKeys = getVariantKeys(draft.variants);
  const previewContent = applyTone(editContent || draft.content, editTone);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Tiêu đề
        </Typography.Text>
        <Input.TextArea
          value={editHeadline}
          onChange={(e) => setEditHeadline(e.target.value)}
          rows={2}
          style={{ marginTop: 4 }}
        />
      </div>
      <div>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Nội dung
        </Typography.Text>
        <Input.TextArea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          rows={contentRows}
          style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}
        />
      </div>
      <div>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Văn phong (áp dụng khi đăng)
        </Typography.Text>
        <Select
          value={editTone}
          onChange={setEditTone}
          style={{ marginTop: 6, width: toneSelectWidth }}
          options={Object.entries(toneLabels).map(([k, lb]) => ({
            value: k,
            label: lb,
          }))}
        />
      </div>
      {showPreview && (
        <div>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Preview khi đăng
          </Typography.Text>
          <div
            style={{
              marginTop: 6,
              padding: 12,
              background: '#fafafa',
              borderRadius: 6,
              whiteSpace: 'pre-wrap',
              fontSize: 14,
            }}
          >
            {previewContent}
          </div>
        </div>
      )}
      {variantKeys.length > 0 && onVariantChange && (
        <>
          <Divider style={{ margin: '8px 0' }} />
          <div>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Format hiện tại
            </Typography.Text>
            <div style={{ marginTop: 6 }}>
              <Segmented
                size="small"
                value={draft.format}
                options={variantKeys.map((k) => ({
                  label: variantLabels[k] ?? k,
                  value: k,
                }))}
                onChange={async (v) => {
                  if (typeof v === 'string') await onVariantChange(v);
                }}
              />
            </div>
          </div>
        </>
      )}
      {(draft.sourceList?.length ?? 0) > 0 && (
        <div>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Nguồn
          </Typography.Text>
          <div style={{ marginTop: 6 }}>
            <Space wrap>
              {(draft.sourceList ?? []).map((s) => (
                <Tag key={s}>{s}</Tag>
              ))}
            </Space>
          </div>
        </div>
      )}
      {(draft.ctaComment || draft.recommendedImageQuery) && (
        <div style={{ fontSize: 12, color: '#888' }}>
          {draft.ctaComment && <div>CTA: {draft.ctaComment}</div>}
          {draft.recommendedImageQuery && (
            <div>Ảnh: {draft.recommendedImageQuery}</div>
          )}
        </div>
      )}
    </div>
  );
}
