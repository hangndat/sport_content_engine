import { Redis } from "ioredis";
const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
export const redis = new Redis(redisUrl);

export const DEDUP_CACHE_PREFIX = "dedup:";
export const DEDUP_TTL_SECONDS = 60 * 60 * 24; // 24h
