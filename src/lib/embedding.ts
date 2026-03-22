import { getOpenAI, hasOpenAIKey } from "./openai.js";

const MODEL = "text-embedding-3-small";
const BATCH_SIZE = 100;

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom > 0 ? dot / denom : 0;
}

/**
 * Lấy embeddings cho nhiều text trong một lần gọi (batch).
 * Trả về Map<text, embedding> — dùng text làm key vì có thể trùng id.
 */
export async function getEmbeddingsForTitles(
  items: { id: string; title: string }[]
): Promise<Map<string, number[]>> {
  const result = new Map<string, number[]>();
  if (!hasOpenAIKey() || items.length === 0) return result;

  const texts = items.map((i) => i.title.slice(0, 500));
  const ids = items.map((i) => i.id);

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    try {
      const resp = await getOpenAI().embeddings.create({
        model: MODEL,
        input: batch,
      });
      for (let j = 0; j < resp.data.length; j++) {
        const embedding = resp.data[j].embedding;
        const id = ids[i + j];
        if (id && embedding) result.set(id, embedding);
      }
    } catch (err) {
      console.warn("[embedding] OpenAI batch failed:", err);
      break;
    }
  }

  return result;
}

export function cosineSim(a: number[], b: number[]): number {
  return cosineSimilarity(a, b);
}

export { cosineSimilarity };
