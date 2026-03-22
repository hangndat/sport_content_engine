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
  /\b(?:công an hà nội|cahn|lpbank hagl|hagl|hoàng anh gia lai|đông á thanh hóa|thép xanh nam định)\b/gi,
  /\b(?:slna|sông lam|hagel|hanói|viettel|nam định|nam dinh|becamex|quảng nam|quang nam|bình định|binh dinh)\b/gi,
  /\b(?:đà nẵng|da nang|shb đà nẵng|hồ chí minh|hcm fc|ho chi minh|nghệ an|sông lam nghệ an)\b/gi,
];

const COMPETITION_PATTERNS: RegExp[] = [
  /\b(aff cup|aff|world cup|euro|asian cup|sea games)\b/gi,
  /\b(v-?league|v\.?league|v league|vleague|hạng nhất|hạng nhì)\b/gi,
  /\b(premier league|ngoại hạng anh|ngoại hạng|la liga|serie a|bundesliga|ligue 1)\b/gi,
  /\b(champions league|cúp c1|c1|europa league|cúp c2|c2|conference league|c3)\b/gi,
  /\b(cúp quốc gia|afc champions|acl|asian champions)\b/gi,
];

/** Cầu thủ Việt Nam & quốc tế thường xuất hiện trên báo thể thao */
const PLAYER_PATTERNS: RegExp[] = [
  // ĐT Việt Nam — thế hệ vàng, thế hệ mới
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
  /\b(?:nguyễn xuân sơn|xuân son)\b/gi,
  /\b(?:hà đức chinh|đức chinh)\b/gi,
  /\b(?:lương xuân trường|xuân trường)\b/gi,
  /\b(?:bùi tiến dũng|tiến dũng)\b/gi,
  /\b(?:phan văn đức|văn đức)\b/gi,
  /\b(?:vũ văn thanh|văn thanh)\b/gi,
  /\b(?:nguyễn hồng duy|hồng duy)\b/gi,
  /\b(?:đỗ hùng dũng|hùng dũng)\b/gi,
  /\b(?:quế ngọc hải|ngọc hải)\b/gi,
  /\b(?:trương văn thái|văn thái)\b/gi,
  /\b(?:nguyễn văn tùng|văn tùng)\b/gi,
  /\b(?:phạm tuấn hải|tuấn hải)\b/gi,
  // ASEAN
  /\b(?:theerathon|chanathip|songkrasin|suphanat|eakkanit)\b/gi,
  /\b(?:asnawi|witan|dimas|marcus|pratama)\b/gi,
  /\b(?:safawi|faiz|syahmi|darren|liridon)\b/gi,
  // Ngoại hạng Anh
  /\b(?:messi|ronaldo|cristiano|neymar|mbappé|mbappe|haaland|salah|kane|bellingham)\b/gi,
  /\b(?:saka|rashford|foden|rice|martinelli|odegaard|van persie|garnacho)\b/gi,
  /\b(?:bernardo|rodri|grealish|alvarez|phil foden)\b/gi,
  /\b(?:palmer|cole palmer|enzo|caicedo|cucurella)\b/gi,
  /\b(?:van dijk|konate|szoboszlai|nunez|gakpo|endō)\b/gi,
  /\b(?:son heung-min|heung-min son|richarlison|maddison|van de ven)\b/gi,
  /\b(?:mainoo|mctominay|bruno fernandes|casemiro|mount)\b/gi,
  // La Liga
  /\b(?:modric|vinicius|vini jr|vinícius|rodrygo|bellingham)\b/gi,
  /\b(?:ancelotti|xavi|laporta|pedri|gavi|lewandowski)\b/gi,
  /\b(?:kroos|valverde|camavinga|rudiger)\b/gi,
  // Serie A
  /\b(?:lautaro|osimhen|leão|dybala|tevez|barella)\b/gi,
  /\b(?:chiesa|vlahovic|pulisic|loftus-cheek)\b/gi,
  /\b(?:kvaratskhelia|kvara|insigne)\b/gi,
  // Bundesliga
  /\b(?:neuer|müller|muller|kimmich|musiala|wirtz)\b/gi,
  /\b(?:kane|coman|sane|de ligt|upamecano)\b/gi,
  /\b(?:xabi alonso|alonso)\b/gi,
  // Ligue 1
  /\b(?:mbappé|mbappe|neymar|dembélé|dembele)\b/gi,
  /\b(?:hakimi|verratti|marquinhos|ramos)\b/gi,
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
