'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const API_URL = process.env.RAMPART_API_URL ?? 'http://localhost:3001';

/** Public requester reply — no session; keyed by the status token. */
export async function sendRequesterReply(token: string, formData: FormData) {
  const body = String(formData.get('body') ?? '').trim();
  const path = `/request-coverage/status/${token}`;
  if (!body) redirect(`${path}?error=${encodeURIComponent('Message is empty')}`);

  let errorMessage: string | null = null;
  try {
    const res = await fetch(
      `${API_URL}/v1/coverage-requests/status/${token}/messages`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
        cache: 'no-store',
      },
    );
    if (res.status === 429) {
      errorMessage =
        'Too many messages recently — please wait a bit and try again.';
    } else if (!res.ok) {
      const resBody = (await res.json().catch(() => null)) as {
        message?: string | string[];
      } | null;
      const message = Array.isArray(resBody?.message)
        ? resBody.message.join('; ')
        : resBody?.message;
      errorMessage = message || `Request failed (${res.status})`;
    }
  } catch {
    errorMessage = 'Could not reach the server — please try again.';
  }
  if (errorMessage) {
    redirect(`${path}?error=${encodeURIComponent(errorMessage)}`);
  }
  revalidatePath(path);
}
