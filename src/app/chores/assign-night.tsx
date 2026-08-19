'use client';

import { assignNight } from './actions';

export type MemberOption = { id: number; firstName: string; lastName: string };

/**
 * Who has this particular night.
 *
 * Submits on change rather than behind a save button: it is one value, and a
 * row of unsaved dropdowns down a list is a good way to lose a change.
 */
export function AssignNight({
  occurrenceId,
  members,
  currentId,
  standing,
}: {
  occurrenceId: number;
  members: MemberOption[];
  /** The override, if one is set. */
  currentId: number | null;
  /** The chore's own assignee, shown as what "no override" means. */
  standing: MemberOption | null;
}) {
  return (
    <form action={assignNight.bind(null, occurrenceId)}>
      <select
        name="memberId"
        // Re-keyed on the saved value: an uncontrolled select keeps whatever
        // it was first rendered with, so after a hand-over it would go on
        // showing the previous name while the line beside it said otherwise.
        key={String(currentId ?? '')}
        defaultValue={currentId ? String(currentId) : ''}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        aria-label="Who has this night"
        className="h-8 w-40 rounded-md border border-input bg-background px-2 text-xs"
      >
        <option value="">
          {standing
            ? `${standing.firstName} ${standing.lastName} (usual)`
            : 'Anyone'}
        </option>
        {members.map((member) => (
          <option key={member.id} value={member.id}>
            {member.lastName}, {member.firstName}
          </option>
        ))}
      </select>
    </form>
  );
}
