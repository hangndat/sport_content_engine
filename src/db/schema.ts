import {
  pgTable,
  text,
  timestamp,
  integer,
  jsonb,
  boolean,
} from "drizzle-orm/pg-core";

export const sources = pgTable("sources", {
  id: text("id").primaryKey(),
  type: text("type").notNull(), // rss | scraper | api | social
  tier: integer("tier").notNull(),
  url: text("url"),
  rateLimitMinutes: integer("rate_limit_minutes").default(15),
  enabled: boolean("enabled").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const articles = pgTable("articles", {
  id: text("id").primaryKey(),
  sourceId: text("source_id").references(() => sources.id),
  source: text("source").notNull(),
  sourceTier: integer("source_tier").notNull(),
  url: text("url").notNull().unique(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  publishedAt: timestamp("published_at").notNull(),
  language: text("language").default("vi"),
  teams: jsonb("teams").$type<string[]>(),
  players: jsonb("players").$type<string[]>(),
  competition: text("competition"),
  contentType: text("content_type").notNull(),
  rawPayload: jsonb("raw_payload"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const topics = pgTable("topics", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type TopicRuleType = "competition_regex" | "teams_contains" | "title_regex";

export const topicRules = pgTable("topic_rules", {
  id: text("id").primaryKey(),
  topicId: text("topic_id").notNull().references(() => topics.id),
  ruleType: text("rule_type").notNull(), // competition_regex | teams_contains | title_regex
  ruleValue: jsonb("rule_value").notNull(), // { pattern: string } | { values: string[] }
  priority: integer("priority").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const clusterCategories = pgTable("cluster_categories", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  topicIds: jsonb("topic_ids").$type<string[]>().notNull(),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const storyClusters = pgTable("story_clusters", {
  id: text("id").primaryKey(),
  hashKey: text("hash_key").notNull().unique(),
  articleIds: jsonb("article_ids").$type<string[]>().notNull(),
  canonicalArticleId: text("canonical_article_id")
    .notNull()
    .references(() => articles.id),
  score: integer("score").default(0),
  topicIds: jsonb("topic_ids").$type<string[]>(),
  enrichedAt: timestamp("enriched_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const drafts = pgTable("drafts", {
  id: text("id").primaryKey(),
  storyClusterId: text("story_cluster_id").references(
    () => storyClusters.id
  ),
  headline: text("headline").notNull(),
  summary: text("summary").notNull(),
  content: text("content").notNull(),
  confidenceScore: integer("confidence_score"),
  sourceList: jsonb("source_list").$type<string[]>(),
  teams: jsonb("teams").$type<string[]>(),
  players: jsonb("players").$type<string[]>(),
  format: text("format").notNull(),
  tone: text("tone").default("neutral"), // neutral | humorous | fan_light | debate_hot | news_style
  publishPriority: text("publish_priority").default("medium"),
  status: text("status").default("pending"), // pending | approved | rejected
  variants: jsonb("variants").$type<Record<string, string>>(),
  ctaComment: text("cta_comment"),
  recommendedImageQuery: text("recommended_image_query"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type IngestStep = {
  name: string;
  status: "ok" | "failed" | "skipped";
  output?: Record<string, unknown>;
  error?: string;
  durationMs?: number;
};

export const ingestRuns = pgTable("ingest_runs", {
  id: text("id").primaryKey(),
  status: text("status").notNull(), // running | completed | failed
  triggeredBy: text("triggered_by").default("manual"), // manual | scheduled
  articlesFetched: integer("articles_fetched").default(0),
  clustersCreated: integer("clusters_created").default(0),
  error: text("error"),
  steps: jsonb("steps").$type<IngestStep[]>(),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  finishedAt: timestamp("finished_at"),
});

export const posts = pgTable("posts", {
  id: text("id").primaryKey(),
  draftId: text("draft_id").references(() => drafts.id),
  platform: text("platform").notNull(), // facebook | telegram
  externalId: text("external_id"),
  publishedAt: timestamp("published_at"),
  status: text("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const writerHistory = pgTable("writer_history", {
  id: text("id").primaryKey(),
  type: text("type").notNull(), // rewrite | create
  draftId: text("draft_id"),
  clusterId: text("cluster_id"),
  instruction: text("instruction"),
  steps: jsonb("steps").notNull(), // StreamStep[]
  result: jsonb("result"), // { headline?, content?, draftId? }
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow(),
});

/** Cấu hình công thức tính điểm cluster – 1 dòng id='default' */
export const scoreConfig = pgTable("score_config", {
  id: text("id").primaryKey().default("default"),
  payload: jsonb("payload").$type<ScoreConfigPayload>().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type ScoreConfigPayload = {
  tierWeights: Record<string, number>;
  freshnessHours: number;
  confirmMaxArticles: number;
  confirmMultiplier: number;
  viralBonusCap: number;
  viralHotEntityMax: number;
  viralCompetitionBonus: number;
  viralContentTypeBonus: Record<string, number>;
  viralCrossSourceBonus: Record<string, number>;
};

/** Cấu hình GPT cho viết bài (rewrite, create draft) – 1 dòng id='default' */
export const gptWriterConfig = pgTable("gpt_writer_config", {
  id: text("id").primaryKey().default("default"),
  model: text("model").notNull().default("gpt-4o-mini"),
  temperature: text("temperature").default("0.7"), // 0-2
  basePromptRewrite: text("base_prompt_rewrite"),
  basePromptContentWriter: text("base_prompt_content_writer"),
  updatedAt: timestamp("updated_at").defaultNow(),
});
