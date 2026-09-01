import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/auth';

const API_URL = process.env.RAMPART_API_URL ?? 'http://localhost:3001';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(`API request failed with ${status}`);
  }
}

export interface ApiInit extends RequestInit {
  /**
   * Return the ApiError instead of redirecting on 401/403. Needed by the
   * dashboard itself, which would otherwise redirect to itself forever, and
   * by the nav shell, which renders for members the API will not talk to.
   */
  raw?: boolean;
}

/**
 * Who this call is really being made for.
 *
 * These requests leave this server, not the member's browser, so without
 * saying so every row in the API's log is attributed to the portal — which
 * is true, and useless. The member's own address is named in a header of the
 * API's choosing rather than folded into X-Forwarded-For, whose entries are
 * counted from the right and would land on the wrong one for this leg.
 *
 * Absent outside a request — a scheduled render, a build — and then nothing
 * is claimed rather than something invented.
 */
async function callerHeaders(): Promise<Record<string, string>> {
  try {
    const incoming = await headers();
    const forwarded = incoming.get('x-forwarded-for');
    const caller = forwarded?.split(',')[0]?.trim();
    const agent = incoming.get('user-agent');
    return {
      ...(caller ? { 'x-rampart-client-ip': caller } : {}),
      ...(agent ? { 'user-agent': agent } : {}),
    };
  } catch {
    return {};
  }
}

/**
 * Server-side fetch against the Rampart API, forwarding the caller's
 * Keycloak access token. Use from server components / route handlers only.
 *
 * A member who reaches a page they cannot use — by typing the URL, following
 * an old link, or losing a permission since the page was last open — is sent
 * back to their dashboard rather than shown a dead end. An expired session is
 * sent back through sign-in.
 */
export async function api<T>(
  path: string,
  init: ApiInit = {},
): Promise<T> {
  const { raw, ...requestInit } = init;
  const session = await auth();
  const res = await fetch(`${API_URL}${path}`, {
    ...requestInit,
    headers: {
      'Content-Type': 'application/json',
      ...(session?.accessToken
        ? { Authorization: `Bearer ${session.accessToken}` }
        : {}),
      ...(await callerHeaders()),
      ...requestInit.headers,
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    if (!raw) {
      // redirect() signals by throwing, so these return control immediately.
      if (res.status === 401) redirect('/api/auth/signin');
      if (res.status === 403) redirect('/?denied=1');
    }
    throw new ApiError(res.status, await res.json().catch(() => null));
  }
  return res.json() as Promise<T>;
}

/**
 * Multipart upload against the Rampart API. Separate from api() because fetch
 * must set its own Content-Type here — supplying one drops the multipart
 * boundary and the upload arrives unparseable.
 */
export async function apiUpload<T>(path: string, form: FormData): Promise<T> {
  const session = await auth();
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: {
      ...(session?.accessToken
        ? { Authorization: `Bearer ${session.accessToken}` }
        : {}),
      // Named like any other call, so an upload is attributable to whoever
      // made it rather than to this server.
      ...(await callerHeaders()),
    },
    body: form,
    cache: 'no-store',
  });
  if (!res.ok) {
    if (res.status === 401) redirect('/api/auth/signin');
    if (res.status === 403) redirect('/?denied=1');
    throw new ApiError(res.status, await res.json().catch(() => null));
  }
  return res.json() as Promise<T>;
}
