'use client';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useUndo } from './undo-context';

/** Single undo control for the auto-saving grid, with the shortcut hint. */
export function UndoButton() {
  const { undo, canUndo, lastLabel, pending, error } = useUndo();
  const isMac =
    typeof navigator !== 'undefined' && navigator.platform.startsWith('Mac');
  const shortcut = isMac ? '⌘Z' : 'Ctrl+Z';

  return (
    <div className="flex items-center gap-3">
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              onClick={undo}
              disabled={!canUndo || pending}
            />
          }
        >
          ↩ Undo{pending ? '…' : ''}
        </TooltipTrigger>
        <TooltipContent>
          {canUndo
            ? `Undo: ${lastLabel} (${shortcut})`
            : `Changes save automatically — press ${shortcut} to undo the last one`}
        </TooltipContent>
      </Tooltip>
      <span className="text-xs text-muted-foreground">
        Changes save automatically · {shortcut} to undo
      </span>
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </div>
  );
}
