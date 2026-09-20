'use client';

import { useState } from 'react';
import {
  Plus,
  Users,
  Stethoscope,
  MessageSquare,
  Truck,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: () => void;
  disabled?: boolean;
}

export function QuickActionsFab({
  onNewEncounter,
  onAddPerson,
  onAddUnit,
  onAddNote,
  closedAt,
}: {
  onNewEncounter: () => void;
  onAddPerson: () => void;
  onAddUnit: () => void;
  onAddNote: () => void;
  closedAt?: string | null;
}) {
  const [open, setOpen] = useState(false);

  const actions: QuickAction[] = [
    {
      id: 'encounter',
      label: 'New encounter',
      icon: <Stethoscope className="h-5 w-5" />,
      action: () => {
        onNewEncounter();
        setOpen(false);
      },
      disabled: !!closedAt,
    },
    {
      id: 'person',
      label: 'Add person',
      icon: <Users className="h-5 w-5" />,
      action: () => {
        onAddPerson();
        setOpen(false);
      },
      disabled: !!closedAt,
    },
    {
      id: 'unit',
      label: 'Add unit',
      icon: <Truck className="h-5 w-5" />,
      action: () => {
        onAddUnit();
        setOpen(false);
      },
      disabled: !!closedAt,
    },
    {
      id: 'note',
      label: 'Log note',
      icon: <MessageSquare className="h-5 w-5" />,
      action: () => {
        onAddNote();
        setOpen(false);
      },
      disabled: !!closedAt,
    },
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      {/* Menu items */}
      {open && (
        <div className="flex flex-col gap-2 rounded-lg border bg-background shadow-lg p-1">
          {actions.map((act) => (
            <button
              key={act.id}
              onClick={act.action}
              disabled={act.disabled}
              className={cn(
                'flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors',
                act.disabled
                  ? 'text-muted-foreground opacity-50 cursor-not-allowed'
                  : 'text-foreground hover:bg-accent hover:text-accent-foreground',
              )}
              title={act.disabled ? 'Standby is closed' : act.label}
            >
              {act.icon}
              <span>{act.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* FAB button */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-all',
          open
            ? 'bg-muted text-muted-foreground hover:bg-muted/80'
            : 'bg-accent text-accent-foreground hover:bg-accent/90',
        )}
        aria-label={open ? 'Close menu' : 'Open quick actions'}
      >
        {open ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
      </button>
    </div>
  );
}
