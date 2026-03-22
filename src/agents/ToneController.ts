export type Tone = "neutral" | "humorous" | "fan_light" | "debate_hot" | "news_style";

export class ToneController {
  adjust(content: string, tone: Tone): string {
    if (tone === "neutral") return content;

    const prefixes: Record<Tone, string> = {
      neutral: "",
      humorous: "[Vui] ",
      fan_light: "🔥 ",
      debate_hot: "💬 ",
      news_style: "📰 ",
    };
    const prefix = prefixes[tone];
    return prefix ? `${prefix}${content}` : content;
  }
}
