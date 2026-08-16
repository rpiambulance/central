import { formatCredKey } from './format';

/**
 * Display summary for a member's credential set: the highest credential per
 * side of the CC/driver tree — unless they're a Duty Supervisor, which
 * supersedes everything. Add-ons (FR-CC, EES) are appended since they sit
 * outside the two tracks. Spec §4.2 ladder.
 */
const DRIVER_TRACK = ['A_D', 'P_D', 'D', 'D_T'];
const CC_TRACK = ['A_CC', 'P_CC', 'CC', 'CC_T'];
const BASE = ['O', 'A'];
const ADD_ONS = ['FR_CC', 'EES'];

export interface CredentialLike {
  type: { key: string; name?: string };
  title?: string | null;
}

export interface CredentialBadge {
  key: string;
  label: string; // dashed abbreviation (or SDS)
  tooltip: string;
}

function highest(keys: Set<string>, track: string[]): string | undefined {
  return [...track].reverse().find((key) => keys.has(key));
}

export function summarizeCredentials(
  credentials: CredentialLike[],
): CredentialBadge[] {
  const byKey = new Map(credentials.map((c) => [c.type.key, c]));
  const keys = new Set(byKey.keys());

  const ds = byKey.get('DS');
  if (ds) {
    const senior = !!ds.title;
    return [
      {
        key: 'DS',
        label: senior ? 'SDS' : 'DS',
        tooltip: ds.title ?? ds.type.name ?? 'Duty Supervisor',
      },
    ];
  }

  const badges: CredentialBadge[] = [];
  for (const track of [CC_TRACK, DRIVER_TRACK]) {
    const top = highest(keys, track);
    if (top) {
      badges.push({
        key: top,
        label: formatCredKey(top),
        tooltip: byKey.get(top)?.type.name ?? formatCredKey(top),
      });
    }
  }
  if (!badges.length) {
    const top = highest(keys, BASE);
    if (top) {
      badges.push({
        key: top,
        label: formatCredKey(top),
        tooltip: byKey.get(top)?.type.name ?? formatCredKey(top),
      });
    }
  }
  for (const addOn of ADD_ONS) {
    if (keys.has(addOn)) {
      badges.push({
        key: addOn,
        label: formatCredKey(addOn),
        tooltip: byKey.get(addOn)?.type.name ?? formatCredKey(addOn),
      });
    }
  }
  return badges;
}

/**
 * Client-side view of the credential ladder, mirroring the API's graph so a
 * roster filter can answer "who can crew chief?" rather than only "who holds
 * exactly CC". Keyed by credential: the set of credentials that satisfy it.
 */
export interface LadderType {
  key: string;
  outranksAll?: boolean;
  prerequisites?: Array<{ requiresType: { key: string } }>;
}

export function buildSatisfiedBy(
  types: LadderType[],
): Map<string, Set<string>> {
  const parents = new Map<string, string[]>(
    types.map((t) => [
      t.key,
      (t.prerequisites ?? []).map((p) => p.requiresType.key),
    ]),
  );

  const ancestorsOf = new Map<string, Set<string>>();
  const resolve = (key: string): Set<string> => {
    const memo = ancestorsOf.get(key);
    if (memo) return memo;
    const out = new Set<string>();
    ancestorsOf.set(key, out); // placeholder guards against cycles
    for (const parent of parents.get(key) ?? []) {
      out.add(parent);
      for (const ancestor of resolve(parent)) out.add(ancestor);
    }
    return out;
  };

  const satisfiedBy = new Map<string, Set<string>>();
  for (const t of types) satisfiedBy.set(t.key, new Set([t.key]));
  for (const t of types) {
    for (const ancestor of resolve(t.key)) satisfiedBy.get(ancestor)?.add(t.key);
  }
  // A Duty Supervisor satisfies everything, including add-ons it does not
  // descend from.
  for (const t of types.filter((type) => type.outranksAll)) {
    for (const satisfying of satisfiedBy.values()) satisfying.add(t.key);
  }
  return satisfiedBy;
}
