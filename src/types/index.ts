export type SourceTier = 1 | 2 | 3;
export type ContentType = "news" | "result" | "rumor" | "stats" | "opinion" | "schedule";

export interface UnifiedArticle {
  id: string;
  source: string;
  sourceTier: SourceTier;
  url: string;
  title: string;
  content: string;
  publishedAt: Date;
  language: string;
  teams?: string[];
  players?: string[];
  competition?: string;
  contentType: ContentType;
  rawPayload?: object;
}

export interface StoryCluster {
  id: string;
  articleIds: string[];
  canonicalArticleId: string;
  hashKey: string;
  score: number;
  enrichedAt?: Date;
}

export type ContentFormatType =
  | "short_hot"
  | "quick_summary"
  | "debate"
  | "data_stat"
  | "schedule_recap";

export interface AIDraftOutput {
  headline: string;
  summary: string;
  confidenceScore: number;
  sourceList: string[];
  teams: string[];
  players: string[];
  ctaComment?: string;
  recommendedImageQuery?: string;
  publishPriority: "low" | "medium" | "high";
  format: ContentFormatType;
}
