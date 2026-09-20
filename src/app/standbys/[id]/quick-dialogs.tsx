'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SearchList } from '@/components/search-select';
import { displayName, searchableNames } from '@/lib/name';
import { ROLE_LABEL, type Config, type Personnel, type Person, type Unit } from './types';

/** The four things somebody logging a standby does over and over. */
export type QuickAction = 'encounter' | 'person' | 'unit' | 'note';

const FIELD = 'h-8 w-full rounded-md border border-input bg-background px-2 text-sm';
const SEARCH = 'h-8 text-sm';

/**
 * The quick actions, each as its own dialog.
 *
 * The board is long — units, encounters, who is here, the timeline, the
 * totals — and the thing somebody at a gate needs is one field of one
 * section. Scrolling to it, on a phone, in the dark, while talking to
 * somebody, is the part that was slow. These open over whatever is on
 * screen, take the one answer they need, and close.
 *
 * Each opens with its own field already focused, because a dialog that
 * needs a click before it will take a word has only moved the problem.
 */
export function QuickDialogs({
  action,
  onClose,
  roster,
  already,
  designators,
  units,
  locations,
  onAddPerson,
  onAddUnit,
  onOpenEncounter,
  onNote,
}: {
  action: QuickAction | null;
  onClose: () => void;
  roster: Person[];
  already: number[];
  designators: Config['designators'];
  units: Unit[];
  locations: Array<{ id: number; name: string }>;
  onAddPerson: (
    who: { memberId?: number; name?: string },
    role: Personnel['role'],
  ) => void;
  onAddUnit: (body: Record<string, unknown>) => void;
  onOpenEncounter: (body: Record<string, unknown>) => void;
  onNote: (text: string) => void;
}) {
  return (
    <>
      <NoteDialog
        open={action === 'note'}
        onClose={onClose}
        onSave={onNote}
      />
      <PersonDialog
        open={action === 'person'}
        onClose={onClose}
        roster={roster}
        already={already}
        onAdd={onAddPerson}
      />
      <UnitDialog
        open={action === 'unit'}
        onClose={onClose}
        designators={designators}
        onAdd={onAddUnit}
      />
      <EncounterDialog
        open={action === 'encounter'}
        onClose={onClose}
        units={units}
        locations={locations}
        onOpen={onOpenEncounter}
      />
    </>
  );
}

/** Base UI hands back the reason too; only the flag matters here. */
function openChange(onClose: () => void) {
  return (next: boolean) => {
    if (!next) onClose();
  };
}

