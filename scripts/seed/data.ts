/**
 * Dữ liệu seed — topics, rules, cluster_categories.
 */

export const TOPICS = [
  { id: "schedule", label: "Lịch / Kết quả", sortOrder: 1 },
  { id: "match_result", label: "Kết quả trận", sortOrder: 2 },
  { id: "vleague", label: "V-League", sortOrder: 3 },
  { id: "nha", label: "Ngoại hạng Anh", sortOrder: 4 },
  { id: "c1", label: "Champions League", sortOrder: 5 },
  { id: "c2", label: "Europa League", sortOrder: 6 },
  { id: "c3", label: "Conference League", sortOrder: 7 },
  { id: "laliga", label: "La Liga", sortOrder: 8 },
  { id: "seriea", label: "Serie A", sortOrder: 9 },
  { id: "bundesliga", label: "Bundesliga", sortOrder: 10 },
  { id: "ligue1", label: "Ligue 1", sortOrder: 11 },
  { id: "afc_champions", label: "AFC Champions League", sortOrder: 12 },
  { id: "asian_cup", label: "Asian Cup", sortOrder: 13 },
  { id: "aff", label: "AFF / ASEAN", sortOrder: 14 },
  { id: "sea_games", label: "SEA Games", sortOrder: 15 },
  { id: "u23_asia", label: "U23 Châu Á", sortOrder: 16 },
  { id: "worldcup", label: "World Cup", sortOrder: 17 },
  { id: "euro", label: "Euro", sortOrder: 18 },
  { id: "copa_america", label: "Copa America", sortOrder: 19 },
  { id: "nations_league", label: "Nations League", sortOrder: 20 },
  { id: "caf", label: "Châu Phi", sortOrder: 21 },
  { id: "olympic", label: "Olympic", sortOrder: 22 },
  { id: "dtvn", label: "ĐT Việt Nam", sortOrder: 23 },
  { id: "transfer", label: "Chuyển nhượng", sortOrder: 24 },
  { id: "other", label: "Khác", sortOrder: 99 },
];

type RuleRow = {
  topicId: string;
  ruleType: "competition_regex" | "teams_contains" | "title_regex" | "content_type";
  ruleValue: object;
  priority: number;
};

