import { getOpenAI } from "../lib/openai.js";
import type { EnrichedCluster } from "../services/EnrichmentService.js";

export interface ExtractedFacts {
  headline: string;
  summary: string;
  confidenceScore: number;
  sourceList: string[];
  teams: string[];
  players: string[];
  keyFacts: string[];
}

export class FactExtractor {
  async extract(cluster: EnrichedCluster): Promise<ExtractedFacts> {
    const prompt = `Trích xuất sự kiện từ tin thể thao sau. Trả về JSON (không markdown):
{
  "headline": "tiêu đề ngắn dưới 80 ký tự",
  "summary": "tóm tắt 2-3 câu",
  "confidenceScore": 0-100 (độ chắc chắn thông tin),
  "teams": ["đội1", "đội2"],
  "players": ["cầu thủ"],
  "keyFacts": ["sự kiện 1", "sự kiện 2"]
}

Nội dung:
Tiêu đề: ${cluster.title}
Tóm tắt: ${cluster.summary}
Đội: ${cluster.teams.join(", ")}
Cầu thủ: ${cluster.players.join(", ")}
Nguồn: ${(cluster.sourceList ?? []).join(", ")}
`;

    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const text = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(text) as Record<string, unknown>;

    const parsedSourceList = (parsed.sourceList as string[]) ?? [];
    const clusterSources = cluster.sourceList ?? [];
    const sourceList =
      parsedSourceList.length > 0 ? parsedSourceList : clusterSources;

    return {
      headline: (parsed.headline as string) ?? cluster.title,
      summary: (parsed.summary as string) ?? cluster.summary,
      confidenceScore: Math.min(100, Math.max(0, (parsed.confidenceScore as number) ?? 70)),
      sourceList,
      teams: (parsed.teams as string[]) ?? cluster.teams,
      players: (parsed.players as string[]) ?? cluster.players,
      keyFacts: (parsed.keyFacts as string[]) ?? [],
    };
  }
}
