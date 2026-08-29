'use client';

import { useRef, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { saveLayout } from '../actions';

export type Item = {
  id: number;
  sectionId: number | null;
  order: number;
  label: string;
  kind: 'PRESENCE' | 'PAR';
  parLevel: number | null;
  expiryTracking: 'NONE' | 'SINGLE' | 'PER_UNIT';
};

export type Section = {
  id: number;
  order: number;
  heading: string;
};

/** Where a drag started, and what kind of thing it was. */
type Dragging =
  | { kind: 'item'; id: number }
  | { kind: 'section'; id: number }
  | null;

const TRACKING_LABEL: Record<Item['expiryTracking'], string> = {
  NONE: '',
  SINGLE: ' · one date',
  PER_UNIT: ' · date each',
};

function describe(item: Item): string {
  const kind =
    item.kind === 'PAR' ? `par ${item.parLevel ?? '?'}` : 'present / missing';
  return `${kind}${TRACKING_LABEL[item.expiryTracking]}`;
}

/** Moves one element of a list, returning a copy. */
function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length || from === to) return list;
  const next = [...list];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/**
 * Putting a sheet in the order a crew actually walks the truck.
 *
 * Drag for a mouse, and a pair of arrows on every row for everything else —
 * HTML5 dragging cannot be done from a keyboard at all and does not work by
 * touch, so a drag-only reorder would be unusable for anybody configuring
 * this from a phone. The arrows are the real control; the drag is the
 * shortcut.
 *
 * Ordering is held here and saved on request rather than on every drop: a
 * long sheet takes several moves to get right, and saving each one would
 * write six orders nobody chose on the way to the one they did.
 */
