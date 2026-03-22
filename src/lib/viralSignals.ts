/**
 * Viral signals cho cluster scoring – angle đúng nội dung dễ viral.
 * Dùng trong RankingService và AngleSelector.
 */

/** Đội/CLB hot – tên viết thường để so khớp */
const HOT_TEAMS = new Set([
  "mu",
  "manchester united",
  "man city",
  "manchester city",
  "chelsea",
  "arsenal",
  "liverpool",
  "tottenham",
  "real madrid",
  "barca",
  "barcelona",
  "atletico",
  "bayern",
  "psg",
  "juve",
  "juventus",
  "inter",
  "ac milan",
  "roma",
  "việt nam",
  "viet nam",
  "đtvn",
  "tuyển việt nam",
  "tuyển vn",
  "hà nội",
  "hanoi fc",
  "bình dương",
]);

/** Cầu thủ hot – tên viết thường */
const HOT_PLAYERS = new Set([
  "messi",
  "ronaldo",
  "cristiano",
  "neymar",
  "mbappé",
  "mbappe",
  "haaland",
  "salah",
  "kane",
  "bellingham",
  "nguyễn tiến linh",
  "tiến linh",
  "nguyễn quang hải",
  "quang hải",
  "đặng văn lâm",
  "văn lâm",
  "bùi tấn trường",
  "tấn trường",
  "đoàn văn hậu",
  "văn hậu",
  "nguyễn công phượng",
  "công phượng",
  "theerathon",
  "chanathip",
]);

/** Giải đấu hot – pattern bắt đầu (lowercase) */
const HOT_COMPETITIONS = [
  "v-league",
  "v league",
  "champions league",
  "c1",
  "europa",
  "c2",
  "premier league",
  "ngoại hạng",
  "la liga",
  "serie a",
  "bundesliga",
  "ligue 1",
  "aff",
  "world cup",
  "euro",
  "asian cup",
];

/** contentTypes dễ viral hơn news thuần – fallback khi không có config */
const DEFAULT_VIRAL_CONTENT_TYPES: Record<string, number> = {
  result: 2,
  rumor: 1,
  debate: 1,
  stats: 1,
  opinion: 1,
  news: 0,
  schedule: 0,
};

const DEFAULT_CROSS_SOURCE: Record<string, number> = { "2": 1, "3": 2, "4": 3 };

export interface ViralSignals {
  hotEntityBonus: number;
  competitionBonus: number;
  contentTypeBonus: number;
  crossSourceBonus: number;
  totalViralBonus: number;
}

function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

function isHotTeam(name: string): boolean {
  const n = normalizeForMatch(name);
  if (HOT_TEAMS.has(n)) return true;
  for (const t of HOT_TEAMS) {
    if (n.includes(t) || t.includes(n)) return true;
  }
  return false;
}

function isHotPlayer(name: string): boolean {
  const n = normalizeForMatch(name);
  if (HOT_PLAYERS.has(n)) return true;
  for (const p of HOT_PLAYERS) {
    if (n.includes(p) || p.includes(n)) return true;
  }
  return false;
}

function isHotCompetition(competition: string | null | undefined): boolean {
  if (!competition || !competition.trim()) return false;
  const c = normalizeForMatch(competition);
  return HOT_COMPETITIONS.some((h) => c.includes(h));
}

export type ViralConfig = {
  viralHotEntityMax?: number;
  viralCompetitionBonus?: number;
  viralContentTypeBonus?: Record<string, number>;
  viralCrossSourceBonus?: Record<string, number>;
};

/** Đếm hot entities (team + player), tối đa theo config */
export function countHotEntityBonus(
  teams: string[],
  players: string[],
  maxBonus = 3
): number {
  let count = 0;
  for (const t of teams ?? []) {
    if (t && isHotTeam(t)) count++;
  }
  for (const p of players ?? []) {
    if (p && isHotPlayer(p)) count++;
  }
  return Math.min(count, maxBonus);
}

export function getCompetitionBonus(
  competition: string | null | undefined,
  bonus = 2
): number {
  return isHotCompetition(competition) ? bonus : 0;
}

export function getContentTypeBonus(
  contentType: string | null | undefined,
  types: Record<string, number> = DEFAULT_VIRAL_CONTENT_TYPES
): number {
  return types[String(contentType ?? "news").toLowerCase()] ?? 0;
}

export function getCrossSourceBonus(
  distinctSourceCount: number,
  bonusMap: Record<string, number> = DEFAULT_CROSS_SOURCE
): number {
  if (distinctSourceCount >= 4) return bonusMap["4"] ?? 3;
  if (distinctSourceCount >= 3) return bonusMap["3"] ?? 2;
  if (distinctSourceCount >= 2) return bonusMap["2"] ?? 1;
  return 0;
}

/**
 * Tính tổng viral bonus từ cluster metadata.
 */
export function computeViralSignals(
  params: {
    teams: string[];
    players: string[];
    competition?: string | null;
    contentType?: string | null;
    distinctSourceCount: number;
  },
  config?: ViralConfig
): ViralSignals {
  const hotEntityBonus = countHotEntityBonus(
    params.teams,
    params.players,
    config?.viralHotEntityMax
  );
  const competitionBonus = getCompetitionBonus(
    params.competition,
    config?.viralCompetitionBonus
  );
  const contentTypeBonus = getContentTypeBonus(
    params.contentType,
    config?.viralContentTypeBonus
  );
  const crossSourceBonus = getCrossSourceBonus(
    params.distinctSourceCount,
    config?.viralCrossSourceBonus
  );
  const totalViralBonus =
    hotEntityBonus + competitionBonus + contentTypeBonus + crossSourceBonus;

  return {
    hotEntityBonus,
    competitionBonus,
    contentTypeBonus,
    crossSourceBonus,
    totalViralBonus,
  };
}

/**
 * Viral score ≥ threshold → nên chọn angle short_hot (dễ viral).
 */
export function isHighViralPotential(signals: ViralSignals, minBonus?: number): boolean {
  const threshold = minBonus ?? 3;
  return signals.totalViralBonus >= threshold;
}
