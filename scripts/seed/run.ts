/**
 * Chạy toàn bộ seed — topics, rules, cluster_categories, sources.
 * Được gọi từ db-init.
 */
import "dotenv/config";
import { db, topics, topicRules, clusterCategories, sources, gptWriterConfig, scoreConfig } from "../../src/db/index.js";
import { eq } from "drizzle-orm";
import { defaultSources } from "../../src/config/sources.js";
import { DEFAULT_PAYLOAD } from "../../src/lib/scoreConfig.js";
import { TOPICS, RULES, CLUSTER_CATEGORIES, GPT_WRITER_CONFIG } from "./data.js";

export async function runTopicsAndRules(): Promise<void> {
  for (const t of TOPICS) {
    await db
      .insert(topics)
      .values({ id: t.id, label: t.label, sortOrder: t.sortOrder })
      .onConflictDoUpdate({
        target: topics.id,
        set: { label: t.label, sortOrder: t.sortOrder, updatedAt: new Date() },
      });
  }
  for (let i = 0; i < RULES.length; i++) {
    const r = RULES[i]!;
    const ruleId = `seed_${r.topicId}_${i}`;
    await db
      .insert(topicRules)
      .values({
        id: ruleId,
        topicId: r.topicId,
        ruleType: r.ruleType,
        ruleValue: r.ruleValue,
        priority: r.priority,
      })
      .onConflictDoUpdate({
        target: topicRules.id,
        set: {
          topicId: r.topicId,
          ruleType: r.ruleType,
          ruleValue: r.ruleValue,
          priority: r.priority,
          updatedAt: new Date(),
        },
      });
  }
}

export async function runClusterCategories(): Promise<void> {
  for (const row of CLUSTER_CATEGORIES) {
    await db
      .insert(clusterCategories)
      .values({ ...row, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: clusterCategories.id,
        set: {
          label: row.label,
          topicIds: row.topicIds,
          sortOrder: row.sortOrder,
          updatedAt: new Date(),
        },
      });
  }
}

export async function runGptWriterConfig(): Promise<void> {
  await db
    .insert(gptWriterConfig)
    .values(GPT_WRITER_CONFIG)
    .onConflictDoUpdate({
      target: gptWriterConfig.id,
      set: {
        model: GPT_WRITER_CONFIG.model,
        temperature: GPT_WRITER_CONFIG.temperature,
        basePromptRewrite: GPT_WRITER_CONFIG.basePromptRewrite,
        basePromptContentWriter: GPT_WRITER_CONFIG.basePromptContentWriter,
        updatedAt: new Date(),
      },
    });
}

export async function runScoreConfig(): Promise<void> {
  const [existing] = await db.select().from(scoreConfig).where(eq(scoreConfig.id, "default"));
  const payload = existing?.payload
    ? { ...DEFAULT_PAYLOAD, ...(existing.payload as object) }
    : DEFAULT_PAYLOAD;
  await db
    .insert(scoreConfig)
    .values({ id: "default", payload, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: scoreConfig.id,
      set: { updatedAt: new Date() },
    });
}

export async function runSources(): Promise<void> {
  for (const s of defaultSources) {
    const exists = await db.select().from(sources).where(eq(sources.id, s.id));
    if (exists.length === 0) {
      await db.insert(sources).values({
        id: s.id,
        type: s.type,
        tier: s.tier,
        url: s.url,
        rateLimitMinutes: s.rateLimitMinutes ?? 15,
        enabled: s.enabled ?? true,
      });
    } else {
      await db
        .update(sources)
        .set({
          type: s.type,
          tier: s.tier,
          url: s.url,
          rateLimitMinutes: s.rateLimitMinutes ?? 15,
          enabled: s.enabled ?? true,
        })
        .where(eq(sources.id, s.id));
    }
  }
}
