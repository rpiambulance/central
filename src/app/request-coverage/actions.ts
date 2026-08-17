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
  // One row per event; the row keys come from the client component, so read
  // whatever description fields are present rather than assuming an index.
  const events: Array<{
    description: string;
    requestedDate?: string;
    location?: string;
  }> = [];
  for (const [field, value] of formData.entries()) {
    const match = /^event-description-(.+)$/.exec(field);
    if (!match) continue;
    const description = String(value).trim();
    if (!description) continue;
    const key = match[1];
    const date = String(formData.get(`event-date-${key}`) ?? '').trim();
    const location = String(formData.get(`event-location-${key}`) ?? '').trim();
    events.push({
      description,
      ...(date ? { requestedDate: date } : {}),
      ...(location ? { location } : {}),
    });
  }
  if (!events.length) {
    redirect(errorPath('Describe at least one event you need covered.'));
  }

  const payload = {
    requesterName: String(formData.get('requesterName') ?? '').trim(),
    requesterOrg: optional('requesterOrg'),
    requesterEmail: String(formData.get('requesterEmail') ?? '').trim(),
    requesterPhone: optional('requesterPhone'),
    // Kept for the API's single-event shape; the array is what it uses.
    description: events[0].description,
    events,
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
      const data = (await res.json()) as {
        ok: boolean;
        statusUrl: string;
        statusUrls?: string[];
      };
      const tokens = (data.statusUrls ?? [data.statusUrl])
        .map((url) => url.split('/').pop() ?? '')
        .filter(Boolean);
      destination = `/request-coverage/thank-you?tokens=${encodeURIComponent(tokens.join(','))}`;
    }
  } catch {
    destination = errorPath('Could not reach the server — please try again.');
  }
  redirect(destination);
}