export const RULES: RuleRow[] = [
  { topicId: "schedule", ruleType: "title_regex", ruleValue: { pattern: "^lịch\\s+thi\\s+đấu" }, priority: 10 },
  { topicId: "schedule", ruleType: "title_regex", ruleValue: { pattern: "^lịch\\s+đấu" }, priority: 10 },
  { topicId: "schedule", ruleType: "title_regex", ruleValue: { pattern: "^kết\\s+quả\\s+bóng\\s+đá\\s+hôm\\s+nay" }, priority: 10 },
  { topicId: "schedule", ruleType: "title_regex", ruleValue: { pattern: "^bảng\\s+xếp\\s+hạng" }, priority: 10 },
  { topicId: "schedule", ruleType: "title_regex", ruleValue: { pattern: "^bảng\\s+điểm" }, priority: 10 },
  { topicId: "schedule", ruleType: "title_regex", ruleValue: { pattern: "lịch\\s+đấu\\s+hôm\\s+nay" }, priority: 10 },
  { topicId: "schedule", ruleType: "title_regex", ruleValue: { pattern: "các\\s+trận\\s+đấu\\s+(hôm\\s+nay|ngày\\s+mai)" }, priority: 10 },
  { topicId: "transfer", ruleType: "title_regex", ruleValue: { pattern: "chuyển nhượng" }, priority: 20 },
  { topicId: "transfer", ruleType: "title_regex", ruleValue: { pattern: "ký hợp đồng" }, priority: 20 },
  { topicId: "transfer", ruleType: "title_regex", ruleValue: { pattern: "bản hợp đồng" }, priority: 20 },
  { topicId: "transfer", ruleType: "title_regex", ruleValue: { pattern: "gia hạn\\s+(hợp đồng)?" }, priority: 20 },
  { topicId: "transfer", ruleType: "title_regex", ruleValue: { pattern: "thanh lý hợp đồng" }, priority: 20 },
  { topicId: "transfer", ruleType: "title_regex", ruleValue: { pattern: "chia tay\\s+(clb|đội)" }, priority: 20 },
  { topicId: "transfer", ruleType: "title_regex", ruleValue: { pattern: "ra đi\\s+(khỏi|từ)" }, priority: 20 },
  { topicId: "transfer", ruleType: "title_regex", ruleValue: { pattern: "từ chối gia hạn" }, priority: 20 },
  { topicId: "transfer", ruleType: "title_regex", ruleValue: { pattern: "cho mượn|cho thuê" }, priority: 20 },
  { topicId: "transfer", ruleType: "title_regex", ruleValue: { pattern: "mua đứt|chiêu mộ" }, priority: 20 },
  { topicId: "match_result", ruleType: "content_type", ruleValue: { value: "result" }, priority: 30 },
  { topicId: "match_result", ruleType: "title_regex", ruleValue: { pattern: "kết quả\\s+.*\\d+\\s*[-–]\\s*\\d+" }, priority: 30 },
  { topicId: "match_result", ruleType: "title_regex", ruleValue: { pattern: "tỷ số\\s+.*\\d+\\s*[-–]\\s*\\d+" }, priority: 30 },
  { topicId: "match_result", ruleType: "title_regex", ruleValue: { pattern: "đánh bại|hạ gục|cầm hòa" }, priority: 30 },
  { topicId: "vleague", ruleType: "competition_regex", ruleValue: { pattern: "v-?league|v\\s*league|vleague\\s*1|hạng nhất|hạng nhì|v\\.league" }, priority: 100 },
  { topicId: "nha", ruleType: "competition_regex", ruleValue: { pattern: "ngoại hạng|premier\\s*league|premier|nha|english\\s*premier|cup\\s*liên đoàn" }, priority: 100 },
  { topicId: "c1", ruleType: "competition_regex", ruleValue: { pattern: "champions\\s*league|uefa\\s*cl|c1(?!\\d)" }, priority: 100 },
  { topicId: "c2", ruleType: "competition_regex", ruleValue: { pattern: "europa\\s*league|uefa\\s*el|c2(?!\\d)" }, priority: 100 },
  { topicId: "c3", ruleType: "competition_regex", ruleValue: { pattern: "conference\\s*league|europa\\s*conference|c3|uefa\\s*conference" }, priority: 100 },
  { topicId: "laliga", ruleType: "competition_regex", ruleValue: { pattern: "la\\s*liga|la\\s*ligua|laliga" }, priority: 100 },
  { topicId: "seriea", ruleType: "competition_regex", ruleValue: { pattern: "serie\\s*a|seriea|calcio" }, priority: 100 },
  { topicId: "bundesliga", ruleType: "competition_regex", ruleValue: { pattern: "bundesliga" }, priority: 100 },
  { topicId: "ligue1", ruleType: "competition_regex", ruleValue: { pattern: "ligue\\s*1|ligue1|ligue\\s*un" }, priority: 100 },
  { topicId: "afc_champions", ruleType: "competition_regex", ruleValue: { pattern: "afc\\s*champions|acl|asian\\s*champions" }, priority: 100 },
  { topicId: "asian_cup", ruleType: "competition_regex", ruleValue: { pattern: "asian\\s*cup|asiacup|asian\\s*cup\\s*qualifiers" }, priority: 100 },
  { topicId: "aff", ruleType: "competition_regex", ruleValue: { pattern: "aff\\s*cup|aff|asean|suzuki\\s*cup" }, priority: 100 },
  { topicId: "sea_games", ruleType: "competition_regex", ruleValue: { pattern: "sea\\s*games|seagames|đông nam á" }, priority: 100 },
  { topicId: "u23_asia", ruleType: "competition_regex", ruleValue: { pattern: "u23\\s*châu á|u23\\s*asian|u23\\s*afc|olympic\\s*qualifier" }, priority: 100 },
  { topicId: "worldcup", ruleType: "competition_regex", ruleValue: { pattern: "world\\s*cup|worldcup|wc\\s*qualifier" }, priority: 100 },
  { topicId: "euro", ruleType: "competition_regex", ruleValue: { pattern: "euro\\s*\\d{4}|uefa\\s*euro|\\beuro(?!pa)\\b" }, priority: 100 },
  { topicId: "copa_america", ruleType: "competition_regex", ruleValue: { pattern: "copa\\s*america|copa\\s*ám" }, priority: 100 },
  { topicId: "nations_league", ruleType: "competition_regex", ruleValue: { pattern: "nations\\s*league|uefa\\s*nations" }, priority: 100 },
  { topicId: "caf", ruleType: "competition_regex", ruleValue: { pattern: "châu\\s*phi|caf|africa\\s*cup|can\\s*cup" }, priority: 100 },
  { topicId: "olympic", ruleType: "competition_regex", ruleValue: { pattern: "olympic|olympic\\s*games|bóng đá\\s*olympic" }, priority: 100 },
  { topicId: "nha", ruleType: "teams_contains", ruleValue: { values: ["arsenal", "chelsea", "man city", "manchester city", "liverpool", "tottenham", "spurs", "man utd", "mu", "manchester united", "man united", "west ham", "aston villa", "villa", "newcastle", "brighton", "bournemouth", "everton", "wolves", "wolverhampton", "nottingham forest", "forest", "fulham", "brentford", "crystal palace", "palace", "ipswich", "southampton", "leicester"] }, priority: 200 },
  { topicId: "laliga", ruleType: "teams_contains", ruleValue: { values: ["real madrid", "barca", "barcelona", "atletico", "atletico madrid", "sevilla", "real sociedad", "villareal", "villarreal", "real betis", "athletic bilbao", "valencia", "girona", "getafe"] }, priority: 200 },
  { topicId: "seriea", ruleType: "teams_contains", ruleValue: { values: ["juve", "juventus", "inter", "inter milan", "ac milan", "milan", "roma", "napoli", "lazio", "atalanta", "fiorentina", "torino", "bologna", "sassuolo", "udinese", "monza"] }, priority: 200 },
  { topicId: "bundesliga", ruleType: "teams_contains", ruleValue: { values: ["bayern", "bayern munich", "dortmund", "borussia dortmund", "bvb", "leverkusen", "leipzig", "rb leipzig", "freiburg", "eintracht", "union berlin", "wolfsburg"] }, priority: 200 },
  { topicId: "ligue1", ruleType: "teams_contains", ruleValue: { values: ["psg", "paris saint-germain", "paris sg", "marseille", "lyon", "monaco", "lille", "rennes", "nice", "lens", "strasbourg", "montpellier"] }, priority: 200 },
  { topicId: "vleague", ruleType: "teams_contains", ruleValue: { values: ["hà nội", "ha noi", "hanoi fc", "thể công", "the cong", "viettel", "nam định", "nam dinh", "thép xanh", "thanh hóa", "thanh hoa", "đông á", "bình dương", "binh duong", "becamex", "hoàng anh gia lai", "hagl", "hà tĩnh", "công an hà nội", "công an hn", "hải phòng", "hai phong", "đà nẵng", "da nang", "shb", "quảng nam", "quang nam", "bình định", "binh dinh", "slna", "sông lam", "nghệ an", "hồ chí minh", "ho chi minh", "hcm fc"] }, priority: 200 },
  { topicId: "dtvn", ruleType: "teams_contains", ruleValue: { values: ["việt nam", "viet nam", "vn", "đtvn", "đt vn", "tuyển việt nam", "tuyển vn", "u23 việt nam", "u23 viet nam", "u23 vn", "u19 việt nam", "u17 việt nam"] }, priority: 200 },
  { topicId: "aff", ruleType: "title_regex", ruleValue: { pattern: "\\b(asean|aff)\\s*(cup|championship)?" }, priority: 300 },
  { topicId: "aff", ruleType: "title_regex", ruleValue: { pattern: "suzuki\\s*cup|fifa\\s*asean" }, priority: 300 },
  { topicId: "sea_games", ruleType: "title_regex", ruleValue: { pattern: "sea\\s*games|seagames|đông nam á" }, priority: 300 },
  { topicId: "asian_cup", ruleType: "title_regex", ruleValue: { pattern: "châu\\s*á|asian\\s*cup|asiacup|vô địch châu á" }, priority: 300 },
  { topicId: "u23_asia", ruleType: "title_regex", ruleValue: { pattern: "u23\\s*châu á|u23\\s*asian" }, priority: 300 },
  { topicId: "caf", ruleType: "title_regex", ruleValue: { pattern: "châu\\s*phi|vô địch châu phi|caf|africa" }, priority: 300 },
  { topicId: "seriea", ruleType: "title_regex", ruleValue: { pattern: "bóng đá\\s*italy|serie\\s*a|calcio\\s*italia" }, priority: 300 },
  { topicId: "nha", ruleType: "title_regex", ruleValue: { pattern: "\\b(arsenal|chelsea|liverpool|manchester city|man city|tottenham|spurs|man utd|mu|manchester united|man united|west ham|everton|newcastle|brighton|aston villa|crystal palace|fulham|brentford)\\b" }, priority: 300 },
  { topicId: "nha", ruleType: "title_regex", ruleValue: { pattern: "\\b(mainoo|saka|haaland|van persie|rashford|foden|rice|salah|kane|son|bernardo|martinelli)\\b" }, priority: 300 },
  { topicId: "laliga", ruleType: "title_regex", ruleValue: { pattern: "\\b(real madrid|barcelona|barca|atletico|modric|vinicius|vini jr|bellingham|rodrygo|ancelotti)\\b" }, priority: 300 },
  { topicId: "bundesliga", ruleType: "title_regex", ruleValue: { pattern: "\\b(bayern|dortmund|borussia|leverkusen|neuer|müller|muller|kimmich|kane)\\b" }, priority: 300 },
  { topicId: "seriea", ruleType: "title_regex", ruleValue: { pattern: "\\b(juventus|juve|inter\\b|ac milan|roma|napoli|lazio|lautaro|osimhen|leão|dybala|tevez)\\b" }, priority: 300 },
  { topicId: "ligue1", ruleType: "title_regex", ruleValue: { pattern: "\\b(psg|paris saint|marseille|lyon|monaco|mbappé|mbappe|neymar|dembélé|dembele)\\b" }, priority: 300 },
  { topicId: "dtvn", ruleType: "title_regex", ruleValue: { pattern: "đt\\s*việt nam|tuyển\\s*việt nam|tuyển\\s*vn|đội tuyển việt nam" }, priority: 300 },
  { topicId: "dtvn", ruleType: "title_regex", ruleValue: { pattern: "u23\\s*việt nam|u23\\s*viet nam|u23\\s*vn" }, priority: 300 },
  { topicId: "dtvn", ruleType: "title_regex", ruleValue: { pattern: "tiến linh|quang hải|văn lâm|văn hậu|công phượng|đức huy|hoàng đức|đức chinh|bùi tiến dũng|hồng duy|phan văn đức|vũ văn thanh|nguyễn quang hải|đặng văn lâm" }, priority: 300 },
  { topicId: "dtvn", ruleType: "title_regex", ruleValue: { pattern: "park hang seo|park hang-seo|troussier|kim sang-sik|huấn luyện viên.*việt nam" }, priority: 300 },
];

