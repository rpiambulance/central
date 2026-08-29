'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { submitCertification } from './actions';

export type FieldRequirement = 'HIDDEN' | 'OPTIONAL' | 'REQUIRED';

export type SubmittableCertType = {
  id: number;
  name: string;
  defaultValidityMonths: number | null;
  identifierField?: FieldRequirement;
  issuedAtField?: FieldRequirement;
  expiresAtField?: FieldRequirement;
  documentField?: FieldRequirement;
};

const FIELD =
  'h-8 rounded-md border border-input bg-background px-2 text-sm';

/**
 * Submitting a certification, asking only for what its type actually wants.
 *
 * A form that asks every question of every certification teaches people to
 * skip fields, and then the one type that genuinely needs a card number gets
 * submissions without one. The rules come from the type, so the questions
 * change when the certification does.
 *
 * The server enforces the same rules — this only decides what is on screen.
 * A field configured as hidden is dropped there rather than trusted, because
 * this form is not the only way a submission can arrive.
 */
export function CertSubmitForm({ types }: { types: SubmittableCertType[] }) {
  const [typeId, setTypeId] = useState('');
  const chosen = types.find((type) => String(type.id) === typeId);

  // Before a certification is picked there is nothing to tailor to, so
  // everything shows as optional — the same form as before this existed.
  const rule = (
    field:
      | 'identifierField'
      | 'issuedAtField'
      | 'expiresAtField'
      | 'documentField',
  ): FieldRequirement => chosen?.[field] ?? 'OPTIONAL';

  const label = (text: string, requirement: FieldRequirement) =>
    requirement === 'REQUIRED' ? `${text} (required)` : `${text} (optional)`;

  return (
    <form action={submitCertification} className="flex flex-wrap items-end gap-2">
      <label className="grid gap-1 text-xs text-muted-foreground">
        Certification
        <select
          name="typeId"
          required
          value={typeId}
          onChange={(event) => setTypeId(event.target.value)}
          className={FIELD}
        >
          <option value="" disabled>
            Select…
          </option>
          {types.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </select>
      </label>

      {rule('identifierField') !== 'HIDDEN' ? (
        <label className="grid gap-1 text-xs text-muted-foreground">
          {label('Number', rule('identifierField'))}
          <input
            name="identifier"
            required={rule('identifierField') === 'REQUIRED'}
            className={FIELD}
          />
        </label>
      ) : null}

      {rule('issuedAtField') !== 'HIDDEN' ? (
        <label className="grid gap-1 text-xs text-muted-foreground">
          {label('Issued', rule('issuedAtField'))}
          <input
            name="issuedAt"
            type="date"
            required={rule('issuedAtField') === 'REQUIRED'}
            className={FIELD}
          />
        </label>
      ) : null}

      {rule('expiresAtField') !== 'HIDDEN' ? (
        <label className="grid gap-1 text-xs text-muted-foreground">
          {label('Expires', rule('expiresAtField'))}
          <input
            name="expiresAt"
            type="date"
            required={rule('expiresAtField') === 'REQUIRED'}
            className={FIELD}
          />
          {chosen?.defaultValidityMonths &&
          rule('expiresAtField') !== 'REQUIRED' ? (
            <span className="text-[10px]">
              Left blank, worked out from the issue date.
            </span>
          ) : null}
        </label>
      ) : null}

      {rule('documentField') !== 'HIDDEN' ? (
        <label className="grid gap-1 text-xs text-muted-foreground">
          {label('Card photo or scan', rule('documentField'))}
          <input
            name="document"
            type="file"
            accept="image/*,application/pdf"
            required={rule('documentField') === 'REQUIRED'}
            className="text-sm"
          />
        </label>
      ) : null}

      <Button type="submit" size="sm" variant="outline" className="h-8">
        Submit
      </Button>
    </form>
  );
}
