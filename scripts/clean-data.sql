-- Clean tất cả dữ liệu TRỪ sources.
-- Chạy: psql $DATABASE_URL -f scripts/clean-data.sql
-- Hoặc: npm run db:clean

BEGIN;

-- Thứ tự xóa theo FK: posts → drafts → story_clusters → articles → ingest_runs
DELETE FROM posts;
DELETE FROM drafts;
DELETE FROM story_clusters;
DELETE FROM articles;
DELETE FROM ingest_runs;

COMMIT;
