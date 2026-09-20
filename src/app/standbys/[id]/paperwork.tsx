'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { Standby } from './types';

const FIELD =
  'h-8 w-full rounded-md border border-input bg-background px-2 text-sm';

/** The fields the state form asks for that nothing on the board supplies. */
interface Draft {
  totalAttendance: string;
  totalEstimated: boolean;
  peakAttendance: string;
  peakEstimated: boolean;
  sponsorOperator: string;
  unusualOccurrences: string;
  completedByName: string;
  completedByTitle: string;
  completedByPhone: string;
}

const draftOf = (standby: Standby): Draft => ({
  totalAttendance: standby.totalAttendance?.toString() ?? '',
  totalEstimated: standby.totalEstimated,
  peakAttendance: standby.peakAttendance?.toString() ?? '',
  peakEstimated: standby.peakEstimated,
  sponsorOperator: standby.sponsorOperator ?? '',
  unusualOccurrences: standby.unusualOccurrences ?? '',
  completedByName: standby.completedByName ?? '',
  completedByTitle: standby.completedByTitle ?? '',
  completedByPhone: standby.completedByPhone ?? '',
});

const number = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
};
const text = (value: string) => value.trim() || null;

/**
 * What the DOH form needs and the board cannot know.
 *
 * Attendance is not something anybody has while the standby is running —
 * it comes from the sponsor afterwards, or is a guess made at the worst
 * moment — so this is paperwork rather than logging, and it saves on a
 * button rather than on every keystroke the way the live board does.
 *
 * Every field stays editable for good. A number given as an estimate on the
 * night is often replaced by a real one a week later, and the standby being
 * closed does not mean the paperwork is: closed says nothing new is
 * expected, not that what is here cannot be corrected.
 */
export function Paperwork({
  standby,
  mayManage,
  onSave,
}: {
  standby: Standby;
  mayManage: boolean;
  onSave: (patch: Record<string, unknown>) => Promise<unknown>;
}) {
  const [draft, setDraft] = useState<Draft>(() => draftOf(standby));
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);

  // The board reloads whenever anybody writes to this standby, and a reload
  // must not take a half-typed phone number out from under somebody. What
  // the server says is only picked up while there is nothing to lose.
  const [fromServer, setFromServer] = useState(standby);
  if (fromServer !== standby) {
    setFromServer(standby);
    if (!dirty) setDraft(draftOf(standby));
  }

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((was) => ({ ...was, [key]: value }));
    setDirty(true);
  };

  const save = async () => {
    setBusy(true);
    try {
      await onSave({
        totalAttendance: number(draft.totalAttendance),
        totalEstimated: draft.totalEstimated,
        peakAttendance: number(draft.peakAttendance),
        peakEstimated: draft.peakEstimated,
        sponsorOperator: text(draft.sponsorOperator),
        unusualOccurrences: text(draft.unusualOccurrences),
        completedByName: text(draft.completedByName),
        completedByTitle: text(draft.completedByTitle),
        completedByPhone: text(draft.completedByPhone),
      });
      setDirty(false);
    } finally {
      setBusy(false);
    }
  };

  const blank =
    standby.totalAttendance === null &&
    standby.peakAttendance === null &&
    !standby.completedByName;

  if (!mayManage) {
    return blank ? null : <Filled standby={standby} />;
  }

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="flex flex-wrap items-baseline gap-2">
        <h3 className="text-sm font-medium">What the forms ask for</h3>
        <span className="text-xs text-muted-foreground">
          {blank
            ? 'Not filled in yet — DOH-2332 prints these blank until they are.'
            : 'Change any of it whenever the real numbers turn up.'}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Count
          label="Total attendance"
          hint="Everybody who came"
          value={draft.totalAttendance}
          estimated={draft.totalEstimated}
          onValue={(value) => set('totalAttendance', value)}
          onEstimated={(value) => set('totalEstimated', value)}
        />
        <Count
          label="Peak attendance"
          hint="The most at once"
          value={draft.peakAttendance}
          estimated={draft.peakEstimated}
          onValue={(value) => set('peakAttendance', value)}
          onEstimated={(value) => set('peakEstimated', value)}
        />
      </div>

      <label className="block space-y-1">
        <span className="text-xs text-muted-foreground">Sponsor / operator</span>
        <input
          value={draft.sponsorOperator}
          onChange={(event) => set('sponsorOperator', event.target.value)}
          maxLength={200}
          className={FIELD}
        />
      </label>

      <label className="block space-y-1">
        <span className="text-xs text-muted-foreground">
          Unusual occurrences
        </span>
        <textarea
          value={draft.unusualOccurrences}
          onChange={(event) => set('unusualOccurrences', event.target.value)}
          maxLength={4000}
          rows={3}
          placeholder="Anything the state should know that the timeline does not say."
          className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
        />
      </label>

      <fieldset className="space-y-1">
        <legend className="text-xs text-muted-foreground">
          Report completed by
        </legend>
        <div className="grid gap-2 sm:grid-cols-3">
          <input
            value={draft.completedByName}
            onChange={(event) => set('completedByName', event.target.value)}
            placeholder="Name"
            maxLength={200}
            className={FIELD}
          />
          <input
            value={draft.completedByTitle}
            onChange={(event) => set('completedByTitle', event.target.value)}
            placeholder="Title"
            maxLength={200}
            className={FIELD}
          />
          <input
            value={draft.completedByPhone}
            onChange={(event) => set('completedByPhone', event.target.value)}
            placeholder="Phone"
            maxLength={40}
            inputMode="tel"
            className={FIELD}
          />
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" disabled={!dirty || busy} onClick={() => void save()}>
          Save
        </Button>
        {dirty ? (
          <button
            type="button"
            onClick={() => {
              setDraft(draftOf(standby));
              setDirty(false);
            }}
            className="text-xs text-muted-foreground underline underline-offset-2"
          >
            discard changes
          </button>
        ) : (
          <span className="text-xs text-muted-foreground">
            {blank ? '' : 'Saved.'}
          </span>
        )}
      </div>
    </div>
  );
}

function Count({
  label,
  hint,
  value,
  estimated,
  onValue,
  onEstimated,
}: {
  label: string;
  hint: string;
  value: string;
  estimated: boolean;
  onValue: (value: string) => void;
  onEstimated: (value: boolean) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="block space-y-1">
        <span className="text-xs text-muted-foreground">
          {label} <span className="text-muted-foreground/70">— {hint}</span>
        </span>
        <input
          value={value}
          onChange={(event) => onValue(event.target.value)}
          inputMode="numeric"
          type="number"
          min={0}
          className={FIELD}
        />
      </label>
      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={estimated}
          onChange={(event) => onEstimated(event.target.checked)}
        />
        Estimated
      </label>
    </div>
  );
}

/** What it says for somebody who may read the standby but not change it. */
function Filled({ standby }: { standby: Standby }) {
  const shown = (value: number | null, estimated: boolean) =>
    value === null ? '—' : `${value}${estimated ? ' (estimated)' : ''}`;
  return (
    <div className="space-y-1 rounded-md border p-3 text-sm">
      <h3 className="text-sm font-medium">What the forms ask for</h3>
      <p className="text-muted-foreground">
        Total {shown(standby.totalAttendance, standby.totalEstimated)} · peak{' '}
        {shown(standby.peakAttendance, standby.peakEstimated)}
        {standby.completedByName ? ` · completed by ${standby.completedByName}` : ''}
      </p>
      {standby.unusualOccurrences ? (
        <p className="whitespace-pre-wrap">{standby.unusualOccurrences}</p>
      ) : null}
    </div>
  );
}
