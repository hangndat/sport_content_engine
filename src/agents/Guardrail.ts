import type { AIDraftOutput } from "../types/index.js";
import { getOpenAI, hasOpenAIKey } from "../lib/openai.js";

const RUMOR_KEYWORDS = ["tin đồn", "rumor", "có thể", "đang thảo luận", "chưa xác nhận"];

export interface GuardrailResult {
  pass: boolean;
  edits?: string[];
  labels?: string[];
  fabrication?: boolean;
}

function keywordCheck(content: string, confidenceScore: number): GuardrailResult {
  const labels: string[] = [];
  const lower = content.toLowerCase();
  for (const kw of RUMOR_KEYWORDS) {
    if (lower.includes(kw.toLowerCase())) {
      if (!labels.includes("rumor")) labels.push("rumor");
    }
  }
  if (confidenceScore < 50 && !labels.includes("rumor")) labels.push("rumor");
  return {
    pass: true,
    labels: labels.length ? labels : undefined,
  };
}

export class Guardrail {
  async check(draft: AIDraftOutput, content: string): Promise<GuardrailResult> {
    if (!hasOpenAIKey()) {
      return keywordCheck(content, draft.confidenceScore);
    }

    try {
      const prompt = `Kiểm tra tin thể thao sau. Trả về JSON (không markdown):
{
  "fabrication": boolean (true nếu có thông tin bịa đặt, sai sự thật),
  "rumor": boolean (true nếu là tin đồn chưa xác nhận),
  "reason": "lý do ngắn nếu có vấn đề"
}

Headline: ${draft.headline}
Summary: ${draft.summary}
Độ chắc chắn nguồn: ${draft.confidenceScore}/100
Nội dung caption cần đăng: ${content.slice(0, 500)}
`;

      const completion = await getOpenAI().chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const text = completion.choices[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(text) as { fabrication?: boolean; rumor?: boolean; reason?: string };
      const fabrication = parsed.fabrication === true;
      const rumor = parsed.rumor === true;

      const labels: string[] = [];
      if (rumor) labels.push("rumor");
      if (fabrication) labels.push("fabrication");

      const keywordResult = keywordCheck(content, draft.confidenceScore);
      for (const l of keywordResult.labels ?? []) {
        if (!labels.includes(l)) labels.push(l);
      }

      return {
        pass: !fabrication,
        labels: labels.length ? labels : undefined,
        fabrication,
      };
    } catch (err) {
      console.warn("[Guardrail] OpenAI fallback to keyword check:", err);
      return keywordCheck(content, draft.confidenceScore);
    }
  }
}
