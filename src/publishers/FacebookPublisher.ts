import type { IPublisher, PublishResult } from "./base.js";

const PAGE_ID = process.env.FACEBOOK_PAGE_ID;
const ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

export class FacebookPublisher implements IPublisher {
  async publish(content: string): Promise<PublishResult> {
    if (!PAGE_ID || !ACCESS_TOKEN) {
      return { success: false, error: "Facebook credentials not configured" };
    }

    try {
      const url = `https://graph.facebook.com/v21.0/${PAGE_ID}/feed`;
      const params = new URLSearchParams({
        message: content,
        access_token: ACCESS_TOKEN,
      });

      const res = await fetch(url, {
        method: "POST",
        body: params,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      const data = (await res.json()) as { id?: string; error?: { message: string } };
      if (data.error) {
        return { success: false, error: data.error.message };
      }

      return { success: true, externalId: data.id };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  }
}
