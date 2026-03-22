CREATE TABLE "writer_history" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"draft_id" text,
	"cluster_id" text,
	"instruction" text,
	"steps" jsonb NOT NULL,
	"result" jsonb,
	"error" text,
	"created_at" timestamp DEFAULT now()
);