import { db, gptWriterConfig } from "../db/index.js";
import { eq } from "drizzle-orm";

export type GptWriterConfig = {
  model: string;
  temperature: number;
  basePromptRewrite: string;
  basePromptContentWriter: string;
};

const DEFAULT_REWRITE_PROMPT = `Viết lại caption Facebook cho fanpage bóng đá. Giọng trung lập, dễ đọc.
Trả về JSON:
{
  "headline": "tiêu đề ngắn dưới 80 ký tự",
  "content": "nội dung caption (1-3 câu, hấp dẫn, phù hợp Facebook)"
}

Nội dung hiện tại:
- Tiêu đề: {{headline}}
- Tóm tắt: {{summary}}
- Caption: {{content}}`;

const DEFAULT_CONTENT_WRITER_PROMPT = `Viết caption Facebook cho fanpage bóng đá. Giọng văn: trung lập, dễ đọc.
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
- Key facts: {{keyFacts}}`;

let cache: GptWriterConfig | null = null;

function interpolate(template: string, vars: Record<string, string>): string {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), v);
  }
  return out;
}

export function interpolateRewritePrompt(
  template: string,
  vars: { headline: string; summary: string; content: string }
): string {
  return interpolate(template, vars);
}

export function interpolateContentWriterPrompt(
  template: string,
  vars: { headline: string; summary: string; teams: string; players: string; keyFacts: string }
): string {
  return interpolate(template, vars);
}

export async function getGptWriterConfig(): Promise<GptWriterConfig> {
  if (cache) return cache;

  const [row] = await db
    .select()
    .from(gptWriterConfig)
    .where(eq(gptWriterConfig.id, "default"));

  const temp = parseFloat(row?.temperature ?? "0.7");
  cache = {
    model: row?.model ?? "gpt-4o-mini",
    temperature: Number.isFinite(temp) ? Math.min(2, Math.max(0, temp)) : 0.7,
    basePromptRewrite: row?.basePromptRewrite ?? DEFAULT_REWRITE_PROMPT,
    basePromptContentWriter:
      row?.basePromptContentWriter ?? DEFAULT_CONTENT_WRITER_PROMPT,
  };
  return cache;
}

export function clearGptWriterConfigCache(): void {
  cache = null;
}
