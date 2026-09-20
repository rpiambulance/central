'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { displayName, searchableNames } from '@/lib/name';
import { send } from '@/lib/offline-queue';
import { EncounterCard } from './encounter-card';
import { Paperwork } from './paperwork';
import { Picker } from './picker';
import { QuickActionsFab } from './quick-actions-fab';
import { QuickDialogs, type QuickAction } from './quick-dialogs';
import { StandbyActions } from './standby-actions';
import { StandbyNavbar } from './standby-navbar';
import { Timeline } from './timeline';
import {
  ROLE_LABEL,
  STATUS_LABEL,
  type Config,
  type Personnel,
  personnelName,
  type Person,
  type Standby,
  type TimelineEntry,
  type Unit,
} from './types';

const STATUSES: Unit['status'][] = [
  'AVAILABLE',
  'ASSIGNED',
  'AT_PATIENT',
  'TRANSPORTING',
  'OUT_OF_SERVICE',
];

const STATUS_TONE: Record<Unit['status'], string> = {
  AVAILABLE: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200',
  ASSIGNED: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
  AT_PATIENT: 'bg-amber-200 text-amber-950 dark:bg-amber-900 dark:text-amber-100',
  TRANSPORTING: 'bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200',
  OUT_OF_SERVICE: 'bg-muted text-muted-foreground',
};

const FIELD = 'h-8 rounded-md border border-input bg-background px-2 text-sm';

/**
 * The board.
 *
 * Units first and largest, because that is what a supervisor looks at: who
 * is where, and who is on them. Everything else — the people not on a unit,
 * the encounters, the numbers — hangs underneath.
 *
 * Every write goes through the queue and the board is updated from what was
 * typed rather than from the response, so a tap does something visible even
 * when the connection has gone. The server is the authority on the next
 * load; in between, what somebody just did is the best answer available.
 */
