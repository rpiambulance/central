'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { displayName } from '@/lib/name';
import { formatDateTime } from '@/lib/format';
import {
  CATEGORY_LABEL,
  DISPOSITION_LABEL,
  type Config,
  type Encounter,
  type Unit,
} from './types';

const FIELD = 'h-8 w-full rounded-md border border-input bg-background px-2 text-sm';
const LABEL = 'grid gap-1 text-xs text-muted-foreground';

const CATEGORY_TONE: Record<Encounter['category'], string> = {
  MINOR_INJURY: '',
  MINOR_ILLNESS: '',
  MAJOR_INJURY: 'bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200',
  MAJOR_ILLNESS: 'bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200',
};

type Write = (
  method: 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body: unknown,
  label: string,
) => Promise<Response | null>;

/**
 * One patient interaction.
 *
 * Folded to a line until opened, because a standby with fifteen of these is
 * a list to scan rather than fifteen forms to scroll past. What is on the
 * closed line is what somebody scanning wants: the number, the category,
 * where it went.
 */
export function EncounterCard({
  encounter,
  standbyId,
  units,
  locations,
  hospitals,
  hour12,
  readOnly,
  onWrite,
}: {
  encounter: Encounter;
  standbyId: number;
  units: Unit[];
  locations: Array<{ id: number; name: string }>;
  hospitals: Config['hospitals'];
  hour12: boolean;
  readOnly: boolean;
  onWrite: Write;
}) {
  const [open, setOpen] = useState(!encounter.closedAt);
  const [draft, setDraft] = useState(encounter);
  const [problems, setProblems] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const base = `/v1/standbys/${standbyId}/encounters/${encounter.id}`;
  const editable = !readOnly;

  const set = <K extends keyof Encounter>(key: K, value: Encounter[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const save = async (patch: Partial<Encounter>) => {
    setSaving(true);
    try {
      await onWrite('PATCH', base, patch, `encounter #${encounter.sequence}`);
    } finally {
      setSaving(false);
    }
  };

  const close = async () => {
    setSaving(true);
    setProblems([]);
    try {
      // Everything typed goes up before the rules are checked, or a crew
      // would be told a field is missing that they have already filled in.
      await onWrite('PATCH', base, fieldsOf(draft), `encounter #${encounter.sequence}`);
      const res = await onWrite('POST', `${base}/close`, undefined, `close #${encounter.sequence}`);
      if (res && !res.ok) {
        const body = (await res.json()) as {
          message?: string | { message?: string; problems?: Array<{ message: string }> };
        };
        const detail = typeof body.message === 'object' ? body.message : null;
        setProblems(
          detail?.problems?.map((p) => p.message) ??
            [typeof body.message === 'string' ? body.message : 'Could not close it.'],
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const summary = [
    draft.patientInitials,
    CATEGORY_LABEL[draft.category],
    draft.chiefComplaint,
    DISPOSITION_LABEL[draft.disposition],
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="rounded-md border">
      <button
        type="button"
        onClick={() => setOpen((was) => !was)}
        className="flex w-full flex-wrap items-center gap-2 px-3 py-2 text-left"
      >
        <span className="font-medium">
          {draft.runNumber?.number ?? `#${draft.sequence}`}
        </span>
        <Badge variant="secondary" className={CATEGORY_TONE[draft.category]}>
          {CATEGORY_LABEL[draft.category]}
        </Badge>
        {draft.firstAidOnly ? <Badge variant="outline">first aid only</Badge> : null}
        {draft.died ? <Badge variant="destructive">death</Badge> : null}
        {!draft.closedAt ? <Badge>open</Badge> : null}
        <span className="text-sm text-muted-foreground">{summary}</span>
        <span className="ml-auto text-xs text-muted-foreground">
          {formatDateTime(draft.openedAt, hour12)}
        </span>
      </button>

      {open ? (
        <div className="space-y-3 border-t px-3 py-3">
          {problems.length ? (
            <ul
              role="alert"
              className="space-y-1 rounded-md border border-destructive/40 px-3 py-2 text-sm text-destructive"
            >
              {problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-3">
            <label className={LABEL}>
              Initials
              <input
                value={draft.patientInitials ?? ''}
                maxLength={4}
                disabled={!editable}
                onChange={(e) => set('patientInitials', e.target.value)}
                onBlur={() => save({ patientInitials: draft.patientInitials })}
                className={FIELD}
              />
              <span className="text-[10px]">No names. Initials and age only.</span>
            </label>
            <label className={LABEL}>
              Age
              <input
                type="number"
                min={0}
                value={draft.patientAge ?? ''}
                disabled={!editable}
                onChange={(e) =>
                  set('patientAge', e.target.value ? Number(e.target.value) : null)
                }
                onBlur={() => save({ patientAge: draft.patientAge })}
                className={FIELD}
              />
            </label>
            <label className={LABEL}>
              Unit
              <select
                value={draft.unit?.id ?? ''}
                disabled={!editable}
                onChange={(e) => {
                  const id = e.target.value ? Number(e.target.value) : null;
                  const found = units.find((u) => u.id === id) ?? null;
                  set('unit', found ? { id: found.id, name: found.name } : null);
                  void save({ unitId: id } as Partial<Encounter>);
                }}
                className={FIELD}
              >
                <option value="">—</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className={LABEL}>
              Category
              <select
                value={draft.category}
                disabled={!editable}
                onChange={(e) => {
                  const category = e.target.value as Encounter['category'];
                  set('category', category);
                  void save({ category });
                }}
                className={FIELD}
              >
                {(Object.keys(CATEGORY_LABEL) as Encounter['category'][]).map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABEL[c]}
                  </option>
                ))}
              </select>
            </label>
            <label className={LABEL}>
              Chief complaint
              <input
                value={draft.chiefComplaint ?? ''}
                disabled={!editable}
                onChange={(e) => set('chiefComplaint', e.target.value)}
                onBlur={() => save({ chiefComplaint: draft.chiefComplaint })}
                className={FIELD}
              />
            </label>
            <label className={LABEL}>
              Where
              <select
                value={draft.locationId ?? ''}
                disabled={!editable}
                onChange={(e) => {
                  const id = e.target.value ? Number(e.target.value) : null;
                  set('locationId', id);
                  void save({ locationId: id } as Partial<Encounter>);
                }}
                className={FIELD}
              >
                <option value="">—</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className={LABEL}>
              Disposition
              <select
                value={draft.disposition}
                disabled={!editable}
                onChange={(e) => {
                  const disposition = e.target.value as Encounter['disposition'];
                  set('disposition', disposition);
                  void save({ disposition });
                }}
                className={FIELD}
              >
                {(Object.keys(DISPOSITION_LABEL) as Encounter['disposition'][]).map((d) => (
                  <option key={d} value={d}>
                    {DISPOSITION_LABEL[d]}
                  </option>
                ))}
              </select>
            </label>
            {draft.disposition === 'TRANSPORTED' ? (
              <label className={LABEL}>
                Hospital
                <select
                  value={draft.hospitalId ?? ''}
                  disabled={!editable}
                  onChange={(e) => {
                    const id = e.target.value ? Number(e.target.value) : null;
                    set('hospitalId', id);
                    void save({ hospitalId: id } as Partial<Encounter>);
                  }}
                  className={FIELD}
                >
                  <option value="">—</option>
                  {hospitals.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {draft.disposition === 'TURNOVER' ? (
              <label className={LABEL}>
                Handed to
                <input
                  value={draft.turnoverAgency ?? ''}
                  disabled={!editable}
                  onChange={(e) => set('turnoverAgency', e.target.value)}
                  onBlur={() => save({ turnoverAgency: draft.turnoverAgency })}
                  className={FIELD}
                />
              </label>
            ) : null}
            <label className={LABEL}>
              County run number
              <input
                value={draft.countyRunNumber ?? ''}
                disabled={!editable}
                onChange={(e) => set('countyRunNumber', e.target.value)}
                onBlur={() => save({ countyRunNumber: draft.countyRunNumber })}
                className={FIELD}
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.firstAidOnly}
                disabled={!editable}
                onChange={(e) => {
                  set('firstAidOnly', e.target.checked);
                  void save({ firstAidOnly: e.target.checked });
                }}
              />
              First aid only
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.intoxicationSigns}
                disabled={!editable}
                onChange={(e) => {
                  set('intoxicationSigns', e.target.checked);
                  void save({ intoxicationSigns: e.target.checked });
                }}
              />
              Signs of intoxication
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.died}
                disabled={!editable}
                onChange={(e) => {
                  set('died', e.target.checked);
                  void save({ died: e.target.checked });
                }}
              />
              Died
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className={LABEL}>
              Run number
              <div className="flex gap-2">
                <input
                  value={draft.runNumber?.number ?? ''}
                  readOnly
                  placeholder="none"
                  className={`${FIELD} flex-1`}
                />
                {editable && !draft.runNumberId ? (
                  <IssueRunNumber
                    onIssue={async (locationId) => {
                      const res = await onWrite(
                        'POST',
                        `${base}/run-number`,
                        { locationId },
                        `run number for #${encounter.sequence}`,
                      );
                      if (res?.ok) {
                        const issued = (await res.json()) as { id: number; number: string };
                        set('runNumber', issued);
                        set('runNumberId', issued.id);
                      }
                    }}
                  />
                ) : null}
              </div>
            </label>
            <label className={LABEL}>
              PRID
              <input
                value={draft.prid ?? ''}
                disabled={!editable}
                onChange={(e) => set('prid', e.target.value)}
                onBlur={() => save({ prid: draft.prid })}
                placeholder="From the patient care report"
                className={FIELD}
              />
            </label>
          </div>

          <label className={LABEL}>
            Treatment
            <textarea
              value={draft.treatment ?? ''}
              disabled={!editable}
              rows={2}
              onChange={(e) => set('treatment', e.target.value)}
              onBlur={() => save({ treatment: draft.treatment })}
              className="rounded-md border border-input bg-background p-2 text-sm"
            />
          </label>
          <label className={LABEL}>
            Narrative
            <textarea
              value={draft.narrative ?? ''}
              disabled={!editable}
              rows={3}
              onChange={(e) => set('narrative', e.target.value)}
              onBlur={() => save({ narrative: draft.narrative })}
              className="rounded-md border border-input bg-background p-2 text-sm"
            />
            <span className="text-[10px]">
              No names, addresses or dates of birth — this is not the patient care report.
            </span>
          </label>

          <div className="flex flex-wrap items-center gap-2">
            {editable && !draft.closedAt ? (
              <Button size="sm" disabled={saving} onClick={() => void close()}>
                {saving ? 'Saving…' : 'Close encounter'}
              </Button>
            ) : null}
            <a
              href={`/standbys/${standbyId}/export?to=${encodeURIComponent(
                `/v1/standbys/${standbyId}/encounters/${encounter.id}/export.pdf`,
              )}`}
              className="rounded-md border px-3 py-1 text-sm hover:bg-muted"
            >
              PDF
            </a>
            {draft.createdBy ? (
              <span className="text-xs text-muted-foreground">
                Written up by {displayName(draft.createdBy)}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Only the fields the API accepts on a patch. */
function fieldsOf(e: Encounter) {
  return {
    patientInitials: e.patientInitials,
    patientAge: e.patientAge,
    category: e.category,
    died: e.died,
    intoxicationSigns: e.intoxicationSigns,
    chiefComplaint: e.chiefComplaint,
    treatment: e.treatment,
    narrative: e.narrative,
    disposition: e.disposition,
    hospitalId: e.hospitalId,
    turnoverAgency: e.turnoverAgency,
    firstAidOnly: e.firstAidOnly,
    countyRunNumber: e.countyRunNumber,
    prid: e.prid,
    locationId: e.locationId,
  };
}

function IssueRunNumber({ onIssue }: { onIssue: (locationId: number) => void }) {
  const [locations, setLocations] = useState<Array<{ id: number; name: string }> | null>(null);

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={async () => {
        // Fetched on demand: most encounters never need one.
        const list =
          locations ??
          ((await fetch('/standbys/run-number-locations')
            .then((r) => (r.ok ? r.json() : []))
            .catch(() => [])) as Array<{ id: number; name: string }>);
        setLocations(list);
        if (list.length === 1) return onIssue(list[0].id);
        const choice = list[0];
        if (choice) onIssue(choice.id);
      }}
    >
      Issue
    </Button>
  );
}