export const CLUSTER_CATEGORIES = [
  { id: "cat_schedule", label: "Lịch / Kết quả", topicIds: ["schedule", "match_result"], sortOrder: 0 },
  { id: "cat_domestic", label: "Trong nước", topicIds: ["vleague", "dtvn", "aff", "sea_games", "u23_asia"], sortOrder: 1 },
  { id: "cat_europe", label: "Châu Âu", topicIds: ["nha", "laliga", "seriea", "bundesliga", "ligue1", "c1", "c2", "c3", "euro", "nations_league"], sortOrder: 2 },
  { id: "cat_international", label: "Quốc tế", topicIds: ["worldcup", "asian_cup", "afc_champions", "copa_america", "caf", "olympic"], sortOrder: 3 },
  { id: "cat_transfer", label: "Chuyển nhượng", topicIds: ["transfer"], sortOrder: 4 },
];

export const GPT_WRITER_CONFIG = {
  id: "default",
  model: "gpt-4o-mini",
  temperature: "0.7",
  basePromptRewrite: `Viết lại caption Facebook cho fanpage bóng đá. Giọng trung lập, dễ đọc.
Trả về JSON:
{
  "headline": "tiêu đề ngắn dưới 80 ký tự",
  "content": "nội dung caption (1-3 câu, hấp dẫn, phù hợp Facebook)"
}

Nội dung hiện tại:
- Tiêu đề: {{headline}}
- Tóm tắt: {{summary}}
- Caption: {{content}}`,
  basePromptContentWriter: `Viết caption Facebook cho fanpage bóng đá. Giọng văn: trung lập, dễ đọc.
Trả về JSON:
{
  "short_hot": "1-2 câu ngắn gọn, ví dụ: Chính thức: ...",
  "quick_summary": "3 ý chính, 30 giây đọc xong",
  "debate": "Câu hỏi tranh luận kéo tương tác, ví dụ: Theo anh em ...?",
  "data_stat": "Caption nhấn mạnh số liệu, BXH, thống kê (nếu có)",
  "schedule_recap": "Caption về lịch đấu, thời gian, địa điểm (nếu có)",
  "ctaComment": "1 câu kêu gọi comment ngắn, ví dụ: Bình luận bên dưới!",
  "recommendedImageQuery": "Từ khóa tiếng Anh để tìm ảnh minh họa, ví dụ: football match celebration"
}

Thông tin:
- Headline: {{headline}}
- Summary: {{summary}}
- Teams: {{teams}}
- Players: {{players}}
- Key facts: {{keyFacts}}`,
};
