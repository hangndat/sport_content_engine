/**
 * @deprecated Dùng TopicService + DB (topics, topic_rules) thay thế.
 * File này chỉ giữ để tham khảo logic cũ cho seed script.
 */
export type Topic =
  | "vleague"
  | "nha"
  | "c1"
  | "c2"
  | "laliga"
  | "seriea"
  | "bundesliga"
  | "ligue1"
  | "asian_cup"
  | "aff"
  | "worldcup"
  | "euro"
  | "caf"
  | "sea_games"
  | "dtvn"
  | "transfer"
  | "schedule"
  | "match_result"
  | "other";

export interface ArticleForTopic {
  title?: string | null;
  teams?: string[] | null;
  competition?: string | null;
  contentType?: string | null;
}

const DT_VIETNAM_KEYWORDS = [
  "việt nam",
  "viet nam",
  "đtvn",
  "đt vn",
  "tuyển việt nam",
  "tuyển vn",
  "u23 việt nam",
  "u23 viet nam",
];

function hasTeamVietnam(teams: string[] | null | undefined): boolean {
  if (!teams?.length) return false;
  const lower = teams.map((t) => t.toLowerCase().trim());
  return lower.some((t) =>
    DT_VIETNAM_KEYWORDS.some((kw) => t.includes(kw) || kw.includes(t))
  );
}

function hasTitleVietnam(title: string | null | undefined): boolean {
  const t = (title ?? "").toLowerCase();
  return (
    /tiến linh|quang hải|văn lâm|văn hậu|công phượng|đức huy|hoàng đức|đức chinh/i.test(t) ||
    /đt\s*việt nam|tuyển\s*việt nam|tuyển\s*vn|u23\s*việt nam/i.test(t)
  );
}

const NHA_TEAMS = new Set([
  "arsenal", "chelsea", "man city", "manchester city", "liverpool", "tottenham",
  "man utd", "mu", "manchester united", "man united", "west ham", "aston villa",
  "newcastle", "brighton", "bournemouth", "everton", "wolves", "nottingham",
]);
const LALIGA_TEAMS = new Set(["real madrid", "barca", "barcelona", "atletico", "atletico madrid"]);
const SERIEA_TEAMS = new Set(["juve", "juventus", "inter", "ac milan", "roma", "napoli", "lazio"]);
const BUNDESLIGA_TEAMS = new Set(["bayern", "bayern munich", "dortmund", "borussia dortmund"]);
const LIGUE1_TEAMS = new Set(["psg", "paris saint-germain", "marseille", "lyon", "monaco"]);

function inferFromTeams(teams: string[] | null | undefined): Topic | null {
  if (!teams?.length) return null;
  const lower = teams.map((t) => t.toLowerCase().trim());
  if (lower.some((t) => NHA_TEAMS.has(t))) return "nha";
  if (lower.some((t) => LALIGA_TEAMS.has(t))) return "laliga";
  if (lower.some((t) => SERIEA_TEAMS.has(t))) return "seriea";
  if (lower.some((t) => BUNDESLIGA_TEAMS.has(t))) return "bundesliga";
  if (lower.some((t) => LIGUE1_TEAMS.has(t))) return "ligue1";
  return null;
}

/** Suy luận từ title khi teams/competition trống — club name, khu vực, HLV */
function inferFromTitle(title: string | null | undefined): Topic | null {
  const t = (title ?? "").toLowerCase();

  // ASEAN / AFF / SEA Games
  if (/\b(asean|aff)\s*(cup|)?/i.test(t) || /fifa\s*asean/i.test(t)) return "aff";
  if (/sea\s*games|seagames/i.test(t)) return "sea_games";

  // Asian Cup / châu Á
  if (/châu\s*á|asian\s*cup|asiacup|vô địch châu á/i.test(t)) return "asian_cup";

  // Châu Phi (CAF)
  if (/châu\s*phi|vô địch châu phi|caf|africa/i.test(t)) return "caf";

  // Italy / Serie A
  if (/bóng đá\s*italy|serie\s*a|calcio\s*italia|\bit Italy\b/i.test(t)) return "seriea";

  // NHA - club names trong title
  if (/\b(arsenal|chelsea|liverpool|manchester city|man city|tottenham|man utd|mu|manchester united|man united|west ham|everton|newcastle|brighton|aston villa)\b/i.test(t)) return "nha";

  // La Liga
  if (/\b(real madrid|barcelona|barca|atletico)\b/i.test(t)) return "laliga";

  // Bundesliga
  if (/\b(bayern|dortmund|borussia)\b/i.test(t)) return "bundesliga";

  // Serie A
  if (/\b(juventus|juve|inter\b|ac milan|roma|napoli|lazio)\b/i.test(t)) return "seriea";

  // Ligue 1
  if (/\b(psg|paris saint|marseille|lyon|monaco)\b/i.test(t)) return "ligue1";

  // Cầu thủ → league (gắn với CLB chính)
  if (/\b(mainoo|saka|haaland|van persie|rashford|foden|rice)\b/i.test(t)) return "nha";
  if (/\b(neuer|müller|muller|kimmich)\b/i.test(t)) return "bundesliga";
  if (/\b(neymar|mbappé|mbappe)\b/i.test(t)) return "ligue1";
  if (/\b(ancelotti|modric|vinicius|vini jr)\b/i.test(t)) return "laliga";
  if (/\b(tevez|dybala|lautaro)\b/i.test(t)) return "seriea";

  return null;
}

