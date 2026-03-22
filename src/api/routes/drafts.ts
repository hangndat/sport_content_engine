import { Router } from "express";
import { db, drafts } from "../../db/index.js";
import { eq, desc, sql, and } from "drizzle-orm";
import {
  createDraftFromCluster,
  type CreateDraftOptions,
  type CreateDraftStreamEvent,
} from "../../agents/index.js";
import { rewriteDraft, rewriteDraftStream } from "../../agents/RewriteAgent.js";
import { clusterRoutes } from "./clusters.js";
import { ALLOWED_FORMATS, ALLOWED_TONES } from "../../constants/draft.js";
import type { ContentFormatType } from "../../types/index.js";

const router = Router();

router.use("/clusters", clusterRoutes);

router.get("/", async (req, res) => {
  try {
    const limit = Math.min(100, parseInt(String(req.query.limit || 20), 10));
    const offset = parseInt(String(req.query.offset || 0), 10);
    const status = req.query.status as string | undefined;
    const format = req.query.format as string | undefined;

    const conditions = [];
    if (status) conditions.push(eq(drafts.status, status));
    if (format) conditions.push(eq(drafts.format, format));
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countRes, list] = await Promise.all([
      db
        .select({ total: sql<number>`count(*)::int` })
        .from(drafts)
        .where(whereClause ?? sql`1=1`),
      db
        .select()
        .from(drafts)
        .where(whereClause ?? sql`1=1`)
        .orderBy(desc(drafts.createdAt))
        .limit(limit)
        .offset(offset),
    ]);
    res.json({ data: list, total: Number(countRes[0]?.total ?? 0) });
  } catch (err) {
    console.error("[Drafts] List failed", err);
    res.status(500).json({ error: "Failed to list drafts" });
  }
});

router.get("/:id", async (req, res) => {
  const [draft] = await db
    .select()
    .from(drafts)
    .where(eq(drafts.id, req.params.id));

  if (!draft) return res.status(404).json({ error: "Draft not found" });
  res.json(draft);
});

router.post("/from-cluster/:clusterId", async (req, res) => {
  const streamMode = req.query.stream === "1" || req.headers.accept?.includes("text/event-stream");

  const buildOptions = (): CreateDraftOptions | undefined => {
    const { format, tone, instruction } = req.body as {
      format?: string;
      tone?: string;
      instruction?: string;
    };
    return format || tone || instruction
      ? {
          ...(format && ALLOWED_FORMATS.includes(format as ContentFormatType) && {
            format: format as ContentFormatType,
          }),
          ...(tone && ALLOWED_TONES.includes(tone as (typeof ALLOWED_TONES)[number]) && {
            tone: tone as CreateDraftOptions["tone"],
          }),
          ...(instruction && typeof instruction === "string" && { instruction: instruction.trim() }),
        }
      : undefined;
  };

  if (streamMode) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    const send = (ev: CreateDraftStreamEvent) => {
      res.write(`data: ${JSON.stringify(ev)}\n\n`);
      (res as unknown as { flush?: () => void }).flush?.();
    };

    try {
      const draftId = await createDraftFromCluster(
        req.params.clusterId,
        buildOptions() as CreateDraftOptions | undefined,
        send
      );
      send({ t: "done", ok: true, draftId });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create draft";
      send({ t: "done", ok: false, error: msg });
    } finally {
      res.end();
    }
    return;
  }

  try {
    const options = buildOptions() as CreateDraftOptions | undefined;
    const draftId = await createDraftFromCluster(req.params.clusterId, options);
    res.json({ ok: true, draftId });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Failed to create draft",
    });
  }
});

router.post("/:id/approve", async (req, res) => {
  try {
    await db
      .update(drafts)
      .set({ status: "approved", updatedAt: new Date() })
      .where(eq(drafts.id, req.params.id));
    res.json({ ok: true });
  } catch (err) {
    console.error("[Drafts] Approve failed", req.params.id, err);
    res.status(500).json({ error: "Failed to approve" });
  }
});