export function Board({
  initial,
  config,
  timeline,
  hour12,
}: {
  initial: Standby;
  config: Config;
  timeline: TimelineEntry[];
  hour12: boolean;
}) {
  const router = useRouter();
  const [standby, setStandby] = useState(initial);
  const [busy, setBusy] = useState(false);
  // Which quick action is open over the board, if any.
  const [quick, setQuick] = useState<QuickAction | null>(null);

  // The server is authoritative once it has answered. Without this the board
  // kept whatever it started with, so anything added — an encounter, a unit,
  // somebody arriving — only appeared after a manual reload. An optimistic
  // change survives until the refresh it triggered comes back, which is the
  // point: it is showing what was typed while the round trip happens.
  const [fromServer, setFromServer] = useState(initial);
  if (fromServer !== initial) {
    setFromServer(initial);
    setStandby(initial);
  }
  // The spots inside the standby's own place when it has any. A standby
  // opened for an ad-hoc event may name no place at all, and then every
  // spot the agency knows about is a better offer than an empty list —
  // and anything typed is accepted regardless, because somewhere nobody
  // set up is still somewhere.
  const locations = standby.place?.spots?.length
    ? standby.place.spots
    : config.places.flatMap((place) =>
        place.spots.map((spot) => ({
          ...spot,
          name: `${place.name} — ${spot.name}`,
        })),
      );

  const write = useCallback(
    async (
      method: 'POST' | 'PATCH' | 'DELETE',
      path: string,
      body: unknown,
      label: string,
    ) => {
      setBusy(true);
      try {
        const res = await send({
          url: '/standbys/relay',
          method: 'POST',
          body: { method, path, body },
          label,
        });
        // Queued: the board already shows what was typed, and the refresh
        // would only overwrite it with what the server has not heard yet.
        if (res && res.ok) router.refresh();
        return res;
      } finally {
        setBusy(false);
      }
    },
    [router],
  );

  const base = `/v1/standbys/${standby.id}`;

  // Everybody else's writes, as they happen. A standby is worked by several
  // people at once — a crew chief at a gate, a supervisor at the aid
  // station, somebody at the desk — and each of them used to see only their
  // own until they reloaded. The event says the standby moved and nothing
  // more, so the answer is always to ask the server rather than to patch
  // something in from a payload that could be a version behind.
  const nudge = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const source = new EventSource(`/standbys/${standby.id}/stream`);
    const refresh = () => {
      // One write is often several events — a unit created, then crewed —
      // and a reload for each would be three round trips to say one thing.
      if (nudge.current) clearTimeout(nudge.current);
      nudge.current = setTimeout(() => router.refresh(), 250);
    };
    source.onmessage = refresh;
    return () => {
      source.close();
      if (nudge.current) clearTimeout(nudge.current);
    };
  }, [standby.id, router]);

  const setUnit = (unit: Unit, patch: Partial<Unit> & Record<string, unknown>) => {
    setStandby((s) => ({
      ...s,
      units: s.units.map((u) => (u.id === unit.id ? { ...u, ...patch } : u)),
    }));
  };

  const onDuty = standby.personnel.filter((p) => !p.removedAt);
  const unassigned = onDuty.filter(
    (p) => !p.assignments.some((a) => !a.removedAt),
  );
  const liveUnits = standby.units.filter((u) => !u.retiredAt);

  return (
    <>
      <StandbyNavbar />
      {standby.viewer.mayManage ? (
        <>
          <QuickActionsFab onPick={setQuick} disabled={!!standby.closedAt} />
          <QuickDialogs
            action={quick}
            onClose={() => setQuick(null)}
            roster={config.members}
            already={standby.personnel
              .map((p) => p.member?.id)
              .filter((id): id is number => id !== undefined)}
            designators={config.designators}
            units={liveUnits}
            locations={locations}
            onAddPerson={(who, role) =>
              void write(
                'POST',
                `${base}/personnel`,
                { ...who, role },
                'added to the standby',
              )
            }
            onAddUnit={(body) =>
              void write('POST', `${base}/units`, body, 'new unit')
            }
            onOpenEncounter={(body) =>
              void write('POST', `${base}/encounters`, body, 'new encounter')
            }
            onNote={(text) =>
              void write('POST', `${base}/notes`, { text }, 'note')
            }
          />
        </>
      ) : null}
      <div className="space-y-6">
        {/* ------------------------------------------------------- the units */}
        <section className="space-y-2" id="units">
        <div className="flex flex-wrap items-baseline gap-3">
          <h2 className="text-lg font-medium tracking-tight">Units</h2>
          {standby.viewer.mayManage && !standby.closedAt ? (
            <AddUnit
              designators={config.designators}
              onAdd={(body) => write('POST', `${base}/units`, body, 'new unit')}
            />
          ) : null}
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {liveUnits.map((unit) => {
            const crew = unit.assignments.filter((a) => !a.removedAt);
            return (
              <div key={unit.id} className="rounded-md border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-base font-semibold">{unit.name}</span>
                  <Badge className={`ml-auto ${STATUS_TONE[unit.status]}`} variant="secondary">
                    {STATUS_LABEL[unit.status]}
                  </Badge>
                </div>

                <p className="mt-1 text-xs text-muted-foreground">
                  {unit.currentLocation?.name ?? unit.currentLocationText ?? 'no location'}
                  {unit.stagingLocation || unit.stagingLocationText
                    ? ` · staging ${unit.stagingLocation?.name ?? unit.stagingLocationText}`
                    : ''}
                </p>

                <ul className="mt-2 space-y-0.5 text-sm">
                  {crew.length ? (
                    crew.map((a) => (
                      <li key={a.id} className="flex items-center gap-2">
                        <span>{personnelName(a.personnel)}</span>
                        {a.position ? (
                          <span className="text-xs text-muted-foreground">{a.position}</span>
                        ) : null}
                        {standby.viewer.mayManage && !standby.closedAt ? (
                          <button
                            type="button"
                            className="ml-auto text-xs text-muted-foreground underline-offset-2 hover:underline"
                            onClick={() => {
                              setUnit(unit, {
                                assignments: unit.assignments.map((x) =>
                                  x.id === a.id
                                    ? { ...x, removedAt: new Date().toISOString() }
                                    : x,
                                ),
                              });
                              void write(
                                'DELETE',
                                `${base}/crew/${a.id}`,
                                undefined,
                                `take ${personnelName(a.personnel)} off ${unit.name}`,
                              );
                            }}
                          >
                            off
                          </button>
                        ) : null}
                      </li>
                    ))
                  ) : (
                    <li className="text-xs text-muted-foreground">No crew</li>
                  )}
                </ul>

                {standby.viewer.mayManage && !standby.closedAt ? (
                  <div className="mt-3 grid gap-2">
                    <div className="flex flex-wrap gap-1">
                      {STATUSES.map((status) => (
                        <button
                          key={status}
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            setUnit(unit, { status });
                            void write(
                              'PATCH',
                              `${base}/units/${unit.id}`,
                              { status },
                              `${unit.name} → ${STATUS_LABEL[status]}`,
                            );
                          }}
                          className={`rounded-md border px-2 py-0.5 text-xs ${
                            unit.status === status ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                          }`}
                        >
                          {STATUS_LABEL[status]}
                        </button>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Picker
                        className="flex-1"
                        placeholder="Where is it…"
                        allowFreeText
                        choices={locations.map((l) => ({
                          id: l.id,
                          label: l.name,
                        }))}
                        value={
                          unit.currentLocation?.name ??
                          unit.currentLocationText ??
                          ''
                        }
                        onPick={({ id, text }) => {
                          const found = locations.find((l) => l.id === id) ?? null;
                          setUnit(unit, {
                            currentLocation: found,
                            currentLocationText: found ? null : text || null,
                          });
                          void write(
                            'PATCH',
                            `${base}/units/${unit.id}`,
                            {
                              currentLocationId: id,
                              currentLocationText: found ? null : text || null,
                            },
                            `${unit.name} to ${found?.name ?? (text || 'nowhere')}`,
                          );
                        }}
                      />
                      <AssignCrew
                        people={onDuty}
                        roster={config.members}
                        onAdd={(memberId) =>
                          write(
                            'POST',
                            `${base}/personnel`,
                            { memberId, role: 'CREW' },
                            'added to the standby',
                          )
                        }
                        unit={unit}
                        onAssign={(personnelId, position) => {
                          const person = onDuty.find((p) => p.id === personnelId);
                          if (person) {
                            setUnit(unit, {
                              assignments: [
                                ...unit.assignments,
                                {
                                  id: -Date.now(),
                                  position: position ?? null,
                                  removedAt: null,
                                  personnel: {
                                    id: person.id,
                                    member: person.member,
                                    name: person.name,
                                  },
                                },
                              ],
                            });
                          }
                          void write(
                            'POST',
                            `${base}/units/${unit.id}/crew`,
                            { personnelId, position },
                            `crew on ${unit.name}`,
                          );
                        }}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
          {!liveUnits.length ? (
            <p className="text-sm text-muted-foreground">No units yet.</p>
          ) : null}
        </div>
      </section>

      {/* --------------------------------------------------- the encounters */}
      <section className="space-y-2" id="encounters">
        <div className="flex flex-wrap items-baseline gap-3">
          <h2 className="text-lg font-medium tracking-tight">Encounters</h2>
          {!standby.closedAt ? (
            <Button
              size="sm"
              disabled={busy}
              onClick={async () => {
                const res = await write('POST', `${base}/encounters`, {}, 'new encounter');
                if (res?.ok) router.refresh();
              }}
            >
              New encounter
            </Button>
          ) : null}
          <span className="text-sm text-muted-foreground">
            {standby.counts.totalTreated} treated · {standby.counts.transports} transported
          </span>
        </div>

        {standby.encounters.length ? (
          <div className="grid gap-3">
            {standby.encounters.map((encounter) => (
              <EncounterCard
                key={encounter.id}
                encounter={encounter}
                standbyId={standby.id}
                units={liveUnits}
                locations={locations}
                hospitals={config.hospitals}
                hour12={hour12}
                readOnly={!!standby.closedAt}
                mayDelete={standby.viewer.mayDelete}
                actions={config.actions}
                // The timeline is the record; the card shows the part of it
                // that is about this encounter, so a crew chief reads one
                // thing rather than hunting a shared list for their own.
                marks={timeline.filter(
                  (entry) =>
                    entry.encounterId === encounter.id &&
                    (entry.kind === 'encounter.note' ||
                      entry.kind === 'encounter.action'),
                )}
                onWrite={write}
                onDeleted={() =>
                  setStandby((s) => ({
                    ...s,
                    encounters: s.encounters.filter((e) => e.id !== encounter.id),
                  }))
                }
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Nothing yet. {standby.viewer.mayReadAll ? '' : 'You see only what you write up.'}
          </p>
        )}
      </section>

      {/* ---------------------------------------------------- the people */}
      <section className="space-y-2" id="personnel">
        <h2 className="text-lg font-medium tracking-tight">
          On the standby{' '}
          <span className="text-sm font-normal text-muted-foreground">
            {onDuty.length} here{unassigned.length ? `, ${unassigned.length} not on a unit` : ''}
          </span>
        </h2>
        {/* People turn up who never signed up, and a standby opened for
            something nobody planned starts empty. */}
        {standby.viewer.mayManage && !standby.closedAt ? (
          <AddPerson
            roster={config.members}
            already={standby.personnel
              .map((p) => p.member?.id)
              .filter((id): id is number => id !== undefined)}
            onAdd={(who, role) =>
              write(
                'POST',
                `${base}/personnel`,
                { ...who, role },
                'added to the standby',
              )
            }
          />
        ) : null}
        <div className="rounded-md border divide-y">
          {standby.personnel.map((person) => (
            <PersonRow
              key={person.id}
              person={person}
              units={standby.units}
              manage={standby.viewer.mayManage && !standby.closedAt}
              onRole={(role) => {
                setStandby((s) => ({
                  ...s,
                  personnel: s.personnel.map((p) =>
                    p.id === person.id
                      ? { ...p, role }
                      : role === 'EES_IC' && p.role === 'EES_IC'
                        ? { ...p, role: 'EES' }
                        : p,
                  ),
                }));
                void write(
                  'PATCH',
                  `${base}/personnel/${person.id}`,
                  { role },
                  `${personnelName(person)} → ${ROLE_LABEL[role]}`,
                );
              }}
              onRemove={() => {
                setStandby((s) => ({
                  ...s,
                  personnel: s.personnel.map((p) =>
                    p.id === person.id ? { ...p, removedAt: new Date().toISOString() } : p,
                  ),
                }));
                void write(
                  'DELETE',
                  `${base}/personnel/${person.id}`,
                  undefined,
                  `${personnelName(person)} left`,
                );
              }}
            />
          ))}
        </div>
      </section>

      {/* ------------------------------------------------ what has happened */}
      <section id="timeline">
        <Timeline
          entries={timeline}
          hour12={hour12}
          onNote={
            standby.closedAt
              ? undefined
              : (text) => write('POST', `${base}/notes`, { text }, 'note')
          }
        />
      </section>

      {/* ------------------------------------------------- finishing with it */}
      {standby.viewer.mayManage ? (
        <StandbyActions
          standbyId={standby.id}
          closed={!!standby.closedAt}
          encounters={standby.encounters.length}
          mayDelete={standby.viewer.mayDelete}
          onWrite={write}
        />
      ) : null}

      {/* -------------------------------------------------------- the totals */}
      <section className="space-y-2" id="forms">
        <h2 className="text-lg font-medium tracking-tight">For the forms</h2>
        <div className="grid grid-cols-2 gap-3 rounded-md border p-3 sm:grid-cols-4">
          {(
            [
              ['Minor injury', standby.counts.minorInjury],
              ['Major injury', standby.counts.majorInjury],
              ['Minor illness', standby.counts.minorIllness],
              ['Major illness', standby.counts.majorIllness],
              ['Deaths', standby.counts.deaths],
              ['Intoxication', standby.counts.intoxication],
              ['Transported', standby.counts.transports],
              ['Total treated', standby.counts.totalTreated],
            ] as const
          ).map(([label, value]) => (
            <div key={label}>
              <p className="text-2xl font-semibold tabular-nums">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
        {/* The counts above are worked out from the encounters. These are
            not knowable from anything on the board, and the state form asks
            for them, so they are asked for here — before the copies that
            would otherwise print them blank. */}
        <Paperwork
          standby={standby}
          mayManage={standby.viewer.mayManage}
          onSave={(patch) => write('PATCH', base, patch, 'the form details')}
        />

        {standby.viewer.mayReadAll ? (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">
              Take a copy{' '}
              <span className="font-normal text-muted-foreground">
                — each opens in a new tab
              </span>
            </h3>
            <div className="flex flex-wrap gap-2">
            {(
              [
                ['Event report', `${base}/export/event.pdf`],
                ['Event report with detail', `${base}/export/event.pdf?detail=1`],
                ['DOH-2332', `${base}/export/doh-2332.pdf`],
                ['DOH-2342', `${base}/export/doh-2342.pdf`],
              ] as const
            ).map(([label, href]) => (
              // A new tab, because the board is being worked: somebody
              // taking a copy of the forms should come back to the standby
              // as they left it rather than to a reload of it. Said on the
              // link as well as in the heading, because a link that moves
              // the page and one that does not should not look alike.
              <a
                key={label}
                href={`/standbys/${standby.id}/export?to=${encodeURIComponent(href)}`}
                target="_blank"
                rel="noopener"
                className="flex items-center gap-1.5 rounded-md border px-3 py-1 text-sm hover:bg-muted"
              >
                {label}
                <ExternalLink className="size-3.5 text-muted-foreground" aria-hidden />
              </a>
            ))}
            </div>
          </div>
        ) : null}
      </section>
      </div>
    </>
  );
}

/** Naming somebody who is here, whether or not they signed up. */
/**
 * Naming somebody who is here.
 *
 * Usually a member, picked from the roster. Sometimes not — mutual aid, a
 * visiting crew, an EMT who turned up with the fire department — and then
 * the name typed into the box is the whole of what we know about them, so
 * the box takes it as an answer rather than putting it back.
 */
function AddPerson({
  roster,
  already,
  onAdd,
}: {
  roster: Person[];
  already: number[];
  onAdd: (
    who: { memberId?: number; name?: string },
    role: Personnel['role'],
  ) => void;
}) {
  const [memberId, setMemberId] = useState<number | null>(null);
  const [written, setWritten] = useState('');
  const [role, setRole] = useState<Personnel['role']>('CREW');
  const here = new Set(already);
  const choices = roster
    .filter((member) => !here.has(member.id))
    .map((member) => ({
      id: member.id,
      label: displayName(member),
      aliases: searchableNames(member),
    }));

  return (
    <div className="flex flex-wrap gap-1">
      <Picker
        className="w-56"
        placeholder="Who else is here…"
        choices={choices}
        // What was picked stays in the box: pressing Add against a box that
        // still reads "Who else is here…" is a guess about what it will do.
        value={
          choices.find((choice) => choice.id === memberId)?.label ?? written
        }
        allowFreeText
        onPick={({ id, text }) => {
          setMemberId(id);
          setWritten(id ? '' : text);
        }}
      />
      <select
        value={role}
        onChange={(e) => setRole(e.target.value as Personnel['role'])}
        className={FIELD}
      >
        {(['CREW', 'EES', 'EES_IC', 'SUPPORT'] as const).map((option) => (
          <option key={option} value={option}>
            {ROLE_LABEL[option]}
          </option>
        ))}
      </select>
      <Button
        size="sm"
        disabled={!memberId && !written.trim()}
        onClick={() => {
          if (memberId) onAdd({ memberId }, role);
          else if (written.trim()) onAdd({ name: written.trim() }, role);
          setMemberId(null);
          setWritten('');
        }}
      >
        Add
      </Button>
    </div>
  );
}

function PersonRow({
  person,
  units,
  manage,
  onRole,
  onRemove,
}: {
  person: Personnel;
  units: Unit[];
  manage: boolean;
  onRole: (role: Personnel['role']) => void;
  onRemove: () => void;
}) {
  const on = person.assignments
    .filter((a) => !a.removedAt)
    .map((a) => units.find((u) => u.id === a.unitId)?.name)
    .filter(Boolean);

  return (
    <div className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
      <span className={person.removedAt ? 'text-muted-foreground line-through' : ''}>
        {personnelName(person)}
      </span>
      {on.length ? (
        <span className="text-xs text-muted-foreground">{on.join(', ')}</span>
      ) : null}
      {!person.fromSignup ? (
        <Badge variant="outline" className="text-[10px]">
          added on the day
        </Badge>
      ) : null}
      <div className="ml-auto flex items-center gap-2">
        {manage && !person.removedAt ? (
          <>
            <select
              value={person.role}
              onChange={(e) => onRole(e.target.value as Personnel['role'])}
              className="h-7 rounded-md border border-input bg-background px-1 text-xs"
            >
              {(Object.keys(ROLE_LABEL) as Personnel['role'][]).map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABEL[role]}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={onRemove}
              className="text-xs text-muted-foreground underline-offset-2 hover:underline"
            >
              left
            </button>
          </>
        ) : (
          <span className="text-xs text-muted-foreground">
            {person.removedAt ? 'left' : ROLE_LABEL[person.role]}
          </span>
        )}
      </div>
    </div>
  );
}

function AddUnit({
  designators,
  onAdd,
}: {
  designators: Config['designators'];
  onAdd: (body: Record<string, unknown>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        Put a unit in service
      </Button>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        className={FIELD}
        defaultValue=""
        onChange={(e) => {
          if (!e.target.value) return;
          onAdd({ designatorId: Number(e.target.value) });
          setOpen(false);
        }}
      >
        <option value="">From the list…</option>
        {designators.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="…or a new one"
        className={`${FIELD} w-36`}
      />
      <Button
        size="sm"
        disabled={!name.trim()}
        onClick={() => {
          onAdd({ name: name.trim() });
          setName('');
          setOpen(false);
        }}
      >
        Add
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
        Cancel
      </Button>
    </div>
  );
}

/**
 * Putting somebody on a unit.
 *
 * Offers anybody on the roster, not only the people the event's signups
 * seeded the standby with: the member who turned up unannounced is exactly
 * who a crew chief is trying to write down, and a standby opened for
 * something nobody planned starts with nobody on it at all. Picking
 * somebody not yet on the standby puts them on it first.
 */
function AssignCrew({
  people,
  roster,
  unit,
  onAdd,
  onAssign,
}: {
  people: Personnel[];
  roster: Person[];
  unit: Unit;
  onAdd: (memberId: number) => Promise<Response | null>;
  onAssign: (personnelId: number, position: string | undefined) => void;
}) {
  const [personnelId, setPersonnelId] = useState('');
  const [position, setPosition] = useState('');
  const [busy, setBusy] = useState(false);
  const alreadyOn = new Set(
    unit.assignments.filter((a) => !a.removedAt).map((a) => a.personnel.id),
  );

  // Somebody already on another unit is still offered: a transport driver
  // is on the ambulance and on their own unit at once. Members not on the
  // standby are offered too, keyed negatively so the two cannot collide.
  const onStandby = new Set(
    people.map((p) => p.member?.id).filter((id) => id !== undefined),
  );
  const choices = [
    ...people
      .filter((p) => !alreadyOn.has(p.id))
      .map((p) => ({
        id: p.id,
        label: personnelName(p),
        aliases: p.member ? searchableNames(p.member) : [],
      })),
    ...roster
      .filter((member) => !onStandby.has(member.id))
      .map((member) => ({
        id: -member.id,
        label: displayName(member),
        aliases: searchableNames(member),
      })),
  ];

  const put = async () => {
    const picked = Number(personnelId);
    setBusy(true);
    try {
      if (picked > 0) {
        onAssign(picked, position.trim() || undefined);
      } else {
        // Not on the standby yet. Add them, then put them on the unit with
        // the id that comes back.
        const res = await onAdd(-picked);
        if (!res?.ok) return;
        const person = (await res.json()) as { id: number };
        onAssign(person.id, position.trim() || undefined);
      }
      setPersonnelId('');
      setPosition('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-1 gap-1">
      <Picker
        className="flex-1"
        placeholder="Add crew…"
        choices={choices}
        value={
          choices.find((choice) => String(choice.id) === personnelId)?.label ??
          ''
        }
        onPick={({ id }) => setPersonnelId(id === null ? '' : String(id))}
      />
      <input
        value={position}
        onChange={(e) => setPosition(e.target.value)}
        placeholder="Position"
        className={`${FIELD} w-24`}
      />
      <Button size="sm" disabled={!personnelId || busy} onClick={() => void put()}>
        On
      </Button>
    </div>
  );
}
