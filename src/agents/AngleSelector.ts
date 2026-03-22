import type { ExtractedFacts } from "./FactExtractor.js";
import type { ContentFormatType } from "../types/index.js";
import type { EnrichedCluster } from "../services/EnrichmentService.js";
import {
  computeViralSignals,
  isHighViralPotential,
} from "../lib/viralSignals.js";

export interface PageConfig {
  niche?: string;
  tone?: string;
  formatsAllowed?: ContentFormatType[];
  /** Cluster context – dùng để angle đúng nội dung viral */
  cluster?: EnrichedCluster;
}

export class AngleSelector {
  select(facts: ExtractedFacts, config?: PageConfig): ContentFormatType {
    const allowed = config?.formatsAllowed ?? [
      "short_hot",
      "quick_summary",
      "debate",
      "data_stat",
      "schedule_recap",
    ];

    if (facts.keyFacts.some((f) => f.toLowerCase().includes("chính thức"))) {
      return allowed.includes("short_hot") ? "short_hot" : allowed[0];
    }

    if (facts.confidenceScore < 70) {
      return allowed.includes("debate") ? "debate" : allowed[0];
    }

    const cluster = config?.cluster;
    if (cluster && allowed.includes("short_hot")) {
      const viralSignals = computeViralSignals({
        teams: cluster.teams,
        players: cluster.players,
        competition: cluster.competition,
        contentType: cluster.contentType,
        distinctSourceCount: cluster.sourceList?.length ?? 0,
      });
      if (isHighViralPotential(viralSignals)) {
        return "short_hot";
      }
      if (cluster.contentType === "result") {
        return "short_hot";
      }
      if (cluster.contentType === "rumor" && allowed.includes("debate")) {
        return "debate";
      }
    }

    const text = facts.keyFacts.join(" ").toLowerCase();
    if (
      allowed.includes("data_stat") &&
      /\d+|\b(bxh|thống kê|số bàn|ghi bàn|tỷ số)\b/.test(text)
    ) {
      return "data_stat";
    }
    if (
      allowed.includes("schedule_recap") &&
      /\b(lịch|ngày \d|giờ \d|thứ|hạng|vòng)\b/.test(text)
    ) {
      return "schedule_recap";
    }

    return allowed[0];
  }
}
