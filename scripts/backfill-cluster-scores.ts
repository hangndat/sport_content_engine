/**
 * Backfill score cho tất cả cluster hiện có theo công thức viral mới.
 * Chạy sau khi cập nhật RankingService với viral bonuses.
 *
 * Usage: npm run db:backfill-scores
 */
import "dotenv/config";
import { db, storyClusters } from "../src/db/index.js";
import { RankingService } from "../src/services/RankingService.js";

async function main() {
  const ranking = new RankingService();
  const rows = await db.select({ id: storyClusters.id }).from(storyClusters);
  const total = rows.length;

  if (total === 0) {
    console.log("[OK] Không có cluster nào để backfill.");
    return;
  }

  console.log(`[Backfill] Re-score ${total} clusters với công thức viral...`);

  let done = 0;
  let errCount = 0;
  for (const { id } of rows) {
    try {
      await ranking.scoreCluster(id);
      done++;
      if (done % 100 === 0 || done === total) {
        console.log(`  ${done}/${total}`);
      }
    } catch (e) {
      errCount++;
      console.error(`  [ERR] cluster ${id}:`, e instanceof Error ? e.message : e);
    }
  }

  console.log(`[OK] Đã re-score ${done}/${total} clusters. Lỗi: ${errCount}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
