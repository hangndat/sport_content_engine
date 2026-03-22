import OpenAI from "openai";

let _client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (_client) return _client;
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is required. Set it in .env");
  _client = new OpenAI({ apiKey: key });
  return _client;
}

export function hasOpenAIKey(): boolean {
  return !!process.env.OPENAI_API_KEY;
}
