'use client';

import { useEffect, useState } from 'react';
import {
  MessageSquare,
  Plus,
  Stethoscope,
  Truck,
  Users,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { QuickAction } from './quick-dialogs';

const ACTIONS: Array<{
  id: QuickAction;
  label: string;
  icon: React.ReactNode;
}> = [
  {
    id: 'encounter',
    label: 'New encounter',
    icon: <Stethoscope className="h-4 w-4" />,
  },
  { id: 'person', label: 'Who else is here', icon: <Users className="h-4 w-4" /> },
  { id: 'unit', label: 'Put a unit in service', icon: <Truck className="h-4 w-4" /> },
  { id: 'note', label: 'Note', icon: <MessageSquare className="h-4 w-4" /> },
];

/**
 * The four things worth doing from anywhere on the board.
 *
 * Sits over the page rather than in it, because the whole point is not
 * having to be anywhere in particular to use it. Each one opens a dialog;
 * this only says which.
 */
export function QuickActionsFab({
  onPick,
  disabled,
}: {
  onPick: (action: QuickAction) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // A closed standby is still worth reading; there is just nothing here to
  // do to it.
  if (disabled) return null;

  return (
    <>
      {open ? (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      ) : null}
      <div className="fixed right-4 bottom-4 z-50 flex flex-col items-end gap-2">
        {open ? (
          <div className="flex flex-col gap-1 rounded-lg border bg-popover p-1 shadow-lg">
            {ACTIONS.map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={() => {
                  setOpen(false);
                  onPick(action.id);
                }}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium whitespace-nowrap hover:bg-accent hover:text-accent-foreground"
              >
                {action.icon}
                {action.label}
              </button>
            ))}
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => setOpen((was) => !was)}
          aria-expanded={open}
          aria-label={open ? 'Close quick actions' : 'Quick actions'}
          className={cn(
            'flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-colors',
            open
              ? 'bg-muted text-muted-foreground hover:bg-muted/80'
              : 'bg-primary text-primary-foreground hover:bg-primary/90',
          )}
        >
          {open ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
        </button>
      </div>
    </>
  );
}
