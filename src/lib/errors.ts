import { unstable_rethrow } from 'next/navigation';
import { ApiError } from '@/lib/api';

/**
 * Best human-readable message out of an ApiError (NestJS error body).
 *
 * Next signals redirect(), notFound() and friends by throwing, so those land
 * in the same catch blocks as real failures. Rethrowing them first keeps a
 * control-flow signal from being rendered as the error message — which is how
 * a redirect out of the API client surfaced to members as "NEXT_REDIRECT".
 */
export function apiErrorMessage(error: unknown): string {
  unstable_rethrow(error);
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
