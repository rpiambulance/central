'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { createMember, type CreateState } from './actions';

const FIELD = 'h-8 rounded-md border border-input bg-background px-2 text-sm';

/**
 * Adding a member, with one question asked before a second Casey Reilly.
 *
 * A matching name raises a warning naming who it clashes with and turns the
 * button into a confirmation — pressed twice on purpose is a decision, and
 * the form keeps everything typed so the second press costs nothing. A
 * matching address is not offered as a choice at all: it comes back as an
 * ordinary error, because two members cannot share one and be signed into.
 */
export function AddMemberForm() {
  const [state, action, pending] = useActionState<CreateState, FormData>(
    createMember,
    null,
  );
  const clash = state?.duplicateName;

  return (
    <form action={action} className="grid gap-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="grid gap-1 text-xs text-muted-foreground">
          First name
          <input type="text" name="firstName" required className={`${FIELD} w-36`} />
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Last name
          <input type="text" name="lastName" required className={`${FIELD} w-36`} />
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Email
          <input type="email" name="email" required className={`${FIELD} w-56`} />
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Date of birth (optional)
          <input type="date" name="dob" className={FIELD} />
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          RCS ID (optional)
          <input type="text" name="rcsId" className={`${FIELD} w-28`} />
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          RIN (optional)
          <input type="text" name="rin" className={`${FIELD} w-28`} />
        </label>
        {/* Carries the answer to the warning, and only when there is one. */}
        {clash ? (
          <input type="hidden" name="confirmDuplicateName" value="yes" />
        ) : null}
        <Button type="submit" size="sm" disabled={pending}>
          {pending
            ? 'Adding…'
            : clash
              ? 'Add anyway'
              : 'Create member'}
        </Button>
      </div>

      {clash ? (
        <div
          role="alert"
          className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
        >
          <p className="font-medium">{clash.message}</p>
          <ul className="mt-1 space-y-0.5 text-xs">
            {clash.existing.map((member) => (
              <li key={member.id}>
                <Link
                  href={`/admin/members/${member.id}`}
                  className="underline underline-offset-2"
                >
                  {member.firstName} {member.lastName}
                </Link>
                {member.email ? ` — ${member.email}` : ''}
                {member.active === false ? ' (inactive)' : ''}
              </li>
            ))}
          </ul>
          <p className="mt-1 text-xs">
            If that is the same person, edit their record instead. If it is a
            different person, press Add anyway.
          </p>
        </div>
      ) : null}

      {state?.error ? (
        <p className="rounded-md border border-destructive/40 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      {state?.added === 'nologin' ? (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          Member added, but no sign-in account was created — the portal is not
          configured to make them. They cannot log in until somebody creates
          one; their record links itself on their first login.
        </p>
      ) : null}
      {state?.added === 'ok' ? (
        <p className="rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
          Member added, and emailed a link to set their password.
        </p>
      ) : null}
    </form>
  );
}
