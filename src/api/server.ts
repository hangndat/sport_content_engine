import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { getModerationMode } from "../lib/moderation.js";
import { ingestRoutes } from "./routes/ingest.js";
import { draftRoutes } from "./routes/drafts.js";
import { publishRoutes } from "./routes/publish.js";
import { sourcesRoutes } from "./routes/sources.js";
import { articlesRoutes } from "./routes/articles.js";
import { clusterCategoriesRoutes } from "./routes/clusterCategories.js";
import { topicsRoutes } from "./routes/topics.js";
import { topicRulesRoutes } from "./routes/topicRules.js";
import { writerHistoryRoutes } from "./routes/writerHistory.js";
import { gptWriterConfigRoutes } from "./routes/gptWriterConfig.js";
import { scoreConfigRoutes } from "./routes/scoreConfig.js";
import { trendsRoutes } from "./routes/trends.js";
import { statsRoutes } from "./routes/stats.js";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/ingest", ingestRoutes);
app.use("/drafts", draftRoutes);
app.use("/publish", publishRoutes);
app.use("/sources", sourcesRoutes);
app.use("/articles", articlesRoutes);
app.use("/cluster-categories", clusterCategoriesRoutes);
app.use("/topics", topicsRoutes);
app.use("/topic-rules", topicRulesRoutes);
app.use("/writer-history", writerHistoryRoutes);
app.use("/config/gpt-writer", gptWriterConfigRoutes);
app.use("/config/score", scoreConfigRoutes);
app.use("/trends", trendsRoutes);
app.use("/stats", statsRoutes);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const adminDist = path.join(__dirname, "../../admin/dist");

app.get("/", (_req, res) => res.redirect("/admin"));
app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.get("/config", (_req, res) => res.json({ moderationMode: getModerationMode() }));
app.use("/admin", express.static(adminDist, { index: false }));
app.get(/^\/admin(\/.*)?$/, (_req, res) => {
  res.sendFile(path.join(adminDist, "index.html"));
});

export async function startServer(): Promise<void> {
  const port = parseInt(process.env.PORT ?? "3000", 10);
  app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
  });
}
