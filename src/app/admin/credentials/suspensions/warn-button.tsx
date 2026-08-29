'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { warnPending, type WarnState } from './actions';

const OUTCOME_WORD: Record<string, string> = {
  sent: 'sent',
  failed: 'failed',
  'no-destination': 'nowhere to send',
  'not-requested': 'not chosen',
};

/**
 * Warns one person, or the whole list, and says what actually happened.
 *
 * The result is rendered here rather than carried through a redirect, because
 * what matters is per person and per channel: an inbox copy is always written,
 * so a bare "warned 5 people" would read as success even when the mail server
 * is down and nobody on the list has linked their Slack account.
 */
export function WarnButton({
  memberId,
  label,
}: {
  /** Null warns everybody currently at risk. */
  memberId: number | null;
  label: string;
}) {
  const [state, action, pending] = useActionState<WarnState, FormData>(
    warnPending.bind(null, memberId),
    null,
  );

  const summary = state?.ok?.summary;
  const trouble = summary
    ? summary.emailFailed +
      summary.emailNoAddress +
      summary.slackFailed +
      summary.slackNotLinked
    : 0;

  return (
    <div className="grid gap-2">
      <form action={action} className="flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-3 text-xs text-muted-foreground">
          <label className="flex items-center gap-1">
            <input type="checkbox" name="email" defaultChecked />
            Email
          </label>
          <label className="flex items-center gap-1">
            <input type="checkbox" name="slack" defaultChecked />
            Slack
          </label>
        </span>
        <Button type="submit" size="sm" variant="outline" className="h-7" disabled={pending}>
          {pending ? 'Sending…' : label}
        </Button>
      </form>

      {state?.error ? (
        <p className="text-xs text-destructive">{state.error}</p>
      ) : null}

      {summary ? (
        <div
          className={
            trouble
              ? 'rounded-md border border-amber-300 bg-amber-50 px-2 py-1.5 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200'
              : 'rounded-md border border-green-300 bg-green-50 px-2 py-1.5 text-xs text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-200'
          }
        >
          <p className="font-medium">
            {state?.ok?.notified} notified in Central
            {summary.emailSent ? ` · ${summary.emailSent} emailed` : ''}
            {summary.slackSent ? ` · ${summary.slackSent} messaged on Slack` : ''}
            {trouble ? '' : '. All delivered.'}
          </p>
          {/* Only the ones worth acting on. A clean send needs no list. */}
          {trouble ? (
            <ul className="mt-1 space-y-0.5">
              {state?.ok?.results
                .filter(
                  (row) =>
                    row.email === 'failed' ||
                    row.email === 'no-destination' ||
                    row.slack === 'failed' ||
                    row.slack === 'no-destination',
                )
                .map((row) => (
                  <li key={row.memberId}>
                    {row.memberName} — email {OUTCOME_WORD[row.email]}, Slack{' '}
                    {OUTCOME_WORD[row.slack]}
                  </li>
                ))}
            </ul>
          ) : null}
          {summary.slackNotLinked ? (
            <p className="mt-1">
              A Slack account has to be linked to a member before they can be
              messaged there.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
