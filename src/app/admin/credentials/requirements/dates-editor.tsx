'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { requirementImpact, setRequirementDates } from './actions';
import { DateFields, type Dated } from './date-fields';

type Impact = Awaited<ReturnType<typeof requirementImpact>>;

/** Today in New York, as the API dates things. */
const today = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

/**
 * A requirement's dates, with who they would catch shown before saving.
 *
 * Changing when a requirement applies is the edit that suspends people, so
 * opening the editor asks the API who falls short on the day it would take
 * effect. The preview is of the dates as saved: save, reopen, and it is of
 * the new ones.
 */
export function DatesEditor({
  requirementId,
  dates,
  ongoing,
  className,
}: {
  requirementId: number;
  dates: Dated;
  /** Only an ongoing requirement suspends anybody. */
  ongoing: boolean;
  className: string;
}) {
  const [impact, setImpact] = useState<Impact | null>(null);
  const [loading, startLoading] = useTransition();

  return (
    <details
      className="text-sm"
      onToggle={(event) => {
        if (!event.currentTarget.open || impact || !ongoing) return;
        startLoading(async () => {
          try {
            setImpact(await requirementImpact(requirementId));
          } catch {
            setImpact(null);
          }
        });
      }}
    >
      <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
        edit dates
      </summary>
      <form
        action={setRequirementDates.bind(null, requirementId)}
        className="mt-2 flex flex-wrap items-end gap-2"
      >
        <DateFields dates={dates} className={className} />
        <Button type="submit" size="sm" variant="outline">
          Save dates
        </Button>
      </form>
      {!ongoing ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Checked at promotion only, so it suspends nobody. Admin decides
          whether it is ongoing.
        </p>
      ) : loading ? (
        <p className="mt-2 text-xs text-muted-foreground">Checking who this affects…</p>
      ) : impact && impact.members.length ? (
        <div className="mt-2 grid gap-1 rounded border border-destructive/40 p-2">
          <p className="text-xs font-medium text-destructive">
            {impact.asOf > today() ? `On ${impact.asOf}` : 'Today'}, as saved, this
            would suspend {impact.members.length}{' '}
            {impact.members.length === 1 ? 'member' : 'members'}:
          </p>
          <ul className="max-h-32 overflow-auto text-xs text-muted-foreground">
            {impact.members.map((member) => (
              <li key={member.id}>
                {member.name} — {member.reason}
              </li>
            ))}
          </ul>
        </div>
      ) : impact ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Everybody it reaches meets it as saved, so it suspends nobody
          {impact.asOf > today() ? ` on ${impact.asOf}` : ' today'}.
        </p>
      ) : null}
    </details>
  );
}