export function LayoutEditor({
  templateId,
  sections: initialSections,
  items: initialItems,
}: {
  templateId: number;
  sections: Section[];
  items: Item[];
}) {
  const [sections, setSections] = useState(initialSections);
  const [items, setItems] = useState(initialItems);
  // What is being dragged, twice over. The ref is what the drop handler
  // reads: state set in dragstart has not necessarily been rendered by the
  // time drop fires, and reading it from a stale closure quietly does
  // nothing. The state exists only so the dragged row can fade.
  const draggingRef = useRef<Dragging>(null);
  const [dragging, setDragging] = useState<Dragging>(null);
  const startDrag = (what: Exclude<Dragging, null>) => {
    draggingRef.current = what;
    setDragging(what);
  };
  const endDrag = () => {
    draggingRef.current = null;
    setDragging(null);
  };
  const [dirty, setDirty] = useState(false);
  const [saving, startSaving] = useTransition();

  const inSection = (sectionId: number | null) =>
    items.filter((item) => item.sectionId === sectionId);

  const commit = (nextItems: Item[], nextSections = sections) => {
    setItems(nextItems);
    setSections(nextSections);
    setDirty(true);
  };

  /** Moves an item within its own list, by one place. */
  const nudgeItem = (item: Item, by: -1 | 1) => {
    const list = inSection(item.sectionId);
    const from = list.findIndex((row) => row.id === item.id);
    const reordered = move(list, from, from + by);
    if (reordered === list) return;
    commit([
      ...items.filter((row) => row.sectionId !== item.sectionId),
      ...reordered,
    ]);
  };

  /** Sends an item to another section, at the end. */
  const reassign = (item: Item, sectionId: number | null) => {
    if (item.sectionId === sectionId) return;
    commit([
      ...items.filter((row) => row.id !== item.id),
      { ...item, sectionId },
    ]);
  };

  const nudgeSection = (section: Section, by: -1 | 1) => {
    const from = sections.findIndex((row) => row.id === section.id);
    const next = move(sections, from, from + by);
    if (next === sections) return;
    commit(items, next);
  };

  /** Drops `dragging` immediately before `target`. */
  const dropOnItem = (target: Item) => {
    const held = draggingRef.current;
    if (!held || held.kind !== 'item' || held.id === target.id) return;
    const moved = items.find((row) => row.id === held.id);
    if (!moved) return;
    const rest = items.filter((row) => row.id !== held.id);
    const list = rest.filter((row) => row.sectionId === target.sectionId);
    const index = list.findIndex((row) => row.id === target.id);
    const rebuilt = [
      ...list.slice(0, index),
      { ...moved, sectionId: target.sectionId },
      ...list.slice(index),
    ];
    commit([
      ...rest.filter((row) => row.sectionId !== target.sectionId),
      ...rebuilt,
    ]);
  };

  const dropOnSection = (section: Section | null) => {
    const held = draggingRef.current;
    if (!held) return;
    if (held.kind === 'item') {
      const moved = items.find((row) => row.id === held.id);
      if (moved) reassign(moved, section?.id ?? null);
      return;
    }
    if (!section) return;
    const from = sections.findIndex((row) => row.id === held.id);
    const to = sections.findIndex((row) => row.id === section.id);
    if (from < 0 || to < 0 || from === to) return;
    commit(items, move(sections, from, to));
  };

  const save = () =>
    startSaving(async () => {
      await saveLayout(templateId, {
        sectionIds: sections.map((section) => section.id),
        items: [
          ...inSection(null).map((item, order) => ({
            id: item.id,
            sectionId: null,
            order,
          })),
          ...sections.flatMap((section) =>
            inSection(section.id).map((item, order) => ({
              id: item.id,
              sectionId: section.id,
              order,
            })),
          ),
        ],
      });
      setDirty(false);
    });

  const itemRow = (item: Item, index: number, list: Item[]) => (
    <li
      key={item.id}
      draggable
      onDragStart={(event) => {
        // Firefox will not start a drag unless something is on the
        // dataTransfer; the id travels there too so the drop has it even if
        // the ref were somehow lost.
        event.dataTransfer.setData('text/plain', String(item.id));
        event.stopPropagation();
        startDrag({ kind: 'item', id: item.id });
      }}
      onDragEnd={endDrag}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        event.stopPropagation();
        dropOnItem(item);
        endDrag();
      }}
      className={cn(
        'flex cursor-grab items-center gap-2 rounded-md border bg-background p-2 text-sm',
        dragging?.kind === 'item' && dragging.id === item.id && 'opacity-40',
      )}
    >
      <span aria-hidden className="text-muted-foreground">
        ⠿
      </span>
      <span className="flex-1">{item.label}</span>
      <span className="text-xs text-muted-foreground">{describe(item)}</span>
      <button
        type="button"
        onClick={() => nudgeItem(item, -1)}
        disabled={index === 0}
        aria-label={`Move ${item.label} up`}
        className="h-7 rounded border px-2 text-xs disabled:opacity-30"
      >
        ↑
      </button>
      <button
        type="button"
        onClick={() => nudgeItem(item, 1)}
        disabled={index === list.length - 1}
        aria-label={`Move ${item.label} down`}
        className="h-7 rounded border px-2 text-xs disabled:opacity-30"
      >
        ↓
      </button>
      <select
        value={item.sectionId ?? ''}
        onChange={(event) =>
          reassign(item, event.target.value ? Number(event.target.value) : null)
        }
        aria-label={`Section for ${item.label}`}
        className="h-7 rounded-md border border-input bg-background px-1 text-xs"
      >
        <option value="">No section</option>
        {sections.map((section) => (
          <option key={section.id} value={section.id}>
            {section.heading}
          </option>
        ))}
      </select>
    </li>
  );

  const loose = inSection(null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={save} disabled={!dirty || saving} size="sm">
          {saving ? 'Saving…' : 'Save order'}
        </Button>
        <span className="text-xs text-muted-foreground">
          {dirty
            ? 'Unsaved changes to the order.'
            : 'Drag a row, or use the arrows. Nothing is saved until you press the button.'}
        </span>
      </div>

      <div
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          dropOnSection(null);
          endDrag();
        }}
        className="space-y-2 rounded-md border border-dashed p-2"
      >
        <p className="text-xs font-medium text-muted-foreground">
          Before any section
        </p>
        <ul className="space-y-2">{loose.map(itemRow)}</ul>
        {!loose.length ? (
          <p className="px-1 py-2 text-xs text-muted-foreground">
            Nothing here — drop an item to take it out of its section.
          </p>
        ) : null}
      </div>

      {sections.map((section, sectionIndex) => {
        const contents = inSection(section.id);
        return (
          <div
            key={section.id}
            draggable
            onDragStart={(event) => {
              event.dataTransfer.setData('text/plain', `section:${section.id}`);
              event.stopPropagation();
              startDrag({ kind: 'section', id: section.id });
            }}
            onDragEnd={endDrag}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              dropOnSection(section);
              endDrag();
            }}
            className={cn(
              'space-y-2 rounded-md border p-2',
              dragging?.kind === 'section' &&
                dragging.id === section.id &&
                'opacity-40',
            )}
          >
            <div className="flex items-center gap-2">
              <span aria-hidden className="cursor-grab text-muted-foreground">
                ⠿
              </span>
              <h3 className="flex-1 text-sm font-semibold">{section.heading}</h3>
              <button
                type="button"
                onClick={() => nudgeSection(section, -1)}
                disabled={sectionIndex === 0}
                aria-label={`Move section ${section.heading} up`}
                className="h-7 rounded border px-2 text-xs disabled:opacity-30"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => nudgeSection(section, 1)}
                disabled={sectionIndex === sections.length - 1}
                aria-label={`Move section ${section.heading} down`}
                className="h-7 rounded border px-2 text-xs disabled:opacity-30"
              >
                ↓
              </button>
            </div>
            <ul className="space-y-2">{contents.map(itemRow)}</ul>
            {!contents.length ? (
              <p className="px-1 py-2 text-xs text-muted-foreground">
                Empty — drop an item here.
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
