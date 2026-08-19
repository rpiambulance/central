'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export type EditorItem = {
  prompt: string;
  scoreType: string;
  /** One "value|Label" per line, for OPTIONS and MULTI_SELECT. */
  optionsText: string;
  /** NUMBER only. Kept as strings so a half-typed "-" is not thrown away. */
  minValue: string;
  maxValue: string;
  unit: string;
  /** Checklist items: empty inherits the checklist's own signing level. */
  signoffCredentialTypeIds: number[];
  /** Whether the trainee fills this in when asking for the evaluation. */
  traineeInput: 'NONE' | 'OPTIONAL' | 'REQUIRED';
};

export type EditorNode =
  | { kind: 'ITEM'; item: EditorItem }
  | { kind: 'GROUP'; heading: string; description: string; items: EditorItem[] };

export type CredentialOption = { id: number; key: string; name: string };

const FIELD = 'h-8 rounded-md border border-input bg-background px-2 text-sm';

const EVAL_TYPES = [
  { value: 'SCALE_1_5', label: 'Score 1–5' },
  { value: 'PASS_FAIL', label: 'Pass / fail' },
  { value: 'SHORT_TEXT', label: 'Short text' },
  { value: 'TEXT', label: 'Long text' },
  { value: 'NUMBER', label: 'Number' },
  { value: 'OPTIONS', label: 'Choose one' },
  { value: 'MULTI_SELECT', label: 'Choose any' },
  { value: 'HEADING', label: 'Heading (not a question)' },
];

const CHECKLIST_TYPES = [
  { value: 'SIGNOFF', label: 'Sign-off' },
  { value: 'HEADING', label: 'Heading (not signed)' },
];

const HAS_OPTIONS = ['OPTIONS', 'MULTI_SELECT'];

function blankItem(checklist: boolean): EditorItem {
  return {
    prompt: '',
    scoreType: checklist ? 'SIGNOFF' : 'SCALE_1_5',
    optionsText: '',
    minValue: '',
    maxValue: '',
    unit: '',
    signoffCredentialTypeIds: [],
    traineeInput: 'NONE',
  };
}

