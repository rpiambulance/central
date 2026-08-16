'use server';

import { redirect } from 'next/navigation';
import { api } from '@/lib/api';

const VIEWS = ['list', 'day', 'week', 'month'];

/**
 * Switches the events view and remembers it, so the tab you last chose is the
 * one you land on next time.
 *
 * This is a form action rather than a link because Next prefetches links —
 * hovering a tab would otherwise quietly change your saved default.
 */
export async function setEventView(formData: FormData) {
  const view = String(formData.get('view') ?? 'list');
  const date = String(formData.get('date') ?? '');
  if (!VIEWS.includes(view)) redirect('/events');

  try {
    await api('/v1/members/me', {
      method: 'PATCH',
      body: JSON.stringify({ eventView: view }),
    });
  } catch {
    // Remembering the choice is a convenience; never block the switch on it.
  }

  // redirect() signals by throwing, so it has to sit outside the try above.
  redirect(
    view === 'list'
      ? '/events'
      : `/events?view=${view}${date ? `&date=${encodeURIComponent(date)}` : ''}`,
  );
}
