/**
 * Khởi tạo DB đầy đủ: schema + seed (chủ đề, quy tắc, nhóm chủ đề, nguồn tin).
 * Chạy: npm run db:init
 *
 * Yêu cầu: DATABASE_URL trong .env
 */
import "dotenv/config";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import {
  runTopicsAndRules,
  runClusterCategories,
  runSources,
  runGptWriterConfig,
  runScoreConfig,
} from "./seed/run.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function waitForDb(pool: pg.Pool, maxAttempts = 30): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await pool.query("SELECT 1");
      return;
    } catch {
      if (i === maxAttempts - 1) throw new Error("Không thể kết nối DB");
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

async function runMigration(pool: pg.Pool): Promise<void> {
  // 1. Schema gốc
  const sqlPath = join(__dirname, "../drizzle/0000_complete.sql");
  const sql = readFileSync(sqlPath, "utf-8");
  const statements = sql.split(/\s*-->\s*statement-breakpoint\s*/).filter(Boolean);
  for (const stmt of statements) {
    const s = stmt.trim();
    if (s) await pool.query(s);
  }
  // 2. Các migration bổ sung
  for (const name of [
    "0001_watery_valkyrie",
    "0002_married_zzzax",
    "0003_topic_to_topic_ids",
  ]) {
    const p = join(__dirname, "../drizzle", `${name}.sql`);
    try {
      const m = readFileSync(p, "utf-8");
      const stmts = m.split(/\s*-->\s*statement-breakpoint\s*/).filter(Boolean);
      for (const stmt of stmts) {
        const s = stmt.trim();
        if (s) await pool.query(s);
      }
    } catch {
      // bỏ qua nếu file không tồn tại
    }
  }
  // 3. Bảng gpt_writer_config (chưa có migration riêng)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "gpt_writer_config" (
      "id" text PRIMARY KEY NOT NULL DEFAULT 'default',
      "model" text NOT NULL DEFAULT 'gpt-4o-mini',
      "temperature" text DEFAULT '0.7',
      "base_prompt_rewrite" text,
      "base_prompt_content_writer" text,
      "updated_at" timestamp DEFAULT now()
    )
  `);
  // 4. Bảng score_config (công thức tính điểm cluster)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "score_config" (
      "id" text PRIMARY KEY NOT NULL DEFAULT 'default',
      "payload" jsonb NOT NULL DEFAULT '{}',
      "updated_at" timestamp DEFAULT now()
    )
  `);
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("[ERROR] DATABASE_URL chưa có trong .env");
    process.exit(1);
  }

  console.log("=== Khởi tạo DB ===\n");

  const pool = new pg.Pool({ connectionString: url });
  try {
    await waitForDb(pool);
  } catch {
    console.error("[ERROR] Không thể kết nối DB. Kiểm tra DATABASE_URL và đảm bảo Postgres đã chạy.");
    process.exit(1);
  }

  console.log("1. Tạo schema...");
  await runMigration(pool);
  await pool.end();
  console.log("   OK");

  console.log("2. Seed chủ đề & quy tắc...");
  await runTopicsAndRules();
  console.log("   OK");

  console.log("3. Seed nhóm chủ đề...");
  await runClusterCategories();
  console.log("   OK");

  console.log("4. Seed nguồn tin...");
  await runSources();
  console.log("   OK");

  console.log("5. Seed cấu hình GPT viết bài...");
  await runGptWriterConfig();
  console.log("   OK");

  console.log("6. Seed cấu hình công thức điểm...");
  await runScoreConfig();
  console.log("   OK");

  console.log("\n=== Xong. DB đã sẵn sàng. ===\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
