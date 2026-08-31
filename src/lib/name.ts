/** Anything with a name on it, however much of one the caller happens to have. */
export interface Named {
  firstName: string;
  /** What they go by. Absent on payloads that predate it, and that is fine. */
  preferredFirstName?: string | null;
  lastName?: string;
}

/**
 * What to call somebody.
 *
 * The preferred name wherever there is one, because that is the point of
 * having the field: a member who has told us they go by Alex should be Alex
 * on the crew list, in the Slack post and on their own dashboard, not only
 * on the one page where they typed it.
 *
 * The legal name is still shown deliberately in the two places it is the
 * subject rather than a way of addressing somebody: their own profile and
 * their record in the roster, both of which display the field itself.
 */
export function firstNameOf(person: Named): string {
  return person.preferredFirstName?.trim() || person.firstName;
}

/** "Alex Rivera" — the usual way a name appears in a sentence or a list. */
export function displayName(person: Named): string {
  return [firstNameOf(person), person.lastName].filter(Boolean).join(' ');
}

/** "Rivera, Alex" — for lists that sort by surname. */
export function surnameFirst(person: Named): string {
  return person.lastName
    ? `${person.lastName}, ${firstNameOf(person)}`
    : firstNameOf(person);
}
