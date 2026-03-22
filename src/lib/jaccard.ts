/**
 * Jaccard similarity cho title - dùng word n-gram
 */

const STOP_WORDS = new Set([
  "và", "của", "cho", "với", "là", "có", "được", "trong", "vào", "ra",
  "the", "a", "an", "of", "to", "in", "for", "on", "at", "by",
]);

function tokenize(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/[^\w\s\u00C0-\u1FFF]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w));
}

/** Word 2-gram: ["mu", "thang", "chelsea"] -> {"mu thang", "thang chelsea"} */
function toBigrams(tokens: string[]): Set<string> {
  const out = new Set<string>();
  for (let i = 0; i < tokens.length - 1; i++) {
    out.add(`${tokens[i]} ${tokens[i + 1]}`);
  }
  return out;
}

/** Word 1-gram + 2-gram để tăng recall */
function toTokenSet(title: string): Set<string> {
  const tokens = tokenize(title);
  const set = new Set(tokens);
  const bigrams = toBigrams(tokens);
  bigrams.forEach((b) => set.add(b));
  return set;
}

export function jaccardSimilarity(a: string, b: string): number {
  const setA = toTokenSet(a);
  const setB = toTokenSet(b);
  if (setA.size === 0 && setB.size === 0) return 1;
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const x of setA) {
    if (setB.has(x)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union > 0 ? intersection / union : 0;
}
