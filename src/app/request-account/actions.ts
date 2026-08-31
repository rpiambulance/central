'use server';

import { redirect } from 'next/navigation';
import { apiErrorMessage } from '@/lib/errors';

const API_URL = process.env.RAMPART_API_URL ?? 'http://localhost:3001';

/**
 * Asking for an account.
 *
 * Public, so this goes straight to the API rather than through the session
 * helper — there is no session. The invite code travels with it and the API
 * is what decides whether it is any good.
 */
/** Everything past the four that identify them, all of it skippable. */
const OPTIONAL = [
  'preferredFirstName',
  'personalEmail',
  'cellPhone',
  'homePhone',
  'localAddress',
  'homeAddress',
  'dob',
  'note',
] as const;

export async function requestAccount(formData: FormData) {
  const code = String(formData.get('inviteCode') ?? '').trim();
  const value = (name: string) => String(formData.get(name) ?? '').trim();
  let failure: string | null = null;
  try {
    const res = await fetch(`${API_URL}/v1/requests/account`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({
        inviteCode: code,
        firstName: value('firstName'),
        lastName: value('lastName'),
        email: value('email'),
        // Sent only when filled in: the API validates the shape of an
        // email or a date, and an empty string is neither.
        ...OPTIONAL.reduce<Record<string, string>>((carried, name) => {
          if (value(name)) carried[name] = value(name);
          return carried;
        }, {}),
      }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as {
        message?: string | string[];
      } | null;
      failure = Array.isArray(body?.message)
        ? body.message.join('; ')
        : (body?.message ?? `Request failed (${res.status})`);
    }
  } catch (error) {
    failure = apiErrorMessage(error);
  }
  if (failure) {
    redirect(
      `/request-account?invite-code=${encodeURIComponent(code)}&error=${encodeURIComponent(failure)}`,
    );
  }
  redirect('/request-account/thank-you');
}
