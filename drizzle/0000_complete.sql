CREATE TABLE IF NOT EXISTS "sources" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"tier" integer NOT NULL,
	"url" text,
	"rate_limit_minutes" integer DEFAULT 15,
	"enabled" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "articles" (
	"id" text PRIMARY KEY NOT NULL,
	"source_id" text,
	"source" text NOT NULL,
	"source_tier" integer NOT NULL,
	"url" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"published_at" timestamp NOT NULL,
	"language" text DEFAULT 'vi',
	"teams" jsonb,
	"players" jsonb,
	"competition" text,
	"content_type" text NOT NULL,
	"raw_payload" jsonb,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "articles_url_unique" UNIQUE("url")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "topics" (
	"id" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "topic_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"topic_id" text NOT NULL,
	"rule_type" text NOT NULL,
	"rule_value" jsonb NOT NULL,
	"priority" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cluster_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"topic_ids" jsonb NOT NULL,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "story_clusters" (
	"id" text PRIMARY KEY NOT NULL,
	"hash_key" text NOT NULL,
	"article_ids" jsonb NOT NULL,
	"canonical_article_id" text NOT NULL,
	"score" integer DEFAULT 0,
	"topic" text,
	"enriched_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "story_clusters_hash_key_unique" UNIQUE("hash_key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "drafts" (
	"id" text PRIMARY KEY NOT NULL,
	"story_cluster_id" text,
	"headline" text NOT NULL,
	"summary" text NOT NULL,
	"content" text NOT NULL,
	"confidence_score" integer,
	"source_list" jsonb,
	"teams" jsonb,
	"players" jsonb,
	"format" text NOT NULL,
	"publish_priority" text DEFAULT 'medium',
	"status" text DEFAULT 'pending',
	"variants" jsonb,
	"cta_comment" text,
	"recommended_image_query" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ingest_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"status" text NOT NULL,
	"triggered_by" text DEFAULT 'manual',
	"articles_fetched" integer DEFAULT 0,
	"clusters_created" integer DEFAULT 0,
	"error" text,
	"steps" jsonb,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"finished_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "posts" (
	"id" text PRIMARY KEY NOT NULL,
	"draft_id" text,
	"platform" text NOT NULL,
	"external_id" text,
	"published_at" timestamp,
	"status" text DEFAULT 'pending',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "articles" ADD CONSTRAINT "articles_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "topic_rules" ADD CONSTRAINT "topic_rules_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "drafts" ADD CONSTRAINT "drafts_story_cluster_id_story_clusters_id_fk" FOREIGN KEY ("story_cluster_id") REFERENCES "public"."story_clusters"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "posts" ADD CONSTRAINT "posts_draft_id_drafts_id_fk" FOREIGN KEY ("draft_id") REFERENCES "public"."drafts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "story_clusters" ADD CONSTRAINT "story_clusters_canonical_article_id_articles_id_fk" FOREIGN KEY ("canonical_article_id") REFERENCES "public"."articles"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
