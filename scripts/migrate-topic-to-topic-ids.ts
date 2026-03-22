/**
 * Migration: story_clusters.topic (text) → topic_ids (jsonb array)
 * Chạy TRƯỚC khi chạy db:backfill-topics.
 *
 * Usage: npm run db:migrate-topics
 */
import "dotenv/config";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("[ERROR] DATABASE_URL chưa có trong .env");
    process.exit(1);
  }

  const pool = new pg.Pool({ connectionString: url });

  try {
    // Kiểm tra đã migrate chưa
    const colCheck = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'story_clusters' AND column_name IN ('topic', 'topic_ids')
    `);
    const cols = colCheck.rows.map((r: { column_name: string }) => r.column_name);
    if (cols.includes("topic_ids") && !cols.includes("topic")) {
      console.log("[OK] Đã migrate topic → topic_ids rồi. Không cần làm gì.");
      await pool.end();
      return;
    }
    if (!cols.includes("topic") && !cols.includes("topic_ids")) {
      console.log("[OK] Bảng story_clusters chưa có topic/topic_ids (có thể mới tạo). Thoát.");
      await pool.end();
      return;
    }

    const sqlPath = join(__dirname, "../drizzle/0003_topic_to_topic_ids.sql");
    const sql = readFileSync(sqlPath, "utf-8");
    const statements = sql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s && !s.startsWith("--"));

    console.log("[Migrate] topic → topic_ids...");
    for (const stmt of statements) {
      if (stmt) await pool.query(stmt);
    }
    console.log("[OK] Migration xong.");
  } catch (e) {
    console.error("[ERROR]", e);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
