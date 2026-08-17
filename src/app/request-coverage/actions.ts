'use server';

import { redirect } from 'next/navigation';

const API_URL = process.env.RAMPART_API_URL ?? 'http://localhost:3001';

function errorPath(message: string): string {
  return `/request-coverage?error=${encodeURIComponent(message)}`;
}

/** Public intake — no session; hits the API's public throttled endpoint. */
export async function submitCoverageRequest(formData: FormData) {
  const optional = (name: string) => {
    const value = String(formData.get(name) ?? '').trim();
    return value ? value : undefined;
  };
  const payload = {
    requesterName: String(formData.get('requesterName') ?? '').trim(),
    requesterOrg: optional('requesterOrg'),
    requesterEmail: String(formData.get('requesterEmail') ?? '').trim(),
    requesterPhone: optional('requesterPhone'),
    description: String(formData.get('description') ?? '').trim(),
    requestedDate: optional('requestedDate'),
    location: optional('location'),
  };

  let destination: string;
  try {
    const res = await fetch(`${API_URL}/v1/coverage-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });
    if (res.status === 429) {
      destination = errorPath(
        'Too many requests from this connection — please wait a bit and try again, or email us directly.',
      );
    } else if (!res.ok) {
      const body = (await res.json().catch(() => null)) as {
        message?: string | string[];
      } | null;
      const message = Array.isArray(body?.message)
        ? body.message.join('; ')
        : body?.message;
      destination = errorPath(message || `Request failed (${res.status})`);
    } else {
      const data = (await res.json()) as { ok: boolean; statusUrl: string };
      try {
        destination = new URL(data.statusUrl).pathname;
      } catch {
        destination = data.statusUrl;
      }
    }
  } catch {
    destination = errorPath('Could not reach the server — please try again.');
  }
  redirect(destination);
}
