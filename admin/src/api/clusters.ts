import { API_BASE, buildQueryString } from './client';

export async function getClusters(params?: {
  limit?: number;
  offset?: number;
  topic?: string | string[];
  category?: string | string[];
  team?: string;
  competition?: string;
  player?: string;
  hours?: number;
}) {
  const q = buildQueryString(params ?? {});
  const res = await fetch(`${API_BASE}/drafts/clusters/top${q}`);
  return res.json() as Promise<{ data: unknown[]; total: number }>;
}

export async function getCluster(id: string) {
  const res = await fetch(`${API_BASE}/drafts/clusters/${id}`);
  return res.json();
}

export async function getClustersCategories() {
  const res = await fetch(`${API_BASE}/drafts/clusters/categories`);
  return res.json() as Promise<{ data: { id: string; label: string; topicIds: string[] }[] }>;
}

export async function getClustersTopics() {
  const res = await fetch(`${API_BASE}/drafts/clusters/topics`);
  return res.json() as Promise<{ data: { id: string; label: string }[] }>;
}

export async function getTopTopics(params?: { limit?: number }) {
  const q = buildQueryString(params ?? {});
  const res = await fetch(`${API_BASE}/drafts/clusters/top-topics${q}`);
  return res.json() as Promise<{
    data: { id: string; label: string; count: number }[];
  }>;
}
