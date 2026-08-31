'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

/**
 * Warns once about the details left blank, then sends anyway if the person
 * says so.
 *
 * The optional fields really are optional — somebody without a mobile should
 * still be able to ask — but a request with no phone number and no note takes
 * an email exchange to get anywhere, so it is worth one nudge. The same
 * shape as the coverage request form, for the same reason.
 */
export function SubmitWithCheck() {
  const [missing, setMissing] = useState<string[] | null>(null);

  const check = (event: React.MouseEvent<HTMLButtonElement>) => {
    const form = event.currentTarget.form;
    if (!form) return;
    // The browser handles the required fields; this is about the rest.
    if (!form.checkValidity()) return;
    if (missing) return; // already warned; this click is the confirmation

    const value = (name: string) =>
      (form.elements.namedItem(name) as HTMLInputElement | null)?.value?.trim() ??
      '';
    const gaps: string[] = [];
    if (!value('phone')) gaps.push('phone number');
    if (!value('note')) gaps.push('anything about yourself');

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
            You haven&apos;t given us your {missing.join(' or ')}. We can still
            take the request, but it saves an email or two if you add it now.
          </p>
          <p className="mt-1">Press send again to submit it as it is.</p>
        </div>
      ) : null}
      <Button type="submit" onClick={check} className="justify-self-start">
        {missing ? 'Send anyway' : 'Send request'}
      </Button>
    </div>
  );
}
