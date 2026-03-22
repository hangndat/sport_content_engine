/**
 * Debug tại sao một cluster có topic nào đó.
 * Usage: npx tsx scripts/debug-cluster-topics.ts <clusterId>
 *   Ví dụ: npx tsx scripts/debug-cluster-topics.ts cluster-fuzzy-9edfec56261502a2d29e518c
 */
import "dotenv/config";
import { eq, inArray } from "drizzle-orm";
import { db, pool, storyClusters, articles } from "../src/db/index.js";
import { inferTopics } from "../src/services/TopicService.js";

const clusterId = process.argv[2];
if (!clusterId) {
  console.error("Usage: npx tsx scripts/debug-cluster-topics.ts <clusterId>");
  process.exit(1);
}

const NHA_TRIGGERS = {
  competition: /ngoại hạng|premier\s*league|premier|nha|english premier|cup liên đoàn/i,
  teams: ["arsenal", "chelsea", "man city", "liverpool", "tottenham", "man utd", "mu", "west ham", "everton", "newcastle", "brighton", "aston villa", "haaland", "salah", "saka", "mainoo", "kane"],
  title: /(arsenal|chelsea|liverpool|manchester city|man city|tottenham|spurs|man utd|mu|west ham|everton|newcastle|brighton|mainoo|saka|haaland|rashford|foden|rice|salah|kane|son heung-min|heung-min son|ngoại hạng anh|premier league|bóng đá anh)/i,
};

function whyNha(art: { title?: string | null; teams?: string[] | null; competition?: string | null }): string[] {
  const reasons: string[] = [];
  const title = (art.title ?? "").toLowerCase();
  const competition = (art.competition ?? "").toLowerCase();
  const teams = (art.teams ?? []).map((t) => t.toLowerCase());

  if (NHA_TRIGGERS.competition.test(competition)) {
    reasons.push(`competition="${art.competition}" khớp regex NHA`);
  }
  const matchedTeam = NHA_TRIGGERS.teams.find((t) =>
    teams.some((x) => x.includes(t) || t.includes(x))
  );
  if (matchedTeam) reasons.push(`teams chứa "${matchedTeam}"`);
  if (NHA_TRIGGERS.title.test(title)) {
    const m = title.match(NHA_TRIGGERS.title);
    reasons.push(`title có từ "${m?.[1] ?? "khớp"}"`);
  }
  return reasons;
}

async function main() {
  const [cluster] = await db
    .select()
    .from(storyClusters)
    .where(eq(storyClusters.id, clusterId));

  if (!cluster) {
    console.error("Không tìm thấy cluster:", clusterId);
    process.exit(1);
  }

  const articleIds = (cluster.articleIds ?? []) as string[];
  if (articleIds.length === 0) {
    console.log("Cluster không có bài nào.");
    return;
  }

  const arts = await db
    .select()
    .from(articles)
    .where(inArray(articles.id, articleIds));

  console.log("\n=== Cluster:", cluster.id);
  console.log("TopicIds hiện tại:", cluster.topicIds);
  console.log("\n--- Các bài trong cluster ---\n");

  for (const art of arts) {
    const topics = await inferTopics(art);
    const nhaReasons = whyNha(art);
    console.log(`[${art.source}] ${art.title}`);
    console.log(`  teams: ${JSON.stringify(art.teams)}`);
    console.log(`  competition: ${art.competition ?? "(trống)"}`);
    console.log(`  → inferred: ${topics.join(", ")}`);
    if (topics.includes("nha") && nhaReasons.length > 0) {
      console.log(`  → Lý do có NHA: ${nhaReasons.join("; ")}`);
    }
    console.log("");
  }

  console.log("(TopicIds cluster = union từ tất cả bài trên)");
}

main()
  .then(() => pool.end().then(() => process.exit(0)))
  .catch((e) => {
    console.error(e);
    pool.end().finally(() => process.exit(1));
  });