function titleMatches(title: string | null | undefined, patterns: RegExp[]): boolean {
  const t = (title ?? "").toLowerCase();
  return patterns.some((p) => p.test(t));
}

export function inferTopic(article: ArticleForTopic): Topic {
  const title = article.title ?? "";
  const competition = (article.competition ?? "").toLowerCase().replace(/\s+/g, " ");
  const contentType = (article.contentType ?? "").toLowerCase();
  const teams = article.teams ?? [];

  // Template / schedule
  if (titleMatches(title, [/^lịch\s+thi\s+đấu/i, /^kết\s+quả\s+bóng\s+đá\s+hôm\s+nay/i])) {
    return "schedule";
  }

  // Match result
  if (contentType === "result" || titleMatches(title, [/kết quả.*\d+\s*-\s*\d+/i, /thắng|thua|hòa/i])) {
    if (competition) {
      const c = competition.trim();
      if (/v-?league|v\s*league|hạng nhất/i.test(c)) return "vleague";
      if (/ngoại hạng|premier|nha/i.test(c)) return "nha";
      if (/champions|c1/i.test(c)) return "c1";
      if (/europa|c2/i.test(c)) return "c2";
      if (/asian\s*cup|asiacup/i.test(c)) return "asian_cup";
      if (/aff|asean/i.test(c)) return "aff";
      if (/world\s*cup|worldcup/i.test(c)) return "worldcup";
      if (/euro/i.test(c)) return "euro";
    }
    if (hasTeamVietnam(teams)) return "dtvn";
    return "match_result";
  }

  // Transfer
  if (titleMatches(title, [/chuyển nhượng/i, /ký hợp đồng/i, /bản hợp đồng/i])) {
    return "transfer";
  }

  // Competition-based
  if (/v-?league|v\s*league|hạng nhất|hạng nhì/i.test(competition)) return "vleague";
  if (/ngoại hạng|premier|nha|cup\s*liên đoàn/i.test(competition)) return "nha";
  if (/champions\s*league|c1/i.test(competition)) return "c1";
  if (/europa\s*league|c2/i.test(competition)) return "c2";
  if (/la\s*liga|la liga/i.test(competition)) return "laliga";
  if (/serie\s*a|seriea/i.test(competition)) return "seriea";
  if (/bundesliga/i.test(competition)) return "bundesliga";
  if (/ligue\s*1|ligue1/i.test(competition)) return "ligue1";
  if (/asian\s*cup|asiacup/i.test(competition)) return "asian_cup";
  if (/aff|asean/i.test(competition)) return "aff";
  if (/sea\s*games|seagames/i.test(competition)) return "sea_games";
  if (/châu\s*phi|vô địch châu phi|caf/i.test(competition)) return "caf";
  if (/world\s*cup|worldcup/i.test(competition)) return "worldcup";
  if (/euro(?!pa)/i.test(competition)) return "euro";

  // Team-based (khi không có competition rõ ràng)
  const fromTeams = inferFromTeams(teams);
  if (fromTeams) return fromTeams;

  // ĐT Việt Nam (teams-based hoặc title)
  if (hasTeamVietnam(teams)) return "dtvn";
  if (hasTitleVietnam(title)) return "dtvn";

  // Title-based (club/player/region) khi không có teams/competition
  const fromTitle = inferFromTitle(title);
  if (fromTitle) return fromTitle;

  return "other";
}

export const TOPIC_LABELS: Record<Topic, string> = {
  vleague: "V-League",
  nha: "Ngoại hạng Anh",
  c1: "Champions League",
  c2: "Europa League",
  laliga: "La Liga",
  seriea: "Serie A",
  bundesliga: "Bundesliga",
  ligue1: "Ligue 1",
  asian_cup: "Asian Cup",
  aff: "AFF / ASEAN",
  worldcup: "World Cup",
  euro: "Euro",
  caf: "Châu Phi",
  sea_games: "SEA Games",
  dtvn: "ĐT Việt Nam",
  transfer: "Chuyển nhượng",
  schedule: "Lịch / Kết quả",
  match_result: "Kết quả trận",
  other: "Khác",
};
