import { Router } from "express";
import { db, clusterCategories } from "../../db/index.js";
import { eq, asc } from "drizzle-orm";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(clusterCategories)
      .orderBy(asc(clusterCategories.sortOrder), asc(clusterCategories.id));
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: "Failed to list cluster categories" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { id, label, topicIds, sortOrder } = req.body as {
      id?: string;
      label?: string;
      topicIds?: string[];
      sortOrder?: number;
    };
    if (!id || !label || !Array.isArray(topicIds)) {
      return res.status(400).json({ error: "id, label, topicIds required" });
    }
    const safeId = id.startsWith("cat_") ? id : `cat_${id}`;
    await db.insert(clusterCategories).values({
      id: safeId,
      label,
      topicIds,
      sortOrder: sortOrder ?? 0,
    });
    res.json({ ok: true, id: safeId });
  } catch (err) {
    res.status(500).json({ error: "Failed to create cluster category" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const { label, topicIds, sortOrder } = req.body as {
      label?: string;
      topicIds?: string[];
      sortOrder?: number;
    };
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (label != null) updates.label = label;
    if (topicIds != null) updates.topicIds = topicIds;
    if (sortOrder != null) updates.sortOrder = sortOrder;
    await db.update(clusterCategories).set(updates).where(eq(clusterCategories.id, req.params.id));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to update cluster category" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await db.delete(clusterCategories).where(eq(clusterCategories.id, req.params.id));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete cluster category" });
  }
});

export const clusterCategoriesRoutes = router;
