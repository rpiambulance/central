'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useTransition,
} from 'react';
import { setDefaultSlotValue, setSlotValue, type SlotValue } from './actions';

export interface UndoEntry {
  kind: 'slot' | 'default';
  target: number; // crewId or weekday
  position: string;
  previous: SlotValue;
  label: string; // e.g. "Thu Jul 16 — Crew Chief"
}

interface UndoContextValue {
  push: (entry: UndoEntry) => void;
  undo: () => void;
  canUndo: boolean;
  lastLabel?: string;
  pending: boolean;
  error?: string;
  setError: (message?: string) => void;
}

const UndoContext = createContext<UndoContextValue | null>(null);

export function useUndo(): UndoContextValue {
  const value = useContext(UndoContext);
  if (!value) throw new Error('useUndo outside UndoProvider');
  return value;
}

/**
 * Page-level undo stack for the auto-saving schedule grid. Each saved change
 * records the slot's previous value; Undo (button or Ctrl/Cmd+Z) re-applies
 * it through the same server action, so undo history survives re-renders but
 * intentionally not page reloads.
 */
export function UndoProvider({ children }: { children: React.ReactNode }) {
  const [stack, setStack] = useState<UndoEntry[]>([]);
  const [error, setErrorState] = useState<string>();
  const [pending, startTransition] = useTransition();
  const stackRef = useRef(stack);
  stackRef.current = stack;

  const push = useCallback((entry: UndoEntry) => {
    setStack((prev) => [...prev.slice(-49), entry]);
  }, []);

  const setError = useCallback((message?: string) => {
    setErrorState(message);
  }, []);

  const undo = useCallback(() => {
    const entry = stackRef.current[stackRef.current.length - 1];
    if (!entry) return;
    setStack((prev) => prev.slice(0, -1));
    startTransition(async () => {
      const result =
        entry.kind === 'slot'
          ? await setSlotValue(entry.target, entry.position, entry.previous)
          : await setDefaultSlotValue(entry.target, entry.position, entry.previous);
      setErrorState(
        result.ok ? undefined : `Undo failed: ${result.error ?? 'unknown error'}`,
      );
    });
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && !event.shiftKey && event.key === 'z') {
        const target = event.target as HTMLElement | null;
        // don't hijack undo inside text fields
        if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return;
        if (!stackRef.current.length) return;
        event.preventDefault();
        undo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undo]);

  return (
    <UndoContext.Provider
      value={{
        push,
        undo,
        canUndo: stack.length > 0,
        lastLabel: stack[stack.length - 1]?.label,
        pending,
        error,
        setError,
      }}
    >
      {children}
    </UndoContext.Provider>
  );
}
