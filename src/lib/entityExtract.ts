/**
 * Trích entities (đội, giải) từ tiêu đề tiếng Việt - fallback khi RSS không có
 */
const TEAM_PATTERNS: RegExp[] = [
  /\b(?:mu|manchester united|man united)\b/gi,
  /\b(?:chelsea|man city|manchester city|arsenal|liverpool|tottenham|man utd)\b/gi,
  /\b(?:real madrid|barca|barcelona|atletico|bayern|psg|juve|juventus|inter|ac milan|roma)\b/gi,
  /\b(?:việt nam|viet nam|đtvn|đt vn|tuyển việt nam|tuyển vn)\b/gi,
  /\b(?:thái lan|indonesia|malaysia|philippines|singapore|myanmar|campuchia)\b/gi,
  /\b(?:hà nội|hanoi fc|bình dương|đồng tháp|thanh hóa|hải phòng|hồng lĩnh hà tĩnh)\b/gi,
  /\b(?:slna|sông lam|hagel|hanói)\b/gi,
  /\b(?:aff cup|world cup|euro|champions league|v-league|v league|premier league|la liga|serie a|bundesliga|ligue 1)\b/gi,
];

const COMPETITION_PATTERNS: RegExp[] = [
  /\b(aff cup|world cup|euro|asian cup|sea games)\b/gi,
  /\b(v-?league|v league|hạng nhất|hạng nhì)\b/gi,
  /\b(premier league|ngoại hạng anh|la liga|serie a|bundesliga|ligue 1)\b/gi,
  /\b(champions league|c1|c2|europa league)\b/gi,
];

/** Cầu thủ Việt Nam & quốc tế thường xuất hiện trên báo thể thao */
const PLAYER_PATTERNS: RegExp[] = [
  /\b(?:nguyễn tiến linh|tiến linh)\b/gi,
  /\b(?:nguyễn quang hải|quang hải)\b/gi,
  /\b(?:đặng văn lâm|văn lâm)\b/gi,
  /\b(?:bùi tấn trường|tấn trường)\b/gi,
  /\b(?:đoàn văn hậu|văn hậu)\b/gi,
  /\b(?:nguyễn công phượng|công phượng)\b/gi,
  /\b(?:phạm đức huy|đức huy)\b/gi,
  /\b(?:nguyễn văn toàn|văn toàn)\b/gi,
  /\b(?:trần minh vương|minh vương)\b/gi,
  /\b(?:nguyễn hoàng đức|hoàng đức)\b/gi,
  /\b(?:võ minh trọng|minh trọng)\b/gi,
  /\b(?:khuất văn khang|văn khang)\b/gi,
  /\b(?:phạm xuân mạnh|xuân mạnh)\b/gi,
  /\b(?:hà đức chinh|đức chinh)\b/gi,
  /\b(?:lương xuân trường|xuân trường)\b/gi,
  /\b(?:theerathon|chanathip|songkrasin)\b/gi, // Thai stars
  /\b(?:messi|ronaldo|cristiano|neymar|mbappé|mbappe|haaland|salah|kane|bellingham)\b/gi,
];

/** Trích tỷ số X-Y từ title (vd: 2-1, 3-0) — dùng để tránh gom nhầm kết quả trận */
const SCORE_PATTERN = /(\d+)\s*-\s*(\d+)/;

export function extractMatchScore(title: string): string | null {
  const m = title.match(SCORE_PATTERN);
  return m ? `${m[1]}-${m[2]}` : null;
}

export function extractEntitiesFromTitle(title: string): {
  teams: string[];
  players: string[];
  competition: string | null;
} {
  const lower = title.toLowerCase();
  const teams = new Set<string>();
  const players = new Set<string>();
  let competition: string | null = null;

  for (const re of TEAM_PATTERNS) {
    const m = lower.match(re);
    if (m) {
      for (const t of m) {
        const n = t.toLowerCase().replace(/\s+/g, " ").trim();
        if (n.length >= 2) teams.add(n);
      }
    }
  }

  for (const re of PLAYER_PATTERNS) {
    const m = lower.match(re);
    if (m) {
      for (const p of m) {
        const n = p.toLowerCase().replace(/\s+/g, " ").trim();
        if (n.length >= 2) players.add(n);
      }
    }
  }

  for (const re of COMPETITION_PATTERNS) {
    const m = lower.match(re);
    if (m && !competition) competition = m[0].toLowerCase().trim();
  }

  return { teams: [...teams], players: [...players], competition };
}
