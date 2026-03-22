import { API_BASE } from './client';

export async function getClusterCategoriesConfig() {
  const res = await fetch(`${API_BASE}/cluster-categories`);
  return res.json() as Promise<{
    data: { id: string; label: string; topicIds: string[]; sortOrder?: number }[];
  }>;
}

export async function createClusterCategory(body: {
  id: string;
  label: string;
  topicIds: string[];
  sortOrder?: number;
}) {
  const res = await fetch(`${API_BASE}/cluster-categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function updateClusterCategory(
  id: string,
  body: { label?: string; topicIds?: string[]; sortOrder?: number }
) {
  const res = await fetch(`${API_BASE}/cluster-categories/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function deleteClusterCategory(id: string) {
  const res = await fetch(`${API_BASE}/cluster-categories/${id}`, { method: 'DELETE' });
  return res.json();
}
