'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { completeChecksheet } from '../actions';

export type Item = {
  id: number;
  sectionId: number | null;
  order: number;
  label: string;
  notes: string | null;
  kind: 'PRESENCE' | 'PAR';
  parLevel: number | null;
  expiryTracking: 'NONE' | 'SINGLE' | 'PER_UNIT';
};

export type Section = {
  id: number;
  order: number;
  heading: string;
  description: string | null;
  hasSeal: boolean;
};

/** What the seal said last time, so this is a confirmation not a transcription. */
export type SealHistory = {
  sectionId: number;
  lastSealNumber: string | null;
  lastSealPresent: boolean | null;
};

type SealAnswer = {
  sealPresent: boolean;
  sealNumber: string;
  sealBroken: boolean;
};

export type Asset = { id: number; name: string };

type Answer = {
  present?: boolean;
  countPresent?: string;
  note?: string;
  expiries: string[];
};

const FIELD = 'h-9 rounded-md border border-input bg-background px-2 text-sm';

function slotsFor(item: Item): number {
  if (item.expiryTracking === 'NONE') return 0;
  if (item.expiryTracking === 'SINGLE') return 1;
  return Math.max(1, item.parLevel ?? 1);
}

/**
 * Filling in a checksheet.
 *
 * Present/absent is a pair of real buttons rather than a checkbox: this is
 * used one-handed, at the back of a truck, often in gloves, and a 13-pixel
 * native checkbox is the wrong target for that. It also makes "not looked at
 * yet" a state you can see — an unpressed checkbox and a deliberate "no" look
 * identical, which is exactly the ambiguity a check should not have.
 */
