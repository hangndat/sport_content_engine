/**
 * Chạy seed (chủ đề, quy tắc, nhóm chủ đề, nguồn tin, cấu hình).
 * Chạy: npm run db:seed
 *
 * Yêu cầu: DATABASE_URL trong .env
 */
import "dotenv/config";
import {
  runTopicsAndRules,
  runClusterCategories,
  runSources,
  runGptWriterConfig,
  runScoreConfig,
} from "./seed/run.js";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("[ERROR] DATABASE_URL chưa có trong .env");
    process.exit(1);
  }

  console.log("=== Seed DB ===\n");

  console.log("1. Seed chủ đề & quy tắc...");
  await runTopicsAndRules();
  console.log("   OK");

  console.log("2. Seed nhóm chủ đề...");
  await runClusterCategories();
  console.log("   OK");

  console.log("3. Seed nguồn tin...");
  await runSources();
  console.log("   OK");

  console.log("4. Seed cấu hình GPT viết bài...");
  await runGptWriterConfig();
  console.log("   OK");

  console.log("5. Seed cấu hình công thức điểm...");
  await runScoreConfig();
  console.log("   OK");

  console.log("\n=== Xong. ===\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
