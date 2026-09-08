'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/errors';

const PAGE = '/call-ops/dispatches';

/** The fields worth typing when writing up a call the feed never delivered. */
const FIELDS = [
  'determinant',
  'complaint',
  'location',
  'business',
  'crossStreets',
  'units',
  'additionalInfo',
] as const;

/**
 * Adding a dispatch by hand.
 *
 * The time is submitted as a local datetime — somebody writing up a call at
 * breakfast means the hour they were woken, in New York, not UTC — so it is
 * sent with the browser's offset attached rather than as a bare wall clock
 * the API would have to guess at.
 */
export async function addDispatch(formData: FormData) {
  const value = (name: string) => String(formData.get(name) ?? '').trim();
  const receivedAt = value('receivedAt');
  const offset = value('offset');

  if (!value('complaint') && !value('location')) {
    redirect(
      `${PAGE}?error=${encodeURIComponent('Give at least a call type or a location.')}`,
    );
  }
  try {
    await api('/v1/dispatches', {
      method: 'POST',
      body: JSON.stringify({
        ...FIELDS.reduce<Record<string, string>>((carried, name) => {
          if (value(name)) carried[name] = value(name);
          return carried;
        }, {}),
        ...(receivedAt ? { receivedAt: `${receivedAt}:00${offset}` } : {}),
      }),
    });
  } catch (error) {
    redirect(`${PAGE}?error=${encodeURIComponent(apiErrorMessage(error))}`);
  }
  revalidatePath(PAGE);
  redirect(`${PAGE}?added=1`);
}
