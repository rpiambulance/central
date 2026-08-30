'use client';

import { useRef, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { addAttachment, removeAttachment } from './actions';

export type Attachment = {
  id: string;
  title: string;
  fileName: string;
  sizeBytes: number;
};

const FIELD = 'h-9 rounded-md border border-input bg-background px-2 text-sm';

/**
 * Files on an evaluation: as many as the evaluator needs, each with a title.
 *
 * The title is the point. "PCR page 1" and "12-lead" tell somebody reading
 * this a year later what they are looking at; three files called scan.pdf
 * tell them nothing, and renaming a file after the fact is not something
 * anybody does.
 *
 * The warning, where the form asks for one, sits above the picker rather
 * than beside the submit button — after the file is chosen is too late to
 * think about what is in it.
 */
export function Attachments({
  evaluationId,
  attachments,
  requirement,
  phiWarning,
  editable,
}: {
  evaluationId: number;
  attachments: Attachment[];
  requirement: 'NONE' | 'OPTIONAL' | 'REQUIRED';
  phiWarning: boolean;
  /** False once submitted: the attachments are part of the record then. */
  editable: boolean;
}) {
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, start] = useTransition();

  if (requirement === 'NONE') return null;

  const add = () => {
    const file = fileInput.current?.files?.[0];
    if (!title.trim()) return setError('Give the file a title — what is it?');
    if (!file) return setError('Choose a file.');
    setError(null);
    const body = new FormData();
    body.set('title', title.trim());
    body.set('file', file);
    start(async () => {
      const result = await addAttachment(evaluationId, body);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setTitle('');
      if (fileInput.current) fileInput.current.value = '';
    });
  };

  return (
    <div className="grid gap-3 rounded-md border p-3">
      <div className="flex flex-wrap items-baseline gap-2">
        <h2 className="text-sm font-semibold">Attachments</h2>
        <span className="text-xs text-muted-foreground">
          {requirement === 'REQUIRED'
            ? 'At least one is needed before this can be submitted.'
            : 'Optional.'}
        </span>
      </div>

      {attachments.length ? (
        <ul className="grid gap-1">
          {attachments.map((file) => (
            <li key={file.id} className="flex flex-wrap items-center gap-2 text-sm">
              <a
                href={`/evals/attachments/${file.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium underline underline-offset-2"
              >
                {file.title}
              </a>
              <span className="text-xs text-muted-foreground">
                {file.fileName} · {Math.max(1, Math.round(file.sizeBytes / 1024))} KB
              </span>
              {editable ? (
                <form action={removeAttachment.bind(null, evaluationId, file.id)}>
                  <Button
                    type="submit"
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-xs text-destructive"
                  >
                    remove
                  </Button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Nothing attached yet.</p>
      )}

      {editable ? (
        <>
          {phiWarning ? (
            <p
              role="note"
              className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
            >
              <strong>Before you upload:</strong> whatever you attach must
              contain no protected health information — no names, addresses,
              dates of birth, or anything else that identifies a patient.
              Redact it first if you are unsure.
            </p>
          ) : null}
          <div className="flex flex-wrap items-end gap-2">
            <label className="grid gap-1 text-xs text-muted-foreground">
              Title
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="PCR page 1"
                className={`${FIELD} w-56`}
              />
            </label>
            <label className="grid gap-1 text-xs text-muted-foreground">
              File
              <input type="file" ref={fileInput} className="text-sm" />
            </label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={add}
              disabled={busy}
            >
              {busy ? 'Attaching…' : 'Attach'}
            </Button>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </>
      ) : null}
    </div>
  );
}
