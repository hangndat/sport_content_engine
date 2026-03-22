import { getOpenAI } from "../lib/openai.js";
import {
  getGptWriterConfig,
  interpolateRewritePrompt,
} from "../lib/gptWriterConfig.js";

export interface RewriteInput {
  headline: string;
  content: string;
  summary?: string;
  instruction?: string;
}

export interface RewriteOutput {
  headline: string;
  content: string;
}

export type RewriteStreamEvent =
  | { t: "step_input"; actor: string; data: RewriteInput }
  | { t: "step_prompt"; actor: string; data: { prompt: string } }
  | { t: "stream_chunk"; actor: string; chunk: string }
  | { t: "step_output"; actor: string; data: RewriteOutput }
  | { t: "error"; error: string };

type EmitFn = (ev: RewriteStreamEvent) => void;

/**
 * Viết lại caption draft bằng GPT theo instruction tùy chọn.
 * Nếu không có instruction, GPT cải thiện cho caption Facebook.
 */
export async function rewriteDraft(input: RewriteInput): Promise<RewriteOutput> {
  const { headline, content, summary = "", instruction } = input;
  const config = await getGptWriterConfig();

  const basePrompt = interpolateRewritePrompt(config.basePromptRewrite, {
    headline,
    summary,
    content,
  });

  const fullPrompt = instruction
    ? `${basePrompt}

Yêu cầu thêm từ biên tập viên: ${instruction}`
    : `${basePrompt}

Cải thiện nội dung: giữ ý chính, viết gọn hơn hoặc hấp dẫn hơn cho tương tác.`;

  const completion = await getOpenAI().chat.completions.create({
    model: config.model,
    temperature: config.temperature,
    messages: [{ role: "user", content: fullPrompt }],
    response_format: { type: "json_object" },
  });

  const text = completion.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(extractJson(text)) as Record<string, string>;

  return {
    headline: (parsed.headline ?? headline).trim(),
    content: (parsed.content ?? content).trim(),
  };
}

const ACTOR = "RewriteAgent";

/** Strip markdown code blocks nếu GPT wrap JSON trong \`\`\`json ... \`\`\` */
function extractJson(text: string): string {
  const t = text.trim();
  const m = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  return m ? m[1].trim() : t;
}

/**
 * Streaming version: emit từng step (input, prompt, chunks, output) để admin theo dõi.
 */
export async function rewriteDraftStream(
  input: RewriteInput,
  emit: EmitFn
): Promise<RewriteOutput> {
  const { headline, content, summary = "", instruction } = input;
  const config = await getGptWriterConfig();

  emit({ t: "step_input", actor: ACTOR, data: input });

  const basePrompt = interpolateRewritePrompt(config.basePromptRewrite, {
    headline,
    summary,
    content,
  });

  const fullPrompt = instruction
    ? `${basePrompt}

Yêu cầu thêm từ biên tập viên: ${instruction}`
    : `${basePrompt}

Cải thiện nội dung: giữ ý chính, viết gọn hơn hoặc hấp dẫn hơn cho tương tác.`;

  emit({ t: "step_prompt", actor: ACTOR, data: { prompt: fullPrompt } });

  const stream = await getOpenAI().chat.completions.create({
    model: config.model,
    temperature: config.temperature,
    messages: [{ role: "user", content: fullPrompt }],
    stream: true,
  });

  let fullText = "";
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content ?? "";
    if (delta) {
      fullText += delta;
      emit({ t: "stream_chunk", actor: ACTOR, chunk: delta });
    }
  }

  let parsed: Record<string, string>;
  try {
    parsed = JSON.parse(extractJson(fullText || "{}")) as Record<string, string>;
  } catch (e) {
    emit({
      t: "error",
      error: `Parse JSON thất bại: ${e instanceof Error ? e.message : String(e)}`,
    });
    throw new Error("Invalid JSON from LLM");
  }

  const output: RewriteOutput = {
    headline: (parsed.headline ?? headline).trim(),
    content: (parsed.content ?? content).trim(),
  };
  emit({ t: "step_output", actor: ACTOR, data: output });
  return output;
}
