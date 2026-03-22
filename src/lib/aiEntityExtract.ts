import { getOpenAI, hasOpenAIKey } from "./openai.js";
import type { UnifiedArticle } from "../types/index.js";

export type AIEntityResult = {
  teams: string[];
  players: string[];
  competition: string | null;
  contentType?: string;
};

/** Bổ sung entities bằng AI khi regex trả về ít. Chỉ gọi khi có API key và cần thiết. */
export async function supplementWithAI(
  item: UnifiedArticle,
  regexTeams: string[],
  regexPlayers: string[]
): Promise<AIEntityResult | null> {
  if (!hasOpenAIKey()) return null;

  const needsMore = regexTeams.length < 2 || regexPlayers.length === 0;
  if (!needsMore) return null;

  try {
    const text = `${item.title}\n\n${(item.content ?? "").slice(0, 300)}`;
    const prompt = `Trích teams, players, competition từ tin thể thao. Trả JSON (không markdown):
{"teams": ["đội1","đội2"], "players": ["cầu thủ"], "competition": "tên giải hoặc null", "contentType": "news|result|rumor|stats|schedule|opinion"}

Chỉ trả entities có trong văn bản. contentType: result nếu là kết quả trận, rumor nếu tin đồn.
Văn bản:
${text}
`;

    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const parsed = JSON.parse(completion.choices[0]?.message?.content ?? "{}") as Record<string, unknown>;
    const teams = [...new Set([...regexTeams, ...((parsed.teams as string[]) ?? [])])].filter(Boolean);
    const players = [...new Set([...regexPlayers, ...((parsed.players as string[]) ?? [])])].filter(Boolean);
    const competition = (parsed.competition as string) || null;
    const contentType = (parsed.contentType as string) || "news";

    return { teams, players, competition, contentType };
  } catch (err) {
    console.warn("[aiEntityExtract] OpenAI failed:", err);
    return null;
  }
}
