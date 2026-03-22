import { getOpenAI } from "../lib/openai.js";
import {
  getGptWriterConfig,
  interpolateContentWriterPrompt,
} from "../lib/gptWriterConfig.js";
import type { ExtractedFacts } from "./FactExtractor.js";
import type { ContentFormatType } from "../types/index.js";

export interface ContentVariants {
  short_hot: string;
  quick_summary: string;
  debate?: string;
  data_stat?: string;
  schedule_recap?: string;
  ctaComment?: string;
  recommendedImageQuery?: string;
}

export class ContentWriter {
  async write(
    facts: ExtractedFacts,
    format: ContentFormatType = "short_hot",
    instruction?: string
  ): Promise<ContentVariants> {
    const config = await getGptWriterConfig();
    let prompt = interpolateContentWriterPrompt(config.basePromptContentWriter, {
      headline: facts.headline,
      summary: facts.summary,
      teams: facts.teams.join(", "),
      players: facts.players.join(", "),
      keyFacts: facts.keyFacts.join(". "),
    });
    if (instruction?.trim()) {
      prompt += `\n\nYêu cầu thêm từ biên tập viên: ${instruction.trim()}`;
    }

    const completion = await getOpenAI().chat.completions.create({
      model: config.model,
      temperature: config.temperature,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const text = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(text) as Record<string, string>;

    return {
      short_hot: parsed.short_hot ?? facts.headline,
      quick_summary: parsed.quick_summary ?? facts.summary,
      debate: parsed.debate,
      data_stat: parsed.data_stat,
      schedule_recap: parsed.schedule_recap,
      ctaComment: parsed.ctaComment,
      recommendedImageQuery: parsed.recommendedImageQuery,
    };
  }
}
