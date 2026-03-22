export const statusColors: Record<string, string> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'default',
};

export const statusLabels: Record<string, string> = {
  pending: 'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Từ chối',
};

export const variantLabels: Record<string, string> = {
  short_hot: 'Ngắn',
  quick_summary: 'Tóm tắt',
  debate: 'Tranh luận',
  data_stat: 'Số liệu',
  schedule_recap: 'Lịch',
};

export const toneLabels: Record<string, string> = {
  neutral: 'Trung lập',
  humorous: 'Vui [Vui]',
  fan_light: 'Fan 🔥',
  debate_hot: 'Tranh luận 💬',
  news_style: 'Tin tức 📰',
};

export const TONE_PREFIXES: Record<string, string> = {
  neutral: '',
  humorous: '[Vui] ',
  fan_light: '🔥 ',
  debate_hot: '💬 ',
  news_style: '📰 ',
};

export function applyTone(content: string, tone?: string | null): string {
  const prefix = TONE_PREFIXES[tone ?? 'neutral'] ?? '';
  return prefix ? `${prefix}${content}` : content;
}

export const FORMAT_OPTIONS = [
  { value: 'auto', label: 'Tự động (AI chọn)' },
  { value: 'short_hot', label: 'Ngắn gọn, tin nóng' },
  { value: 'quick_summary', label: 'Tóm tắt 3 ý' },
  { value: 'debate', label: 'Tranh luận, câu hỏi' },
  { value: 'data_stat', label: 'Số liệu, thống kê' },
  { value: 'schedule_recap', label: 'Lịch đấu' },
];

export const TONE_OPTIONS = [
  { value: 'neutral', label: 'Trung lập' },
  { value: 'humorous', label: 'Vui [Vui]' },
  { value: 'fan_light', label: 'Fan 🔥' },
  { value: 'debate_hot', label: 'Tranh luận 💬' },
  { value: 'news_style', label: 'Tin tức 📰' },
];

/** Keys excluded when comparing draft variants for changes */
export const VARIANT_EXCLUDE_KEYS = ['ctaComment', 'recommendedImageQuery'];
