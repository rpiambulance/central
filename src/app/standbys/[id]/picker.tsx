'use client';

import { Option, SearchSelect } from '@/components/search-select';

export interface Choice {
  id: number;
  label: string;
  /** Other spellings a search should match — a legal name, usually. */
  aliases?: string[];
}

/**
 * A box you pick from by typing, for the lists on the board that are too
 * long to scroll.
 *
 * The same control the night crew grid uses — a trigger the size of the
 * field it replaces, opening a search box above the choices — because a
 * second thing that looked nearly the same would be a second thing to learn.
 *
 * Where it differs is what counts as an answer. The roster is a closed list:
 * a name nobody knows is a typo. A place is not: a standby opened against an
 * ad-hoc event has no venue at all, and somewhere nobody set up is still
 * somewhere, so `allowFreeText` offers what was typed as its own choice.
 */
export function Picker({
  choices,
  value,
  placeholder,
  disabled,
  allowFreeText = false,
  className = '',
  onPick,
}: {
  choices: Choice[];
  /** What the trigger reads when nothing has been picked this time. */
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  allowFreeText?: boolean;
  className?: string;
  onPick: (picked: { id: number | null; text: string }) => void;
}) {
  const chosen = value?.trim() ?? '';

  return (
    <SearchSelect
      label={
        chosen ? (
          chosen
        ) : (
          <span className="text-muted-foreground">{placeholder ?? 'Choose…'}</span>
        )
      }
      ariaLabel={placeholder}
      disabled={disabled}
      triggerClassName={`h-8 px-2 text-sm ${className}`}
      choices={choices.map((choice) => ({
        value: String(choice.id),
        label: choice.label,
        aliases: choice.aliases,
      }))}
      selected={choices.find((choice) => choice.label === chosen)?.id?.toString()}
      standing={
        chosen ? (
          <Option onPick={() => onPick({ id: null, text: '' })}>— none —</Option>
        ) : null
      }
      onPick={(value) => {
        const found = choices.find((choice) => String(choice.id) === value);
        onPick({ id: found?.id ?? null, text: found?.label ?? '' });
      }}
      onFreeText={
        allowFreeText ? (text) => onPick({ id: null, text }) : undefined
      }
    />
  );
}
