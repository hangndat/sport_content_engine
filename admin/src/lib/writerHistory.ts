import type { StreamStep } from '../components/StepBlock';

/** Item for display - có thể từ API (createdAt) hoặc từ session mới (timestamp) */
export type WriterHistoryItem = {
  id: string;
  type: 'rewrite' | 'create';
  timestamp?: number;
  createdAt?: string;
  draftId?: string | null;
  clusterId?: string | null;
  instruction?: string | null;
  steps: StreamStep[];
  result?: { headline?: string; content?: string; draftId?: string } | null;
  error?: string | null;
};
