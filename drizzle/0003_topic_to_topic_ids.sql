-- Migrate story_clusters.topic (text) -> topic_ids (jsonb array)
ALTER TABLE "story_clusters" ADD COLUMN IF NOT EXISTS "topic_ids" jsonb;

-- Backfill: topic -> [topic], null/empty -> ['other']
UPDATE "story_clusters"
SET "topic_ids" = CASE
  WHEN "topic" IS NOT NULL AND "topic" != '' THEN jsonb_build_array("topic")
  ELSE '["other"]'::jsonb
END
WHERE "topic_ids" IS NULL;

-- Default for new rows
UPDATE "story_clusters" SET "topic_ids" = '["other"]'::jsonb WHERE "topic_ids" IS NULL;

-- Drop old column
ALTER TABLE "story_clusters" DROP COLUMN IF EXISTS "topic";