/** Reorders within a list, returning a copy. Out-of-range moves are ignored. */
function swap<T>(list: T[], index: number, by: -1 | 1): T[] {
  const target = index + by;
  if (target < 0 || target >= list.length) return list;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

function ItemFields({
  item,
  checklist,
  credentials,
  onChange,
}: {
  item: EditorItem;
  checklist: boolean;
  credentials: CredentialOption[];
  onChange: (patch: Partial<EditorItem>) => void;
}) {
  const types = checklist ? CHECKLIST_TYPES : EVAL_TYPES;

  return (
    <>
      <label className="grid flex-1 gap-1 text-xs text-muted-foreground">
        {item.scoreType === 'HEADING'
          ? 'Heading'
          : checklist
            ? 'Line'
            : 'Question'}
        <input
          value={item.prompt}
          onChange={(event) => onChange({ prompt: event.target.value })}
          className={`${FIELD} w-full`}
        />
      </label>
      {/* Who fills it in. Only meaningful on an evaluation a trainee can
          ask for, and meaningless against a heading. */}
      {!checklist && item.scoreType !== 'HEADING' ? (
        <label className="grid gap-1 text-xs text-muted-foreground">
          Trainee fills in
          <select
            value={item.traineeInput}
            onChange={(event) =>
              onChange({
                traineeInput: event.target
                  .value as EditorItem['traineeInput'],
              })
            }
            className={FIELD}
          >
            <option value="NONE">No — trainer only</option>
            <option value="OPTIONAL">May</option>
            <option value="REQUIRED">Must</option>
          </select>
        </label>
      ) : null}
      <label className="grid gap-1 text-xs text-muted-foreground">
        {checklist ? 'Kind' : 'Answer'}
        <select
          value={item.scoreType}
          onChange={(event) => onChange({ scoreType: event.target.value })}
          className={FIELD}
        >
          {types.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}

/**
 * A set of credentials, any one of which is enough. Checkboxes rather than a
 * multi-select list: the list is short, and a list box hides how many are
 * picked behind a scrollbar and needs a modifier key to pick a second.
 */
export function CredentialPicker({
  credentials,
  selected,
  onChange,
  emptyLabel,
}: {
  credentials: CredentialOption[];
  selected: number[];
  onChange: (ids: number[]) => void;
  /** What no selection means, when that is allowed. */
  emptyLabel?: string;
}) {
  const toggle = (id: number) =>
    onChange(
      selected.includes(id)
        ? selected.filter((value) => value !== id)
        : [...selected, id],
    );

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {credentials.map((credential) => (
        <label key={credential.id} className="cursor-pointer">
          <input
            type="checkbox"
            checked={selected.includes(credential.id)}
            onChange={() => toggle(credential.id)}
            className="peer sr-only"
          />
          <span className="block rounded-md border border-input px-2 py-1 text-xs transition-colors hover:bg-muted peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-ring">
            {credential.name}
          </span>
        </label>
      ))}
      {!selected.length && emptyLabel ? (
        <span className="text-xs text-muted-foreground">{emptyLabel}</span>
      ) : null}
    </div>
  );
}

/**
 * The checklist's own signing set, as a form field.
 *
 * Submitted as JSON in one hidden input: a checkbox group posts nothing at
 * all when everything is unchecked, which would read as "unchanged" rather
 * than "cleared" on the server.
 */
export function ChecklistLevelField({
  credentials,
  initial = [],
}: {
  credentials: CredentialOption[];
  initial?: number[];
}) {
  const [selected, setSelected] = useState<number[]>(initial);
  return (
    <div className="grid gap-1 text-xs text-muted-foreground">
      Signed off by — anyone holding any of these, or anything above it
      <input
        type="hidden"
        name="signoffCredentialTypeIds"
        value={JSON.stringify(selected)}
      />
      <CredentialPicker
        credentials={credentials}
        selected={selected}
        onChange={setSelected}
        emptyLabel="Pick at least one, or nobody can sign this checklist."
      />
    </div>
  );
}

/** The parts that need their own row: choices, and a number's bounds. */
function ItemExtras({
  item,
  checklist,
  credentials,
  onChange,
}: {
  item: EditorItem;
  checklist: boolean;
  credentials: CredentialOption[];
  onChange: (patch: Partial<EditorItem>) => void;
}) {
  if (checklist && item.scoreType === 'SIGNOFF') {
    return (
      <div className="mt-2 grid gap-1 text-xs text-muted-foreground">
        Signed by — leave empty to use the checklist&apos;s own
        <CredentialPicker
          credentials={credentials}
          selected={item.signoffCredentialTypeIds}
          onChange={(ids) => onChange({ signoffCredentialTypeIds: ids })}
          emptyLabel="(the checklist's own)"
        />
      </div>
    );
  }
  if (HAS_OPTIONS.includes(item.scoreType)) {
    return (
      <label className="mt-2 grid gap-1 text-xs text-muted-foreground">
        Choices — one per line, as value|Label
        <textarea
          value={item.optionsText}
          onChange={(event) => onChange({ optionsText: event.target.value })}
          rows={3}
          placeholder={'poor|Needs work\nok|Adequate\ngood|Strong'}
          className="w-full rounded-md border border-input bg-background px-2 py-1.5 font-mono text-sm"
        />
      </label>
    );
  }
  if (item.scoreType === 'NUMBER') {
    return (
      <div className="mt-2 flex flex-wrap items-end gap-2">
        <label className="grid gap-1 text-xs text-muted-foreground">
          Minimum (optional)
          <input
            value={item.minValue}
            onChange={(event) => onChange({ minValue: event.target.value })}
            inputMode="decimal"
            className={`${FIELD} w-28`}
          />
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Maximum (optional)
          <input
            value={item.maxValue}
            onChange={(event) => onChange({ maxValue: event.target.value })}
            inputMode="decimal"
            className={`${FIELD} w-28`}
          />
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Unit (optional)
          <input
            value={item.unit}
            onChange={(event) => onChange({ unit: event.target.value })}
            placeholder="minutes"
            className={`${FIELD} w-32`}
          />
        </label>
      </div>
    );
  }
  return null;
}

function MoveButtons({
  onUp,
  onDown,
  first,
  last,
}: {
  onUp: () => void;
  onDown: () => void;
  first: boolean;
  last: boolean;
}) {
  return (
    <>
      <button
        type="button"
        onClick={onUp}
        disabled={first}
        aria-label="Move up"
        className="h-8 rounded border px-2 text-xs disabled:opacity-30"
      >
        ↑
      </button>
      <button
        type="button"
        onClick={onDown}
        disabled={last}
        aria-label="Move down"
        className="h-8 rounded border px-2 text-xs disabled:opacity-30"
      >
        ↓
      </button>
    </>
  );
}

/**
 * Builds a form: any number of items, in any order, loose or inside a titled
 * group.
 *
 * Options are written one per line as "value|Label" — the value is stored, the
 * label displayed, so wording can change later without orphaning answers
 * already recorded. A line with no pipe uses its text for both.
 *
 * The whole structure is submitted as one JSON field rather than a spread of
 * indexed inputs: items move between containers, and names like `prompt-2-4`
 * become a second source of truth for the ordering that the state already
 * holds.
 */
export function TemplateEditor({
  initial,
  checklist = false,
  credentials = [],
}: {
  initial?: EditorNode[];
  checklist?: boolean;
  credentials?: CredentialOption[];
}) {
  const [nodes, setNodes] = useState<EditorNode[]>(
    initial?.length
      ? initial
      : [{ kind: 'ITEM', item: blankItem(checklist) }],
  );

  const patchNode = (index: number, next: EditorNode) =>
    setNodes(nodes.map((node, i) => (i === index ? next : node)));

  /** Moves an item to the top level, or into a group, keeping its content. */
  const moveTo = (from: { node: number; item?: number }, destination: string) => {
    const source = nodes[from.node];
    const item =
      from.item === undefined
        ? (source as { item: EditorItem }).item
        : (source as { items: EditorItem[] }).items[from.item];

    let next = nodes.map((node, i) => {
      if (i !== from.node) return node;
      if (from.item === undefined) return node;
      return {
        ...(node as Extract<EditorNode, { kind: 'GROUP' }>),
        items: (node as Extract<EditorNode, { kind: 'GROUP' }>).items.filter(
          (_, j) => j !== from.item,
        ),
      };
    });
    // Removing a loose item takes its node with it.
    if (from.item === undefined) next = next.filter((_, i) => i !== from.node);

    if (destination === 'top') {
      setNodes([...next, { kind: 'ITEM', item }]);
      return;
    }
    const target = Number(destination);
    // Indices shift when a loose item above the target is removed.
    const adjusted =
      from.item === undefined && from.node < target ? target - 1 : target;
    setNodes(
      next.map((node, i) =>
        i === adjusted && node.kind === 'GROUP'
          ? { ...node, items: [...node.items, item] }
          : node,
      ),
    );
  };

  const groupChoices = nodes
    .map((node, index) => ({ node, index }))
    .filter(({ node }) => node.kind === 'GROUP')
    .map(({ node, index }) => ({
      value: String(index),
      label:
        (node as Extract<EditorNode, { kind: 'GROUP' }>).heading ||
        `Group ${index + 1}`,
    }));

  return (
    <div className="space-y-2">
      <input type="hidden" name="nodes" value={JSON.stringify(nodes)} />

      {nodes.map((node, index) =>
        node.kind === 'GROUP' ? (
          <fieldset key={index} className="rounded-md border-2 border-dashed p-3">
            <div className="flex flex-wrap items-end gap-2">
              <label className="grid flex-1 gap-1 text-xs text-muted-foreground">
                Group heading
                <input
                  value={node.heading}
                  onChange={(event) =>
                    patchNode(index, { ...node, heading: event.target.value })
                  }
                  className={`${FIELD} w-full font-medium`}
                />
              </label>
              <span className="flex items-center gap-1 pb-0.5">
                <MoveButtons
                  first={index === 0}
                  last={index === nodes.length - 1}
                  onUp={() => setNodes(swap(nodes, index, -1))}
                  onDown={() => setNodes(swap(nodes, index, 1))}
                />
                <button
                  type="button"
                  onClick={() => {
                    // Its items come with it, so say so before they vanish.
                    setNodes(nodes.filter((_, i) => i !== index));
                  }}
                  className="h-8 rounded border px-2 text-xs text-destructive"
                >
                  remove group
                </button>
              </span>
            </div>
            <label className="mt-2 grid gap-1 text-xs text-muted-foreground">
              Note under the heading (optional)
              <input
                value={node.description}
                onChange={(event) =>
                  patchNode(index, { ...node, description: event.target.value })
                }
                className={`${FIELD} w-full`}
              />
            </label>

            <div className="mt-3 space-y-2 border-l-2 pl-3">
              {node.items.map((item, itemIndex) => (
                <div key={itemIndex} className="rounded-md border p-3">
                  <div className="flex flex-wrap items-end gap-2">
                    <ItemFields
                      item={item}
                      checklist={checklist}
                      credentials={credentials}
                      onChange={(patch) =>
                        patchNode(index, {
                          ...node,
                          items: node.items.map((it, j) =>
                            j === itemIndex ? { ...it, ...patch } : it,
                          ),
                        })
                      }
                    />
                    <span className="flex items-center gap-1 pb-0.5">
                      <MoveButtons
                        first={itemIndex === 0}
                        last={itemIndex === node.items.length - 1}
                        onUp={() =>
                          patchNode(index, {
                            ...node,
                            items: swap(node.items, itemIndex, -1),
                          })
                        }
                        onDown={() =>
                          patchNode(index, {
                            ...node,
                            items: swap(node.items, itemIndex, 1),
                          })
                        }
                      />
                      <select
                        value={String(index)}
                        onChange={(event) =>
                          moveTo(
                            { node: index, item: itemIndex },
                            event.target.value,
                          )
                        }
                        aria-label="Move to"
                        className="h-8 rounded border bg-background px-1 text-xs"
                      >
                        <option value={String(index)} disabled>
                          move to…
                        </option>
                        <option value="top">Out of the group</option>
                        {groupChoices
                          .filter((choice) => choice.value !== String(index))
                          .map((choice) => (
                            <option key={choice.value} value={choice.value}>
                              {choice.label}
                            </option>
                          ))}
                      </select>
                      <button
                        type="button"
                        onClick={() =>
                          patchNode(index, {
                            ...node,
                            items: node.items.filter((_, j) => j !== itemIndex),
                          })
                        }
                        className="h-8 rounded border px-2 text-xs text-destructive"
                      >
                        remove
                      </button>
                    </span>
                  </div>
                  <ItemExtras
                    item={item}
                    checklist={checklist}
                    credentials={credentials}
                    onChange={(patch) =>
                      patchNode(index, {
                        ...node,
                        items: node.items.map((it, j) =>
                          j === itemIndex ? { ...it, ...patch } : it,
                        ),
                      })
                    }
                  />
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  patchNode(index, {
                    ...node,
                    items: [...node.items, blankItem(checklist)],
                  })
                }
              >
                + Add to this group
              </Button>
            </div>
          </fieldset>
        ) : (
          <div key={index} className="rounded-md border p-3">
            <div className="flex flex-wrap items-end gap-2">
              <ItemFields
                item={node.item}
                checklist={checklist}
                credentials={credentials}
                onChange={(patch) =>
                  patchNode(index, { ...node, item: { ...node.item, ...patch } })
                }
              />
              <span className="flex items-center gap-1 pb-0.5">
                <MoveButtons
                  first={index === 0}
                  last={index === nodes.length - 1}
                  onUp={() => setNodes(swap(nodes, index, -1))}
                  onDown={() => setNodes(swap(nodes, index, 1))}
                />
                {groupChoices.length ? (
                  <select
                    value=""
                    onChange={(event) =>
                      moveTo({ node: index }, event.target.value)
                    }
                    aria-label="Move into a group"
                    className="h-8 rounded border bg-background px-1 text-xs"
                  >
                    <option value="" disabled>
                      move to…
                    </option>
                    {groupChoices.map((choice) => (
                      <option key={choice.value} value={choice.value}>
                        {choice.label}
                      </option>
                    ))}
                  </select>
                ) : null}
                <button
                  type="button"
                  onClick={() => setNodes(nodes.filter((_, i) => i !== index))}
                  className="h-8 rounded border px-2 text-xs text-destructive"
                >
                  remove
                </button>
              </span>
            </div>
            <ItemExtras
              item={node.item}
              checklist={checklist}
              credentials={credentials}
              onChange={(patch) =>
                patchNode(index, { ...node, item: { ...node.item, ...patch } })
              }
            />
          </div>
        ),
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            setNodes([...nodes, { kind: 'ITEM', item: blankItem(checklist) }])
          }
        >
          + Add item
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            setNodes([
              ...nodes,
              { kind: 'GROUP', heading: '', description: '', items: [] },
            ])
          }
        >
          + Add group
        </Button>
      </div>
    </div>
  );
}
