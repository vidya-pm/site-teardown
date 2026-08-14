import type { TeardownResult } from '../types';

export async function fetchTeardown(url: string): Promise<TeardownResult> {
  const res = await fetch('/api/teardown', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  const data = (await res.json()) as TeardownResult & { error?: string };
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data;
}
