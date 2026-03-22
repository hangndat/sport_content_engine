export const STATUS_MAP: Record<string, { color: string; label: string }> = {
  running: { color: 'processing', label: 'Đang chạy' },
  completed: { color: 'success', label: 'Hoàn thành' },
  failed: { color: 'error', label: 'Thất bại' },
};

export const STEP_LABELS: Record<string, string> = {
  fetch: '1. Thu thập',
  save: '2. Lưu DB',
  dedup: '3. Gom cluster',
  score: '4. Tính điểm',
};

export function getStepLabel(name: string): string {
  return STEP_LABELS[name] ?? name;
}