function NoteDialog({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (text: string) => void;
}) {
  const [text, setText] = useState('');
  const save = () => {
    const written = text.trim();
    if (!written) return;
    onSave(written);
    setText('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={openChange(onClose)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Note</DialogTitle>
          <DialogDescription>
            Goes on the timeline against the standby, with the time and who
            wrote it.
          </DialogDescription>
        </DialogHeader>
        <textarea
          autoFocus
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            // A note is a line. Shift holds it open for the ones that aren't.
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              save();
            }
          }}
          rows={3}
          placeholder="What happened…"
          className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
        />
        <DialogFooter>
          <Button size="sm" disabled={!text.trim()} onClick={save}>
            Add note
          </Button>
          <span className="text-xs text-muted-foreground">
            Enter to add, Shift+Enter for a new line
          </span>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PersonDialog({
  open,
  onClose,
  roster,
  already,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  roster: Person[];
  already: number[];
  onAdd: (
    who: { memberId?: number; name?: string },
    role: Personnel['role'],
  ) => void;
}) {
  const [role, setRole] = useState<Personnel['role']>('CREW');
  const here = new Set(already);
  const choices = roster
    .filter((member) => !here.has(member.id))
    .map((member) => ({
      value: String(member.id),
      label: displayName(member),
      aliases: searchableNames(member),
    }));

  return (
    <Dialog open={open} onOpenChange={openChange(onClose)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Who else is here</DialogTitle>
          <DialogDescription>
            Somebody the roster has never heard of — mutual aid, a visiting
            crew — goes on by whatever you type.
          </DialogDescription>
        </DialogHeader>
        <label className="flex items-center gap-2 text-sm">
          <span className="whitespace-nowrap text-muted-foreground">On as</span>
          <select
            value={role}
            onChange={(event) =>
              setRole(event.target.value as Personnel['role'])
            }
            className={`${FIELD} w-auto`}
          >
            {(['CREW', 'EES', 'EES_IC', 'SUPPORT'] as const).map((option) => (
              <option key={option} value={option}>
                {ROLE_LABEL[option]}
              </option>
            ))}
          </select>
        </label>
        {/* Picking is the whole action: the role is already set above, so a
            separate Add button would only be a second place to press. */}
        <div>
          <SearchList
            choices={choices}
            autoFocus
            searchPlaceholder="Search the roster, or write a name…"
            inputClassName={SEARCH}
            listClassName="max-h-64"
            onPick={(value) => {
              onAdd({ memberId: Number(value) }, role);
              onClose();
            }}
            onFreeText={(text) => {
              onAdd({ name: text }, role);
              onClose();
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function UnitDialog({
  open,
  onClose,
  designators,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  designators: Config['designators'];
  onAdd: (body: Record<string, unknown>) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={openChange(onClose)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Put a unit in service</DialogTitle>
          <DialogDescription>
            One of the agency&apos;s own, or anything else you name.
          </DialogDescription>
        </DialogHeader>
        <div>
          <SearchList
            choices={designators.map((designator) => ({
              value: String(designator.id),
              label: designator.name,
            }))}
            autoFocus
            searchPlaceholder="Which unit…"
            inputClassName={SEARCH}
            onPick={(value) => {
              onAdd({ designatorId: Number(value) });
              onClose();
            }}
            onFreeText={(text) => {
              onAdd({ name: text });
              onClose();
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EncounterDialog({
  open,
  onClose,
  units,
  locations,
  onOpen,
}: {
  open: boolean;
  onClose: () => void;
  units: Unit[];
  locations: Array<{ id: number; name: string }>;
  onOpen: (body: Record<string, unknown>) => void;
}) {
  const [unitId, setUnitId] = useState('');
  const [where, setWhere] = useState<{ id: number | null; text: string }>({
    id: null,
    text: '',
  });

  const open_ = () => {
    onOpen({
      ...(unitId ? { unitId: Number(unitId) } : {}),
      ...(where.id
        ? { locationId: where.id }
        : where.text
          ? { locationText: where.text }
          : {}),
    });
    setUnitId('');
    setWhere({ id: null, text: '' });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={openChange(onClose)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New encounter</DialogTitle>
          <DialogDescription>
            Opens as a minor injury treated and released. The rest is filled
            in on the card afterwards.
          </DialogDescription>
        </DialogHeader>

        <label className="flex items-center gap-2 text-sm">
          <span className="whitespace-nowrap text-muted-foreground">Unit</span>
          <select
            value={unitId}
            onChange={(event) => setUnitId(event.target.value)}
            className={`${FIELD} w-auto`}
          >
            <option value="">not yet</option>
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
              </option>
            ))}
          </select>
        </label>

        <div>
          <div className="mb-1 flex items-center gap-2 text-sm">
            <span className="whitespace-nowrap text-muted-foreground">Where</span>
            {where.text ? (
              <>
                <span className="font-medium">{where.text}</span>
                <button
                  type="button"
                  onClick={() => setWhere({ id: null, text: '' })}
                  className="text-xs text-muted-foreground underline underline-offset-2"
                >
                  clear
                </button>
              </>
            ) : (
              <span className="text-xs text-muted-foreground">
                not said yet
              </span>
            )}
          </div>
          <SearchList
            choices={locations.map((location) => ({
              value: String(location.id),
              label: location.name,
            }))}
            selected={where.id ? String(where.id) : undefined}
            autoFocus
            searchPlaceholder="Search the places, or write one…"
            inputClassName={SEARCH}
            onPick={(value) => {
              const found = locations.find(
                (location) => String(location.id) === value,
              );
              setWhere({ id: found?.id ?? null, text: found?.name ?? '' });
            }}
            onFreeText={(text) => setWhere({ id: null, text })}
          />
        </div>

        <DialogFooter>
          <Button size="sm" onClick={open_}>
            Open encounter
          </Button>
          <span className="text-xs text-muted-foreground">
            Both are optional — an encounter can be opened on nothing but the
            time.
          </span>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
