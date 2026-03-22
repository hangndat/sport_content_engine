import { db, topics, topicRules } from "../db/index.js";
import { eq, asc } from "drizzle-orm";

export interface ArticleForTopic {
  title?: string | null;
  teams?: string[] | null;
  competition?: string | null;
  contentType?: string | null;
}

export const RULE_TYPES = ["competition_regex", "teams_contains", "title_regex", "content_type"] as const;

type CachedRule = {
  topicId: string;
  ruleType: string;
  ruleValue: { pattern?: string; values?: string[]; value?: string };
  priority: number;
};

let cachedRules: CachedRule[] | null = null;
let cachedLabels: Map<string, string> | null = null;

export function invalidateTopicCache(): void {
  cachedRules = null;
  cachedLabels = null;
}

async function loadRules(): Promise<CachedRule[]> {
  if (cachedRules) return cachedRules;
  const rows = await db
    .select()
    .from(topicRules)
    .orderBy(asc(topicRules.priority), asc(topicRules.id));
  cachedRules = rows.map((r) => ({
    topicId: r.topicId,
    ruleType: r.ruleType,
    ruleValue: (r.ruleValue ?? {}) as { pattern?: string; values?: string[]; value?: string },
    priority: r.priority ?? 0,
  }));
  return cachedRules;
}

async function loadLabels(): Promise<Map<string, string>> {
  if (cachedLabels) return cachedLabels;
  const rows = await db.select().from(topics);
  cachedLabels = new Map(rows.map((r) => [r.id, r.label]));
  cachedLabels.set("other", "Khác");
  return cachedLabels;
}

function testRule(
  rule: CachedRule,
  article: ArticleForTopic
): boolean {
  const title = (article.title ?? "").toLowerCase();
  const competition = (article.competition ?? "").toLowerCase().replace(/\s+/g, " ");
  const teams = (article.teams ?? []).map((t) => t.toLowerCase().trim());

  if (rule.ruleType === "competition_regex" && rule.ruleValue.pattern) {
    try {
      return new RegExp(rule.ruleValue.pattern, "i").test(competition);
    } catch {
      return false;
    }
  }
  if (rule.ruleType === "title_regex" && rule.ruleValue.pattern) {
    try {
      return new RegExp(rule.ruleValue.pattern, "i").test(title);
    } catch {
      return false;
    }
  }
  if (rule.ruleType === "teams_contains" && rule.ruleValue.values?.length) {
    const values = new Set(rule.ruleValue.values.map((v) => v.toLowerCase()));
    return teams.some((t) => values.has(t));
  }
  if (rule.ruleType === "content_type" && rule.ruleValue.value) {
    const ct = (article.contentType ?? "").toLowerCase();
    return ct === rule.ruleValue.value.toLowerCase();
  }
  return false;
}

/** Suy luận topic từ article — dùng rules trong DB */
export async function inferTopic(article: ArticleForTopic): Promise<string> {
  const rules = await loadRules();
  for (const rule of rules) {
    if (testRule(rule, article)) return rule.topicId;
  }
  return "other";
}

/** Sync version — dùng khi đã có rules loaded. Dành cho batch. */
export function inferTopicSync(article: ArticleForTopic, rules: CachedRule[]): string {
  for (const rule of rules) {
    if (testRule(rule, article)) return rule.topicId;
  }
  return "other";
}

/** Load rules và infer (dùng trong batch) */
export async function loadRulesAndInfer(article: ArticleForTopic): Promise<string> {
  const rules = await loadRules();
  return inferTopicSync(article, rules);
}

export async function getTopicLabels(): Promise<Map<string, string>> {
  return loadLabels();
}

export async function getTopicLabelsRecord(): Promise<Record<string, string>> {
  const m = await loadLabels();
  return Object.fromEntries(m);
}
