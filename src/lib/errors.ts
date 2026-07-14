import { ApiError } from '@/lib/api';

/** Best human-readable message out of an ApiError (NestJS error body). */
export function apiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const body = error.body as { message?: string | string[] } | null;
    const message = body?.message;
    if (Array.isArray(message)) return message.join('; ');
    if (typeof message === 'string') return message;
    return `Request failed (${error.status})`;
  }
  if (error instanceof Error) return error.message;
  return 'Something went wrong';
}
