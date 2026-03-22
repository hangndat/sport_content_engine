import type { UnifiedArticle } from "../types/index.js";

export interface SourceConfig {
  id: string;
  type: string;
  tier: 1 | 2 | 3;
  url?: string;
  rateLimitMinutes?: number;
  enabled?: boolean;
}

export interface IConnector {
  fetch(config: SourceConfig): Promise<UnifiedArticle[]>;
}
