import type { ContentFormatType } from "../types/index.js";

export const ALLOWED_FORMATS: ContentFormatType[] = [
  "short_hot",
  "quick_summary",
  "debate",
  "data_stat",
  "schedule_recap",
];

export const ALLOWED_TONES = [
  "neutral",
  "humorous",
  "fan_light",
  "debate_hot",
  "news_style",
] as const;

export type AllowedTone = (typeof ALLOWED_TONES)[number];
