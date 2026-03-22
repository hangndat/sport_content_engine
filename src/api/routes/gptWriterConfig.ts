import { Router } from "express";
import { db, gptWriterConfig } from "../../db/index.js";
import { eq } from "drizzle-orm";
import { getGptWriterConfig, clearGptWriterConfigCache } from "../../lib/gptWriterConfig.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const config = await getGptWriterConfig();
    res.json(config);
  } catch (err) {
    console.error("[GptWriterConfig] Get failed", err);
    res.status(500).json({ error: "Failed to get config" });
  }
});

router.patch("/", async (req, res) => {
  try {
    const body = req.body as {
      model?: string;
      temperature?: number;
      basePromptRewrite?: string;
      basePromptContentWriter?: string;
    };

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (body.model != null && typeof body.model === "string" && body.model.trim()) {
      updates.model = body.model.trim();
    }
    if (body.temperature != null && typeof body.temperature === "number") {
      updates.temperature = String(Math.min(2, Math.max(0, body.temperature)));
    }
    if (body.basePromptRewrite != null) {
      updates.basePromptRewrite = String(body.basePromptRewrite);
    }
    if (body.basePromptContentWriter != null) {
      updates.basePromptContentWriter = String(body.basePromptContentWriter);
    }

    const [existing] = await db
      .select()
      .from(gptWriterConfig)
      .where(eq(gptWriterConfig.id, "default"));

    if (existing) {
      await db
        .update(gptWriterConfig)
        .set(updates as Record<string, unknown>)
        .where(eq(gptWriterConfig.id, "default"));
    } else {
      await db.insert(gptWriterConfig).values({
        id: "default",
        model: (updates.model as string) ?? "gpt-4o-mini",
        temperature: (updates.temperature as string) ?? "0.7",
        basePromptRewrite: (updates.basePromptRewrite as string) ?? null,
        basePromptContentWriter: (updates.basePromptContentWriter as string) ?? null,
      });
    }

    clearGptWriterConfigCache();
    const config = await getGptWriterConfig();
    res.json(config);
  } catch (err) {
    console.error("[GptWriterConfig] Update failed", err);
    res.status(500).json({ error: "Failed to update config" });
  }
});

export const gptWriterConfigRoutes = router;
