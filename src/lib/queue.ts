import { Queue } from "bullmq";

const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";

export const publishQueue = new Queue("publish", {
  connection: {
    url: redisUrl,
    maxRetriesPerRequest: null,
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
  },
});

export const ingestQueue = new Queue("ingest", {
  connection: {
    url: redisUrl,
    maxRetriesPerRequest: null,
  },
  defaultJobOptions: {
    attempts: 2,
  },
});
