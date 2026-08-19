'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export type MemberOption = {
  id: number;
  firstName: string;
  lastName: string;
};

export type ChoreDefinition = {
  id: number;
  name: string;
  description: string | null;
  cadence: 'ONCE' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  active: boolean;
  assignee: MemberOption | null;
};

const FIELD = 'h-8 rounded-md border border-input bg-background px-2 text-sm';

export const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

/**
 * One chore, new or existing.
 *
 * The recurrence fields swap with the cadence rather than all being shown at
 * once: a weekly chore has no day of the month, and a form offering both
 * invites somebody to fill in the one that will be ignored.
 */
export function ChoreForm({
  action,
  members,
  chore,
  submitLabel,
}: {
  action: (formData: FormData) => void;
  members: MemberOption[];
  chore?: ChoreDefinition;
  submitLabel: string;
}) {
  const [cadence, setCadence] = useState(chore?.cadence ?? 'WEEKLY');

  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <label className="grid gap-1 text-xs text-muted-foreground">
        Chore
        <input
          name="name"
          required
          defaultValue={chore?.name ?? ''}
          placeholder="Restock the jump bag"
          className={`${FIELD} w-56`}
        />
      </label>
      <label className="grid gap-1 text-xs text-muted-foreground">
        Note (optional)
        <input
          name="description"
          defaultValue={chore?.description ?? ''}
          placeholder="Gauze, gloves, and the OPA kit"
          className={`${FIELD} w-64`}
        />
      </label>
      <label className="grid gap-1 text-xs text-muted-foreground">
        How often
        <select
          name="cadence"
          value={cadence}
          onChange={(event) =>
            setCadence(event.target.value as ChoreDefinition['cadence'])
          }
          className={FIELD}
        >
          <option value="DAILY">Every day</option>
          <option value="WEEKLY">Weekly</option>
          <option value="MONTHLY">Monthly</option>
          <option value="ONCE">Once</option>
        </select>
      </label>

      {cadence === 'WEEKLY' ? (
        <label className="grid gap-1 text-xs text-muted-foreground">
          On
          <select
            name="dayOfWeek"
            defaultValue={String(chore?.dayOfWeek ?? 0)}
            className={FIELD}
          >
            {WEEKDAYS.map((day, index) => (
              <option key={day} value={index}>
                {day}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {cadence === 'MONTHLY' ? (
        <label className="grid gap-1 text-xs text-muted-foreground">
          Day of the month
          <input
            name="dayOfMonth"
            type="number"
            min={1}
            max={31}
            defaultValue={chore?.dayOfMonth ?? 1}
            className={`${FIELD} w-24`}
          />
        </label>
      ) : null}

      {cadence === 'ONCE' && !chore ? (
        <label className="grid gap-1 text-xs text-muted-foreground">
          Due
          <input name="dueOn" type="date" required className={FIELD} />
        </label>
      ) : null}

      <label className="grid gap-1 text-xs text-muted-foreground">
        Whose job
        <select
          name="assigneeId"
          defaultValue={chore?.assignee ? String(chore.assignee.id) : ''}
          className={`${FIELD} w-48`}
        >
          {/* Unassigned is a real answer: whoever gets to it presses Done. */}
          <option value="">Anyone</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.lastName}, {member.firstName}
            </option>
          ))}
        </select>
      </label>

      <label className="flex h-8 items-center gap-1.5 text-xs text-muted-foreground">
        <input
          type="checkbox"
          name="active"
          defaultChecked={chore?.active ?? true}
          className="size-3.5"
        />
        In use
      </label>

      <Button type="submit" size="sm" variant={chore ? 'outline' : 'default'}>
        {submitLabel}
      </Button>
    </form>
  );
}
