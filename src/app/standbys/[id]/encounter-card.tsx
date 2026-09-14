'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { displayName } from '@/lib/name';
import { Picker } from './picker';
import { formatDateTime, formatTime } from '@/lib/format';
import {
  CATEGORY_LABEL,
  DISPOSITION_LABEL,
  VOID_BLURB,
  VOID_LABEL,
  type Config,
  type Encounter,
  type TimelineEntry,
  type Unit,
} from './types';

type VoidAs = NonNullable<Encounter['voidedAs']>;

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
  mayDelete,
  actions,
  marks,
  onWrite,
  onDeleted,
}: {
  encounter: Encounter;
  standbyId: number;
  units: Unit[];
  locations: Array<{ id: number; name: string }>;
  hospitals: Config['hospitals'];
  hour12: boolean;
  readOnly: boolean;
  mayDelete: boolean;
  /** The buttons an officer set up: on scene, moving to FAR. */
  actions: Config['actions'];
  /** What has already been marked or noted about this one. */
  marks: TimelineEntry[];
  onWrite: Write;
  onDeleted: () => void;
}) {
  const [open, setOpen] = useState(!encounter.closedAt);
  const [draft, setDraft] = useState(encounter);
  const [problems, setProblems] = useState<string[]>([]);
  const [asking, setAsking] = useState(false);
  const [note, setNote] = useState('');
  const [voiding, setVoiding] = useState(false);
  const [voidNote, setVoidNote] = useState('');
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

  // Something was missed, or something was wrong. The alternative to
  // reopening is a second encounter for one patient, which is worse for the
  // record than a correction is.
  const reopen = async () => {
    setSaving(true);
    setProblems([]);
    try {
      setDraft((d) => ({ ...d, closedAt: null }));
      setOpen(true);
      const res = await onWrite(
        'POST',
        `${base}/reopen`,
        undefined,
        `reopen #${encounter.sequence}`,
      );
      if (res && !res.ok) {
        setDraft((d) => ({ ...d, closedAt: encounter.closedAt }));
        const body = (await res.json()) as { message?: string };
        setProblems([
          typeof body.message === 'string' ? body.message : 'Could not reopen it.',
        ]);
      }
    } finally {
      setSaving(false);
    }
  };

  // It turned out not to be a patient encounter. Marking it says so and
  // keeps the fact that it happened; deleting it, below, does not.
  const setVoid = async (as: VoidAs | null, note?: string) => {
    setSaving(true);
    setProblems([]);
    const was = { voidedAs: draft.voidedAs, voidNote: draft.voidNote };
    try {
      setDraft((d) => ({
        ...d,
        voidedAs: as,
        voidNote: as ? (note?.trim() || null) : null,
        // Voiding finishes it; taking the mark off puts it back in play.
        closedAt: as ? (d.closedAt ?? new Date().toISOString()) : null,
        // The patient fields go with it, on the server and here.
        ...(as
          ? {
              patientInitials: null,
              patientAge: null,
              chiefComplaint: null,
              treatment: null,
              prid: null,
              died: false,
              intoxicationSigns: false,
            }
          : {}),
      }));
      setVoiding(false);
      const res = await onWrite(
        'POST',
        `${base}/void`,
        { as, note },
        as ? `#${encounter.sequence} ${VOID_LABEL[as]}` : `#${encounter.sequence} back`,
      );
      if (res && !res.ok) {
        setDraft((d) => ({ ...d, ...was }));
        const body = (await res.json()) as { message?: string };
        setProblems([
          typeof body.message === 'string' ? body.message : 'That did not work.',
        ]);
      }
    } finally {
      setSaving(false);
    }
  };

  // The duplicate, or the one opened on the wrong standby. A mistake in
  // the writing-up is a reopen and an edit, not this.
  const destroy = async () => {
    setSaving(true);
    setProblems([]);
    try {
      const res = await onWrite('DELETE', base, undefined, `delete #${encounter.sequence}`);
      if (res && !res.ok) {
        const body = (await res.json()) as { message?: string };
        setProblems([
          typeof body.message === 'string' ? body.message : 'Could not delete it.',
        ]);
        return;
      }
      onDeleted();
    } finally {
      setSaving(false);
      setAsking(false);
    }
  };

  // A line about this one, in the words of whoever was there. It lands on
  // the card and in the timeline at once rather than being written twice.
  const addNote = async () => {
    const said = note.trim();
    if (!said) return;
    setSaving(true);
    try {
      setNote('');
      await onWrite('POST', `${base}/notes`, { text: said }, `note on #${encounter.sequence}`);
    } finally {
      setSaving(false);
    }
  };

  const summary = draft.voidedAs
    ? (draft.voidNote ?? 'No patient.')
    : [
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
        {draft.voidedAs ? (
          <Badge variant="outline" className="text-muted-foreground">
            {VOID_LABEL[draft.voidedAs]}
          </Badge>
        ) : (
          <>
            <Badge variant="secondary" className={CATEGORY_TONE[draft.category]}>
              {CATEGORY_LABEL[draft.category]}
            </Badge>
            {draft.firstAidOnly ? (
              <Badge variant="outline">first aid only</Badge>
            ) : null}
            {draft.died ? <Badge variant="destructive">death</Badge> : null}
          </>
        )}
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

          {draft.voidedAs ? (
            // Everything the form asks about is about a patient this
            // encounter turned out not to have.
            <div className="space-y-2 rounded-md border border-dashed px-3 py-2 text-sm">
              <p className="font-medium">
                Marked {VOID_LABEL[draft.voidedAs]}
                {draft.voidedAt ? (
                  <span className="font-normal text-muted-foreground">
                    {' '}
                    · {formatDateTime(draft.voidedAt, hour12)}
                  </span>
                ) : null}
              </p>
              <p className="text-muted-foreground">
                {VOID_BLURB[draft.voidedAs]}
              </p>
              {draft.voidNote ? <p>{draft.voidNote}</p> : null}
              {editable ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={saving}
                  onClick={() => void setVoid(null)}
                >
                  It was a patient encounter after all
                </Button>
              ) : null}
              <p className="text-xs text-muted-foreground">
                What was filled in about a patient was cleared when it was
                marked, and does not come back.
              </p>
            </div>
          ) : (
            <>
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
                {/* Typable, because a patient is wherever they are: the
                    venue's own list is a shortcut, not the set of places
                    something can happen. */}
                <Picker
                  choices={locations.map((l) => ({ id: l.id, label: l.name }))}
                  value={
                    locations.find((l) => l.id === draft.locationId)?.name ??
                    draft.locationText ??
                    ''
                  }
                  disabled={!editable}
                  allowFreeText
                  placeholder="Anywhere on site"
                  onPick={({ id, text }) => {
                    set('locationId', id);
                    set('locationText', id ? null : text || null);
                    void save({
                      locationId: id,
                      locationText: id ? null : text || null,
                    } as Partial<Encounter>);
                  }}
                />
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
                  {/* Always typable. A transport often carries the county's
                      number and nothing of ours, and a number given over the
                      radio has to be able to go in the box it belongs in.
                      Issuing is for taking the next one from our own pool,
                      which is the only part a person cannot do by hand. */}
                  <input
                    value={draft.runNumber?.number ?? draft.runNumberText ?? ''}
                    disabled={!editable || !!draft.runNumberId}
                    onChange={(e) => set('runNumberText', e.target.value)}
                    onBlur={() => save({ runNumberText: draft.runNumberText })}
                    placeholder="Ours, the county's, or another agency's"
                    className={`${FIELD} flex-1`}
                  />
                  {editable && !draft.runNumberId && !draft.runNumberText?.trim() ? (
                    <IssueRunNumber
                      onIssue={async () => {
                        const res = await onWrite(
                          'POST',
                          `${base}/run-number`,
                          {},
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
                  {editable && draft.runNumberId ? (
                    // Issued from our pool, so it is not a box to retype —
                    // but it must be possible to take it off an encounter it
                    // was put on by mistake. The number stays issued.
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      disabled={saving}
                      onClick={() => {
                        set('runNumber', null);
                        set('runNumberId', null);
                        void save({ runNumberId: null });
                      }}
                    >
                      Detach
                    </Button>
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
            </>
          )}


          {marks.length ? (
            <ol className="space-y-0.5 rounded-md border px-3 py-2 text-xs">
              {marks.map((mark) => (
                <li key={mark.id} className="flex gap-2">
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {formatTime(mark.at, hour12)}
                  </span>
                  {/* The timeline already writes these as sentences; on the
                      card the encounter is the heading, so its number is
                      dropped from the front of each line. */}
                  <span>{mark.text.replace(/^Encounter #\d+( note)? — /, '')}</span>
                </li>
              ))}
            </ol>
          ) : null}

          {editable && !draft.voidedAs ? (
            <div className="space-y-2">
              {actions.length ? (
                <div className="flex flex-wrap gap-1">
                  {actions.map((action) => (
                    <Button
                      key={action.id}
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      disabled={saving}
                      onClick={() =>
                        void onWrite(
                          'POST',
                          `${base}/mark`,
                          { actionId: action.id },
                          `#${encounter.sequence} ${action.label.toLowerCase()}`,
                        )
                      }
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
              ) : null}
              <div className="flex gap-2">
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void addNote();
                    }
                  }}
                  maxLength={1000}
                  placeholder="A note about this one…"
                  className={FIELD}
                />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!note.trim() || saving}
                  onClick={() => void addNote()}
                >
                  Note
                </Button>
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            {editable && !draft.voidedAs && !draft.closedAt ? (
              <Button size="sm" disabled={saving} onClick={() => void close()}>
                {saving ? 'Saving…' : 'Close encounter'}
              </Button>
            ) : null}
            {editable && !draft.voidedAs && draft.closedAt ? (
              <Button
                size="sm"
                variant="outline"
                disabled={saving}
                onClick={() => void reopen()}
              >
                {saving ? 'Saving…' : 'Reopen encounter'}
              </Button>
            ) : null}
            <a
              href={`/standbys/${standbyId}/export?to=${encodeURIComponent(
                `/v1/standbys/${standbyId}/encounters/${encounter.id}/export.pdf`,
              )}`}
              target="_blank"
              rel="noopener"
              className="rounded-md border px-3 py-1 text-sm hover:bg-muted"
            >
              PDF
            </a>
            {draft.createdBy ? (
              <span className="text-xs text-muted-foreground">
                Written up by {displayName(draft.createdBy)}
              </span>
            ) : null}
            {editable && !draft.voidedAs && !voiding ? (
              <button
                type="button"
                onClick={() => setVoiding(true)}
                className="text-xs text-muted-foreground underline-offset-2 hover:underline"
              >
                Not a patient encounter?
              </button>
            ) : null}
            {mayDelete && !asking ? (
              <button
                type="button"
                onClick={() => setAsking(true)}
                className="ml-auto text-xs text-muted-foreground underline-offset-2 hover:underline"
              >
                Delete this encounter
              </button>
            ) : null}
          </div>

          {voiding ? (
            <div className="space-y-2 rounded-md border px-3 py-2 text-xs">
              <p className="font-medium">What was it, then?</p>
              <label className="grid gap-1">
                What happened (optional)
                <input
                  type="text"
                  value={voidNote}
                  maxLength={300}
                  onChange={(e) => setVoidNote(e.target.value)}
                  placeholder="Searched the north lawn, nobody there"
                  className={FIELD}
                />
              </label>
              <div className="flex flex-wrap items-start gap-2">
                {(['UNFOUNDED', 'CREATED_IN_ERROR'] as const).map((as) => (
                  <Button
                    key={as}
                    size="sm"
                    variant="outline"
                    className="h-auto max-w-[15rem] flex-col items-start gap-0.5 py-1.5 text-left text-xs whitespace-normal"
                    disabled={saving}
                    onClick={() => void setVoid(as, voidNote)}
                  >
                    <span className="font-medium">{VOID_LABEL[as]}</span>
                    <span className="font-normal text-muted-foreground">
                      {VOID_BLURB[as]}
                    </span>
                  </Button>
                ))}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => setVoiding(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : null}

          {asking ? (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
              <p className="font-medium">
                Throw encounter #{draft.sequence} away?
              </p>
              <p className="mt-1">
                It comes off the standby and off both DOH forms, and it is not
                recoverable from here — only from the audit log.
                {draft.runNumber
                  ? ` Run number ${draft.runNumber.number} stays issued; it is the county's sequence, not ours to reuse.`
                  : ''}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-7 text-xs"
                  disabled={saving}
                  onClick={() => void destroy()}
                >
                  Yes, delete it
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => setAsking(false)}
                >
                  Keep it
                </Button>
              </div>
            </div>
          ) : null}
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
    runNumberText: e.runNumberText,
    countyRunNumber: e.countyRunNumber,
    prid: e.prid,
    locationId: e.locationId,
    locationText: e.locationText,
  };
}

/**
 * Takes the next number from the agency's own sequence.
 *
 * Nowhere to pick from: the standby is worked at a place, and a place
 * either carries the run-number letter or files under one that does, so the
 * counter follows from where the standby is. This used to fetch a list and
 * silently issue against whichever came first, which was right only while
 * there was one.
 */
function IssueRunNumber({ onIssue }: { onIssue: () => void }) {
  return (
    <Button type="button" size="sm" variant="outline" onClick={onIssue}>
      Issue
    </Button>
  );
}