router.post("/:id/reject", async (req, res) => {
  try {
    await db
      .update(drafts)
      .set({ status: "rejected", updatedAt: new Date() })
      .where(eq(drafts.id, req.params.id));
    res.json({ ok: true });
  } catch (err) {
    console.error("[Drafts] Reject failed", req.params.id, err);
    res.status(500).json({ error: "Failed to reject" });
  }
});

router.patch("/:id", async (req, res) => {
  const { headline, content, tone } = req.body as {
    headline?: string;
    content?: string;
    tone?: string;
  };

  const updates: Record<string, unknown> = { updatedAt: new Date() };

  if (headline != null && typeof headline === "string" && headline.trim()) {
    updates.headline = headline.trim();
  }
  if (content != null && typeof content === "string") {
    updates.content = content;
  }
  if (tone != null && ALLOWED_TONES.includes(tone as (typeof ALLOWED_TONES)[number])) {
    updates.tone = tone;
  }

  const hasUpdate = "headline" in updates || "content" in updates || "tone" in updates;
  if (!hasUpdate) {
    return res.status(400).json({ error: "Provide at least one of: headline, content, tone" });
  }

  const [draft] = await db.select().from(drafts).where(eq(drafts.id, req.params.id));
  if (!draft) return res.status(404).json({ error: "Draft not found" });

  await db
    .update(drafts)
    .set(updates as Record<string, unknown>)
    .where(eq(drafts.id, req.params.id));
  res.json({ ok: true });
});

router.post("/:id/rewrite", async (req, res) => {
  const streamMode = req.query.stream === "1" || req.headers.accept?.includes("text/event-stream");

  try {
    const { instruction } = req.body as { instruction?: string };
    const inst = typeof instruction === "string" ? instruction.trim() || undefined : undefined;

    const [draft] = await db.select().from(drafts).where(eq(drafts.id, req.params.id));
    if (!draft) return res.status(404).json({ error: "Draft not found" });

    const input = {
      headline: draft.headline,
      content: draft.content,
      summary: draft.summary ?? "",
      instruction: inst,
    };

    if (streamMode) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders?.();

      const send = (ev: unknown) => {
        res.write(`data: ${JSON.stringify(ev)}\n\n`);
        (res as unknown as { flush?: () => void }).flush?.();
      };

      try {
        const result = await rewriteDraftStream(input, send);
        await db
          .update(drafts)
          .set({
            headline: result.headline,
            content: result.content,
            updatedAt: new Date(),
          })
          .where(eq(drafts.id, req.params.id));
        send({ t: "done", ok: true, headline: result.headline, content: result.content });
      } catch (e) {
        send({
          t: "done",
          ok: false,
          error: e instanceof Error ? e.message : "Rewrite failed",
        });
      } finally {
        res.end();
      }
      return;
    }

    const result = await rewriteDraft(input);

    await db
      .update(drafts)
      .set({
        headline: result.headline,
        content: result.content,
        updatedAt: new Date(),
      })
      .where(eq(drafts.id, req.params.id));

    res.json({ ok: true, headline: result.headline, content: result.content });
  } catch (err) {
    console.error("[Draft] Rewrite failed", req.params.id, err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Rewrite failed",
    });
  }
});

router.post("/:id/select-variant", async (req, res) => {
  const { variant } = req.body as { variant?: string };
  if (!variant || !ALLOWED_FORMATS.includes(variant as ContentFormatType)) {
    return res.status(400).json({ error: `variant required: ${ALLOWED_FORMATS.join(" | ")}` });
  }

  const [draft] = await db.select().from(drafts).where(eq(drafts.id, req.params.id));
  if (!draft) return res.status(404).json({ error: "Draft not found" });

  const variants = draft.variants ?? {};
  const newContent = variants[variant];
  if (!newContent) return res.status(400).json({ error: `Variant "${variant}" not found` });

  await db
    .update(drafts)
    .set({ content: newContent, format: variant, updatedAt: new Date() })
    .where(eq(drafts.id, req.params.id));
  res.json({ ok: true, content: newContent });
});

export const draftRoutes = router;
