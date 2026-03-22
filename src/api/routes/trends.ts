import { Router, type Request, type Response } from "express";
import { TrendService } from "../../services/TrendService.js";

const router = Router();
const trendService = new TrendService();

router.get("/", async (req: Request, res: Response) => {
  try {
    const hours = Math.min(168, parseInt(String(req.query.hours || 24), 10) || 24);
    const limit = Math.min(20, parseInt(String(req.query.limit || 10), 10) || 10);
    const trends = await trendService.getTrends(hours, limit);
    res.json(trends);
  } catch (err) {
    console.error("[Trends] Get trends failed", err);
    res.status(500).json({ error: "Failed to get trends" });
  }
});

router.get("/daily", async (req: Request, res: Response) => {
  try {
    const days = Math.min(30, parseInt(String(req.query.days || 7), 10) || 7);
    const limit = Math.min(15, parseInt(String(req.query.limit || 5), 10) || 5);
    const type = String(req.query.type || "all");
    const validType =
      type === "teams" || type === "players" || type === "competitions" ? type : "all";
    const data = await trendService.getTrendsByDay({
      days,
      limit,
      type: validType,
    });
    res.json(data);
  } catch (err) {
    console.error("[Trends] Get daily trends failed", err);
    res.status(500).json({ error: "Failed to get daily trends" });
  }
});

export const trendsRoutes = router;
