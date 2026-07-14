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

/**
 * Server-side fetch against the Rampart API, forwarding the caller's
 * Keycloak access token. Use from server components / route handlers only.
 */
export async function api<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const session = await auth();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(session?.accessToken
        ? { Authorization: `Bearer ${session.accessToken}` }
        : {}),
      ...init.headers,
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new ApiError(res.status, await res.json().catch(() => null));
  }
  return res.json() as Promise<T>;
}
