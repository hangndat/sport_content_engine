import { Tag, Tooltip, Typography } from 'antd';

type ScoreDetailBlockProps = {
  scoreDetail: {
    total: number;
    tierFreshness: number;
    confirmBonus: number;
    viralBonus: number;
    viralSignals: {
      hotEntityBonus: number;
      competitionBonus: number;
      contentTypeBonus: number;
      crossSourceBonus: number;
      totalViralBonus: number;
    };
  };
  compact?: boolean;
};

const LABELS = {
  tierFreshness: 'Nguồn + độ mới',
  confirmBonus: 'Đa nguồn',
  viralBonus: 'Viral',
} as const;

export function ScoreDetailBlock({ scoreDetail: sd, compact }: ScoreDetailBlockProps) {
  if (!sd) return null;

  const formula = `${sd.tierFreshness} + ${sd.confirmBonus} + ${sd.viralBonus} = ${sd.total}`;
  const vs = sd.viralSignals;
  const hasViralBreakdown = vs.totalViralBonus > 0;

  if (compact) {
    return (
      <div
        style={{
          fontSize: 12,
          padding: '8px 12px',
          background: '#fafafa',
          borderRadius: 6,
        }}
      >
        <div style={{ marginBottom: hasViralBreakdown ? 6 : 0 }}>
          <Tooltip title="Nguồn+độ mới">
            <Tag color="default">{sd.tierFreshness}</Tag>
          </Tooltip>
          <span style={{ margin: '0 4px', color: '#bbb' }}>+</span>
          <Tooltip title="Nhiều nguồn trùng tin">
            <Tag color="blue">{sd.confirmBonus}</Tag>
          </Tooltip>
          <span style={{ margin: '0 4px', color: '#bbb' }}>+</span>
          <Tooltip title="Hot entity, giải, loại tin">
            <Tag color="green">{sd.viralBonus}</Tag>
          </Tooltip>
          <span style={{ margin: '0 6px', color: '#999' }}>=</span>
          <Tag color="blue">{sd.total}đ</Tag>
        </div>
        {hasViralBreakdown && (
          <div style={{ color: '#666', fontSize: 11 }}>
            Viral: {vs.hotEntityBonus > 0 && `hot ${vs.hotEntityBonus}`}
            {vs.competitionBonus > 0 && ` · giải ${vs.competitionBonus}`}
            {vs.contentTypeBonus > 0 && ` · loại tin ${vs.contentTypeBonus}`}
            {vs.crossSourceBonus > 0 && ` · đa nguồn ${vs.crossSourceBonus}`}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        padding: '12px 16px',
        background: '#fafafa',
        borderRadius: 8,
        border: '1px solid #f0f0f0',
      }}
    >
      <div style={{ marginBottom: 8 }}>
        <Typography.Text strong style={{ fontSize: 13 }}>
          Điểm = {formula}
        </Typography.Text>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: hasViralBreakdown ? 8 : 0 }}>
        <Tooltip title="Tier nguồn (1/2/3) × độ mới tin trong 24h">
          <Tag color="default">{LABELS.tierFreshness}: {sd.tierFreshness}đ</Tag>
        </Tooltip>
        <Tooltip title="Nhiều báo cùng đưa tin → tin đáng tin">
          <Tag color="blue">{LABELS.confirmBonus}: +{sd.confirmBonus}đ</Tag>
        </Tooltip>
        <Tooltip title="Hot entity, giải hot, loại tin, đa nguồn">
          <Tag color="green">{LABELS.viralBonus}: +{sd.viralBonus}đ</Tag>
        </Tooltip>
      </div>
      {hasViralBreakdown && (
        <div
          style={{
            padding: '8px 12px',
            background: '#fff',
            borderRadius: 6,
            fontSize: 12,
            color: '#666',
          }}
        >
          <Typography.Text type="secondary" style={{ fontSize: 11 }}>
            Chi tiết viral:
          </Typography.Text>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 12px', marginTop: 4 }}>
            {vs.hotEntityBonus > 0 && (
              <Tooltip title="Đội/cầu thủ hot (Messi, ĐT VN, Barca...)">
                <span>hot {vs.hotEntityBonus}đ</span>
              </Tooltip>
            )}
            {vs.competitionBonus > 0 && (
              <Tooltip title="Giải hot (C1, NHA, V-League...)">
                <span>giải {vs.competitionBonus}đ</span>
              </Tooltip>
            )}
            {vs.contentTypeBonus > 0 && (
              <Tooltip title="Loại tin dễ viral (result, rumor...)">
                <span>loại tin {vs.contentTypeBonus}đ</span>
              </Tooltip>
            )}
            {vs.crossSourceBonus > 0 && (
              <Tooltip title="2, 3, 4+ nguồn trùng tin">
                <span>đa nguồn {vs.crossSourceBonus}đ</span>
              </Tooltip>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
