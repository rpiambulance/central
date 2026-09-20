"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

/** How much of a list to show before it scrolls, near enough, in pixels. */
const POPOVER_HEIGHT = 260;

export interface SearchChoice {
  /** Carried back to the caller untouched, so ids and free text can share. */
  value: string;
  label: string;
  /** Other spellings a search should match — a preferred name, a venue. */
  aliases?: string[];
}

/** One choice in the list. A button so a click lands the same way a tap does. */
export function Option({
  onPick,
  selected,
  children,
}: {
  onPick: () => void;
  selected?: boolean;
  children: React.ReactNode;
}) {
  return (
    <li>
      <button
        type="button"
        role="option"
        aria-selected={selected}
        onClick={onPick}
        className={cn(
          "w-full truncate rounded px-2 py-1 text-left text-xs hover:bg-accent hover:text-accent-foreground",
          selected && "bg-accent/60 font-medium",
        )}
      >
        {children}
      </button>
    </li>
  );
}

/**
 * A search box and the choices under it.
 *
 * Pulled out of the popover because a dialog wants the same thing without
 * one: there is room in a dialog to leave the list open, and a list that
 * floats over a modal has to win an argument with it about z-index, focus
 * and what an outside click means. Same matching and same rows either way,
 * so the two cannot drift.
 *
 * Typing filters; Enter takes the first match, which is how three letters
 * and a return become a choice at speed.
 */
export function SearchList({
  choices,
  onPick,
  selected,
  standing,
  onFreeText,
  searchPlaceholder = "Search…",
  emptyText = "Nothing by that name.",
  inputClassName,
  listClassName,
  autoFocus,
  onCancel,
  onDone,
}: {
  choices: SearchChoice[];
  onPick: (value: string) => void;
  selected?: string;
  /** Choices that are not search results — "vacant", "label…". */
  standing?: React.ReactNode;
  /**
   * Given when something that matches nothing is still an answer: a place
   * nobody has set up is still a place, and a slot takes a label as well as
   * a member. Offered only once the search has run out of real ones — while
   * a name is still reachable, what was typed is a search.
   */
  onFreeText?: (text: string) => void;
  searchPlaceholder?: string;
  emptyText?: string;
  inputClassName?: string;
  listClassName?: string;
  autoFocus?: boolean;
  /** Escape. Left to bubble when nobody wants it, so a dialog can close. */
  onCancel?: () => void;
  /** Called just before an answer goes out, for whatever has to shut. */
  onDone?: () => void;
}) {
  const [query, setQuery] = useState("");

  const needle = query.trim().toLowerCase();
  const matches = needle
    ? choices.filter((choice) =>
        [choice.label, ...(choice.aliases ?? [])].some((name) =>
          name.toLowerCase().includes(needle),
        ),
      )
    : choices;

  const pick = (value: string) => {
    onDone?.();
    onPick(value);
  };

  const takeTyped = () => {
    const typed = query.trim();
    if (!typed || !onFreeText) return;
    onDone?.();
    onFreeText(typed);
  };

  return (
    <>
      <input
        autoFocus={autoFocus}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape" && onCancel) {
            event.preventDefault();
            onCancel();
          }
          if (event.key === "Enter") {
            event.preventDefault();
            if (matches.length) pick(matches[0].value);
            else takeTyped();
          }
        }}
        placeholder={searchPlaceholder}
        className={cn(
          "mb-1 h-7 w-full rounded-md border border-input bg-background px-2 text-xs",
          inputClassName,
        )}
      />
      <ul role="listbox" className={cn("max-h-56 overflow-y-auto", listClassName)}>
        {needle ? null : standing}
        {/* Only when nothing matches. While a real name is still reachable,
            what was typed is a search rather than an answer — offering it
            first turned "toby" into a label instead of McDonald, Toby. */}
        {onFreeText && needle && !matches.length ? (
          <Option onPick={takeTyped}>Use “{query.trim()}”</Option>
        ) : null}
        {matches.map((choice) => (
          <Option
            key={choice.value}
            onPick={() => pick(choice.value)}
            selected={choice.value === selected}
          >
            {choice.label}
          </Option>
        ))}
        {needle && !matches.length && !onFreeText ? (
          <li className="px-2 py-1 text-xs text-muted-foreground">
            {emptyText}
          </li>
        ) : null}
      </ul>
    </>
  );
}

/**
 * A trigger the size of the field it replaces, opening a search box above
 * the same choices.
 *
 * Written for the night crew grid, where the list is the whole active roster
 * and a table cell is no place to scroll one. Everywhere else that grew a
 * long list — who is on a standby, where a unit is — uses it rather than a
 * second thing that looks nearly the same.
 *
 * Escape closes and gives the trigger its focus back.
 */
export function SearchSelect({
  label,
  choices,
  onPick,
  selected,
  disabled,
  triggerClassName,
  popoverClassName,
  ariaLabel,
  searchPlaceholder,
  emptyText,
  standing,
  onFreeText,
}: {
  /** What the trigger reads right now. */
  label: React.ReactNode;
  choices: SearchChoice[];
  onPick: (value: string) => void;
  selected?: string;
  disabled?: boolean;
  triggerClassName?: string;
  popoverClassName?: string;
  ariaLabel?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  standing?: React.ReactNode;
  onFreeText?: (text: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [at, setAt] = useState<{ left: number; top: number; up: boolean }>({
    left: 0,
    top: 0,
    up: false,
  });

  /**
   * The list is drawn on the body rather than beside the trigger.
   *
   * Every table in this app scrolls sideways, which makes the table a
   * clipping box: a list opened from the last row was cut off at the edge
   * of it. Anchored to the trigger and flipped above when the room below
   * has run out.
   */
  const place = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const below = window.innerHeight - rect.bottom;
    const up = below < POPOVER_HEIGHT && rect.top > below;
    setAt({
      // Kept on screen when the trigger is close to the right-hand edge.
      left: Math.max(8, Math.min(rect.left, window.innerWidth - 232)),
      top: up ? rect.top - 4 : rect.bottom + 4,
      up,
    });
  };

  useLayoutEffect(() => {
    if (open) place();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    // Capture, so scrolling inside the table moves it too, not only the page.
    const follow = () => place();
    window.addEventListener("scroll", follow, true);
    window.addEventListener("resize", follow);
    return () => {
      window.removeEventListener("scroll", follow, true);
      window.removeEventListener("resize", follow);
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    setTimeout(() => triggerRef.current?.focus(), 0);
  };

  return (
    <span className="relative inline-block">
      <button
        type="button"
        ref={triggerRef}
        onClick={() => setOpen((was) => !was)}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "truncate rounded-md border border-input bg-background text-left",
          disabled && "opacity-60",
          triggerClassName,
        )}
      >
        {label}
      </button>
      {open
        ? createPortal(
            <>
              <div className="fixed inset-0 z-40" onClick={close} />
              <div
                style={{
                  left: at.left,
                  top: at.up ? undefined : at.top,
                  bottom: at.up ? window.innerHeight - at.top : undefined,
                }}
                className={cn(
                  "fixed z-50 w-56 rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
                  popoverClassName,
                )}
              >
                <SearchList
                  choices={choices}
                  onPick={onPick}
                  selected={selected}
                  standing={standing}
                  onFreeText={onFreeText}
                  searchPlaceholder={searchPlaceholder}
                  emptyText={emptyText}
                  autoFocus
                  onCancel={close}
                  onDone={close}
                />
              </div>
            </>,
            document.body,
          )
        : null}
    </span>
  );
}