export function CompleteForm({
  templateId,
  sections,
  items,
  assets,
  assetRequired,
  carried,
  seals,
}: {
  templateId: number;
  sections: Section[];
  items: Item[];
  assets: Asset[];
  assetRequired: boolean;
  /** Last time's dates, by item id, so nobody retypes them. */
  carried: Record<number, string[]>;
  /** Last time's seal, by section id. */
  seals: SealHistory[];
}) {
  const [assetId, setAssetId] = useState('');
  const [comment, setComment] = useState('');
  const sealHistory = new Map(seals.map((seal) => [seal.sectionId, seal]));
  const [sealAnswers, setSealAnswers] = useState<Record<number, SealAnswer>>(
    () =>
      Object.fromEntries(
        sections
          .filter((section) => section.hasSeal)
          .map((section) => [
            section.id,
            {
              // Assumed present, because that is the ordinary state and the
              // number below is what confirms it. Unticking is the exception
              // and reads as one.
              sealPresent: true,
              sealNumber: '',
              sealBroken: false,
            } as SealAnswer,
          ]),
      ),
  );

  const setSeal = (sectionId: number, patch: Partial<SealAnswer>) =>
    setSealAnswers((prev) => ({
      ...prev,
      [sectionId]: { ...prev[sectionId], ...patch },
    }));

  const [answers, setAnswers] = useState<Record<number, Answer>>(() =>
    Object.fromEntries(
      items.map((item) => [
        item.id,
        { expiries: [...(carried[item.id] ?? [])] } as Answer,
      ]),
    ),
  );

  const today = new Date().toISOString().slice(0, 10);

  /** Dates entered in this section that have already passed. */
  const expiredIn = (sectionId: number) =>
    items
      .filter((item) => item.sectionId === sectionId)
      .filter((item) =>
        (answers[item.id]?.expiries ?? []).some(
          (date) => date && date < today,
        ),
      );

  const update = (itemId: number, patch: Partial<Answer>) =>
    setAnswers((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], ...patch },
    }));

  const setExpiry = (itemId: number, index: number, value: string) =>
    setAnswers((prev) => {
      const next = [...(prev[itemId]?.expiries ?? [])];
      next[index] = value;
      return { ...prev, [itemId]: { ...prev[itemId], expiries: next } };
    });

  const answered = items.filter((item) => {
    const answer = answers[item.id];
    return item.kind === 'PRESENCE'
      ? answer?.present !== undefined
      : (answer?.countPresent ?? '') !== '';
  }).length;

  // Sections whose seal is still claimed intact over something expired. The
  // server refuses these too; catching it here saves a round trip to an
  // error page for something visible on screen.
  const sealsToBreak = sections.filter((section) => {
    if (!section.hasSeal) return false;
    const seal = sealAnswers[section.id];
    if (!seal?.sealPresent || seal.sealBroken) return false;
    return expiredIn(section.id).length > 0;
  });

  const payload = JSON.stringify({
    templateId,
    ...(assetId ? { assetId: Number(assetId) } : {}),
    comment,
    sections: sections
      .filter((section) => section.hasSeal)
      .map((section) => ({ sectionId: section.id, ...sealAnswers[section.id] })),
    entries: items
      .map((item) => {
        const answer = answers[item.id] ?? { expiries: [] };
        const expiries = answer.expiries
          .slice(0, slotsFor(item))
          .filter(Boolean);
        if (item.kind === 'PRESENCE') {
          if (answer.present === undefined && !expiries.length && !answer.note) {
            return null;
          }
          return {
            itemId: item.id,
            present: answer.present,
            note: answer.note,
            expiries,
          };
        }
        if ((answer.countPresent ?? '') === '' && !expiries.length && !answer.note) {
          return null;
        }
        return {
          itemId: item.id,
          countPresent:
            answer.countPresent === '' || answer.countPresent === undefined
              ? undefined
              : Number(answer.countPresent),
          note: answer.note,
          expiries,
        };
      })
      .filter(Boolean),
  });

  const renderItem = (item: Item) => {
    const answer = answers[item.id] ?? { expiries: [] };
    const slots = slotsFor(item);
    const short =
      item.kind === 'PRESENCE'
        ? answer.present === false
        : (answer.countPresent ?? '') !== '' &&
          Number(answer.countPresent) < (item.parLevel ?? 0);

    return (
      <div
        key={item.id}
        className={cn(
          'flex flex-wrap items-center gap-3 rounded-md border p-3',
          short && 'border-destructive/60 bg-destructive/5',
        )}
      >
        <div className="min-w-48 flex-1">
          <div className="text-sm font-medium">{item.label}</div>
          {item.notes ? (
            <div className="text-xs text-muted-foreground">{item.notes}</div>
          ) : null}
        </div>

        {item.kind === 'PRESENCE' ? (
          <div className="flex gap-2">
            <button
              type="button"
              aria-pressed={answer.present === true}
              onClick={() => update(item.id, { present: true })}
              className={cn(
                'h-11 min-w-24 rounded-md border px-4 text-sm font-medium',
                answer.present === true
                  ? 'border-green-600 bg-green-600 text-white'
                  : 'hover:bg-accent',
              )}
            >
              Present
            </button>
            <button
              type="button"
              aria-pressed={answer.present === false}
              onClick={() => update(item.id, { present: false })}
              className={cn(
                'h-11 min-w-24 rounded-md border px-4 text-sm font-medium',
                answer.present === false
                  ? 'border-destructive bg-destructive text-white'
                  : 'hover:bg-accent',
              )}
            >
              Missing
            </button>
          </div>
        ) : (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="number"
              min={0}
              inputMode="numeric"
              value={answer.countPresent ?? ''}
              onChange={(event) =>
                update(item.id, { countPresent: event.target.value })
              }
              className={`${FIELD} h-11 w-20 text-center text-base`}
            />
            <span className="text-muted-foreground">
              of {item.parLevel ?? 0}
            </span>
          </label>
        )}

        {slots > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {slots === 1 ? 'Expires' : 'Expiry dates'}
            </span>
            {Array.from({ length: slots }, (_, index) => (
              <input
                key={index}
                type="date"
                value={answer.expiries[index] ?? ''}
                onChange={(event) =>
                  setExpiry(item.id, index, event.target.value)
                }
                className={`${FIELD} h-11`}
              />
            ))}
          </div>
        ) : null}
      </div>
    );
  };

  const loose = items.filter((item) => item.sectionId === null);

  return (
    <form action={completeChecksheet} className="space-y-6">
      <input type="hidden" name="payload" value={payload} />

      {assets.length ? (
        <label className="grid gap-1 text-sm font-medium">
          {assetRequired ? 'Which one?' : 'Which one? (optional)'}
          <select
            value={assetId}
            onChange={(event) => setAssetId(event.target.value)}
            required={assetRequired}
            className={`${FIELD} w-64`}
          >
            <option value="">Select…</option>
            {assets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {loose.length ? <div className="space-y-2">{loose.map(renderItem)}</div> : null}

      {sections.map((section) => {
        const inSection = items.filter((item) => item.sectionId === section.id);
        if (!inSection.length) return null;
        const seal = sealAnswers[section.id];
        const expired = section.hasSeal ? expiredIn(section.id) : [];
        // The rule the server also enforces: a seal is a claim that what is
        // inside is good, and something expired in there makes it false.
        const mustBreak =
          section.hasSeal && seal?.sealPresent && !seal.sealBroken && expired.length > 0;
        const last = sealHistory.get(section.id);

        return (
          <div key={section.id} className="space-y-2">
            <h2 className="text-sm font-semibold tracking-tight">
              {section.heading}
            </h2>
            {section.description ? (
              <p className="text-xs text-muted-foreground">
                {section.description}
              </p>
            ) : null}

            {section.hasSeal && seal ? (
              <div
                className={cn(
                  'space-y-2 rounded-md border p-3',
                  mustBreak && 'border-destructive/60 bg-destructive/5',
                )}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm font-medium">Seal</span>
                  <button
                    type="button"
                    aria-pressed={seal.sealPresent}
                    onClick={() => setSeal(section.id, { sealPresent: true })}
                    className={cn(
                      'h-10 min-w-24 rounded-md border px-4 text-sm font-medium',
                      seal.sealPresent
                        ? 'border-green-600 bg-green-600 text-white'
                        : 'hover:bg-accent',
                    )}
                  >
                    Sealed
                  </button>
                  <button
                    type="button"
                    aria-pressed={!seal.sealPresent}
                    onClick={() =>
                      setSeal(section.id, { sealPresent: false, sealBroken: false })
                    }
                    className={cn(
                      'h-10 min-w-24 rounded-md border px-4 text-sm font-medium',
                      !seal.sealPresent
                        ? 'border-amber-600 bg-amber-600 text-white'
                        : 'hover:bg-accent',
                    )}
                  >
                    No seal
                  </button>
                  {seal.sealPresent ? (
                    <label className="flex items-center gap-2 text-sm">
                      Number
                      <input
                        value={seal.sealNumber}
                        onChange={(event) =>
                          setSeal(section.id, { sealNumber: event.target.value })
                        }
                        placeholder={last?.lastSealNumber ?? 'optional'}
                        className={`${FIELD} h-10 w-36`}
                      />
                    </label>
                  ) : null}
                </div>

                {last?.lastSealNumber && seal.sealPresent ? (
                  <p className="text-xs text-muted-foreground">
                    Last check read {last.lastSealNumber}.
                    {seal.sealNumber && seal.sealNumber !== last.lastSealNumber
                      ? ' This one is different — worth a comment below.'
                      : ''}
                  </p>
                ) : null}

                {seal.sealPresent ? (
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={seal.sealBroken}
                      onChange={(event) =>
                        setSeal(section.id, { sealBroken: event.target.checked })
                      }
                    />
                    I broke this seal to get at something inside
                  </label>
                ) : null}

                {mustBreak ? (
                  <p className="text-sm text-destructive">
                    {expired.map((entry) => entry.label).join(', ')} has expired
                    in here. A seal says the contents are good, so it has to
                    come off: deal with the item, tick that you broke the seal,
                    and put the new number in above.
                  </p>
                ) : null}
              </div>
            ) : null}

            {inSection.map(renderItem)}
          </div>
        );
      })}

      <label className="grid gap-1 text-sm font-medium">
        Comments
        <textarea
          name="comment"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          rows={3}
          placeholder="Anything worth saying about this check as a whole."
          className="rounded-md border border-input bg-background p-2 text-sm"
        />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          disabled={(assetRequired && !assetId) || sealsToBreak.length > 0}
        >
          Submit check
        </Button>
        <span className="text-sm text-muted-foreground">
          {sealsToBreak.length
            ? `${sealsToBreak.map((section) => section.heading).join(' and ')}: break the seal first. `
            : ''}
          {answered} of {items.length} answered
          {answered < items.length
            ? ' — unanswered lines are recorded as not looked at.'
            : ''}
        </span>
      </div>
    </form>
  );
}
