/**
 * Chế độ kiểm duyệt: A (draft only) | B (semi-auto) | C (full auto)
 */
export type ModerationMode = "A" | "B" | "C";

const MODE = (process.env.MODERATION_MODE ?? "A") as ModerationMode;

/** Whitelist content types cho chế độ C: lịch, kết quả, BXH, thống kê */
const AUTO_SAFE_TYPES = ["result", "stats", "schedule"] as const;

export function shouldAutoPost(
  score: number,
  sourceTier: 1 | 2 | 3,
  contentType: string,
  isRumor: boolean
): boolean {
  if (MODE === "A") return false;
  if (MODE === "C") {
    return AUTO_SAFE_TYPES.includes(contentType as (typeof AUTO_SAFE_TYPES)[number]);
  }
  // B: semi-auto
  return (
    score >= 15 &&
    (sourceTier === 1 || sourceTier === 2) &&
    !isRumor &&
    contentType !== "rumor"
  );
}

export function getModerationMode(): ModerationMode {
  return MODE;
}
