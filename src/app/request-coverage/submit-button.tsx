'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

/**
 * Warns once about details left blank, then submits anyway if the requester
 * says so. The optional fields genuinely are optional — someone who does not
 * yet know a date or a venue should still be able to ask — but a request
 * missing them takes an email exchange to resolve, so it is worth a nudge.
 */
export function SubmitWithCheck() {
  const [missing, setMissing] = useState<string[] | null>(null);

  const check = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (missing) return; // already warned; this click is the confirmation

    const form = event.currentTarget.form;
    if (!form) return;

    // The browser handles genuinely required fields; this is about the rest.
    if (!form.checkValidity()) return;

    const value = (name: string) =>
      (form.elements.namedItem(name) as HTMLInputElement | null)?.value?.trim() ??
      '';
    const gaps: string[] = [];
    if (!value('requesterOrg')) gaps.push('organization');
    if (!value('requesterPhone')) gaps.push('phone number');

    const dates = form.querySelectorAll<HTMLInputElement>(
      'input[name^="event-date-"]',
    );
    const locations = form.querySelectorAll<HTMLInputElement>(
      'input[name^="event-location-"]',
    );
    if ([...dates].some((input) => !input.value.trim())) gaps.push('event date');
    if ([...locations].some((input) => !input.value.trim())) {
      gaps.push('event location');
    }

    if (gaps.length) {
      event.preventDefault();
      setMissing(gaps);
    }
  };

  return (
    <div className="grid gap-2">
      {missing ? (
        <div
          role="alert"
          className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
        >
          <p className="font-medium">Heads up!</p>
          <p>
            You haven&apos;t filled in the {missing.join(', ')}. We can still
            take the request, but it saves an email or two if you have the
            details now.
          </p>
          <p className="mt-1">
            Press submit again to send it as it is.
          </p>
        </div>
      ) : null}
      <Button type="submit" onClick={check} className="justify-self-start">
        {missing ? 'Submit anyway' : 'Submit request'}
      </Button>
    </div>
  );
}
