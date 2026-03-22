/**
 * Backfill topicIds cho clusters: union topic từ TẤT CẢ bài trong cluster.
 * Tự chạy migration topic → topic_ids nếu chưa có cột topic_ids.
 *
 * Usage: npm run db:backfill-topics
 *   --only-other: chỉ xử lý cluster có topic ["other"] hoặc rỗng
 */
import "dotenv/config";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { eq, inArray } from "drizzle-orm";
import { db, pool, storyClusters, articles } from "../src/db/index.js";
import { inferTopics } from "../src/services/TopicService.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function ensureMigration(): Promise<void> {
  const colCheck = await pool.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'story_clusters' AND column_name IN ('topic', 'topic_ids')
  `);
  const cols = colCheck.rows.map((r: { column_name: string }) => r.column_name);
  if (cols.includes("topic_ids")) return;
  if (!cols.includes("topic")) return; // bảng mới

  console.log("[Migrate] topic → topic_ids...");
  const sqlPath = join(__dirname, "../drizzle/0003_topic_to_topic_ids.sql");
  const content = readFileSync(sqlPath, "utf-8");
  const stmts = content
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  for (const stmt of stmts) {
    try {
      await pool.query(stmt + ";");
    } catch (e) {
      console.error("[Migration] Lỗi:", stmt.slice(0, 80) + "...", e);
      throw e;
    }
  }
  // Xác nhận cột đã có
  const verify = await pool.query(`
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'story_clusters' AND column_name = 'topic_ids'
  `);
  if (verify.rows.length === 0) {
    throw new Error("Migration chạy nhưng topic_ids vẫn chưa tồn tại. Kiểm tra DB.");
  }
  console.log("[OK] Migration xong.");
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("[ERROR] DATABASE_URL chưa có trong .env");
    process.exit(1);
  }

  await ensureMigration();

  const onlyOther = process.argv.includes("--only-other");

  const rows = await db
    .select({ id: storyClusters.id, articleIds: storyClusters.articleIds, topicIds: storyClusters.topicIds })
    .from(storyClusters);

  const toProcess = onlyOther
    ? rows.filter((r) => {
        const ids = (r.topicIds ?? []) as string[];
        return ids.length === 0 || (ids.length === 1 && ids[0] === "other");
      })
    : rows;

  const total = toProcess.length;
  if (total === 0) {
    console.log("[OK] Không có cluster nào cần xử lý.");
    return;
  }

  console.log(`[Backfill] Re-infer topic cho ${total} clusters (union từ tất cả bài)...`);

  let updated = 0;
  for (const row of toProcess) {
    const articleIds = (row.articleIds ?? []) as string[];
    if (articleIds.length === 0) continue;

    const arts = await db.select().from(articles).where(inArray(articles.id, articleIds));
    if (arts.length === 0) continue;

    const allTopicIds = new Set<string>();
    for (const art of arts) {
      const tops = await inferTopics(art);
      for (const t of tops) allTopicIds.add(t);
    }
    const topicIds = allTopicIds.size > 0 ? [...allTopicIds] : ["other"];
    const newIds = topicIds.filter((t) => t !== "other");
    const finalIds = newIds.length > 0 ? newIds : ["other"];
    const prevIds = (row.topicIds ?? []) as string[];
    const changed =
      prevIds.length !== finalIds.length ||
      !finalIds.every((t, i) => prevIds[i] === t);
    if (changed) {
      await db
        .update(storyClusters)
        .set({ topicIds: finalIds })
        .where(eq(storyClusters.id, row.id));
      updated++;
    }
  }

  console.log(`[OK] Đã cập nhật ${updated}/${total} clusters sang topic cụ thể.`);
}

main()
  .then(() => pool.end().then(() => process.exit(0)))
  .catch((e) => {
    console.error(e);
    pool.end().finally(() => process.exit(1));
  });
