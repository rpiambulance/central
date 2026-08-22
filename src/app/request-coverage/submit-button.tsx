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
  const [unverified, setUnverified] = useState(false);

  const check = (event: React.MouseEvent<HTMLButtonElement>) => {
    const form = event.currentTarget.form;
    if (!form) return;

    // The browser handles genuinely required fields; this is about the rest.
    if (!form.checkValidity()) return;

    // The bot check, when there is one — a hidden field cannot be `required`,
    // and being told at the far end that a check you did not notice has not
    // been done is a poor way to find out. Absent when Turnstile is not
    // configured, in which case there is nothing to wait for.
    //
    // Queried rather than read off `form.elements`, which returns a
    // RadioNodeList — and an empty `value` — if the name is ever duplicated.
    // And ahead of the "submit anyway" shortcut below, or a token that expired
    // while the requester read the warning would sail straight past it.
    const turnstile = form.querySelector<HTMLInputElement>(
      'input[name="cf-turnstile-response"]',
    );
    if (turnstile && !turnstile.value) {
      event.preventDefault();
      setUnverified(true);
      return;
    }
    setUnverified(false);

    if (missing) return; // already warned; this click is the confirmation

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
      {unverified ? (
        <div
          role="alert"
          className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
        >
          Please complete the &ldquo;I am human&rdquo; check just above, then
          submit again.
        </div>
      ) : null}
      <Button type="submit" onClick={check} className="justify-self-start">
        {missing ? 'Submit anyway' : 'Submit request'}
      </Button>
    </div>
  );
}
