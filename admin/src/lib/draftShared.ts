export {
  statusColors,
  statusLabels,
  variantLabels,
  toneLabels,
  applyTone,
} from '../constants/draft';

export type DraftRow = {
  id: string;
  storyClusterId?: string | null;
  headline: string;
  summary?: string;
  content: string;
  status: string;
  format: string;
  tone?: string | null;
  confidenceScore?: number;
  sourceList?: string[];
  teams?: string[];
  players?: string[];
  variants?: Record<string, string>;
  ctaComment?: string | null;
  recommendedImageQuery?: string | null;
  createdAt?: string;
};
