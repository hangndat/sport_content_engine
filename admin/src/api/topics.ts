import { API_BASE } from './client';

export async function getTopics() {
  const res = await fetch(`${API_BASE}/topics`);
  return res.json() as Promise<{ data: { id: string; label: string; sortOrder?: number }[] }>;
}

export async function createTopic(body: { id: string; label: string; sortOrder?: number }) {
  const res = await fetch(`${API_BASE}/topics`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function updateTopic(id: string, body: { label?: string; sortOrder?: number }) {
  const res = await fetch(`${API_BASE}/topics/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function deleteTopic(id: string) {
  const res = await fetch(`${API_BASE}/topics/${id}`, { method: 'DELETE' });
  return res.json();
}

export async function getTopicRules(topicId?: string) {
  const q = topicId ? `?topicId=${encodeURIComponent(topicId)}` : '';
  const res = await fetch(`${API_BASE}/topic-rules${q}`);
  return res.json() as Promise<{
    data: { id: string; topicId: string; ruleType: string; ruleValue: object; priority: number }[];
  }>;
}

export async function getTopicRuleTypes() {
  const res = await fetch(`${API_BASE}/topic-rules/types`);
  return res.json() as Promise<{ data: string[] }>;
}

export async function createTopicRule(body: {
  topicId: string;
  ruleType: string;
  ruleValue: object;
  priority?: number;
}) {
  const res = await fetch(`${API_BASE}/topic-rules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function updateTopicRule(
  id: string,
  body: { topicId?: string; ruleType?: string; ruleValue?: object; priority?: number }
) {
  const res = await fetch(`${API_BASE}/topic-rules/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function deleteTopicRule(id: string) {
  const res = await fetch(`${API_BASE}/topic-rules/${id}`, { method: 'DELETE' });
  return res.json();
}
