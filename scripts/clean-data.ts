/**
 * Xóa tất cả dữ liệu TRỪ sources.
 *
 * Usage: npm run db:clean
 */
import "dotenv/config";
import { db } from "../src/db/index.js";
import { posts, drafts, storyClusters, articles, ingestRuns } from "../src/db/index.js";

async function main() {
  const resultPosts = await db.delete(posts);
  const resultDrafts = await db.delete(drafts);
  const resultClusters = await db.delete(storyClusters);
  const resultArticles = await db.delete(articles);
  const resultRuns = await db.delete(ingestRuns);

  console.log("[OK] Đã xóa:", {
    posts: resultPosts.rowCount ?? 0,
    drafts: resultDrafts.rowCount ?? 0,
    story_clusters: resultClusters.rowCount ?? 0,
    articles: resultArticles.rowCount ?? 0,
    ingest_runs: resultRuns.rowCount ?? 0,
  });
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
