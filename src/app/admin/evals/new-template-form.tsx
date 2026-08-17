'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { TemplateEditor, type CredentialOption } from './template-editor';

const FIELD = 'h-8 rounded-md border border-input bg-background px-2 text-sm';

/**
 * Creating a form. The kind is picked first because it changes what the rest
 * of the form means: an evaluation is answered once, a checklist is signed
 * line by line, so the item types on offer and the questions asked about
 * authority differ between them.
 */
export function NewTemplateForm({
  action,
  credentials,
}: {
  action: (formData: FormData) => void;
  credentials: CredentialOption[];
}) {
  const [kind, setKind] = useState<'EVALUATION' | 'CHECKLIST'>('EVALUATION');
  const checklist = kind === 'CHECKLIST';

  return (
    <Card>
      <CardHeader>
        <CardTitle>New form</CardTitle>
        <CardDescription>
          {checklist
            ? 'A checklist is signed off a line at a time, by whoever holds the credential that line calls for. Attach it to a credential in Settings and everyone working toward that credential picks it up.'
            : 'An evaluation is filled in once and signed by both parties. Add as many items as it needs, loose or inside a group.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Re-keyed on kind so switching clears items of the wrong type. */}
        <form action={action} className="space-y-4" key={kind}>
          <input type="hidden" name="kind" value={kind} />
          <div className="flex flex-wrap items-end gap-3">
            <label className="grid gap-1 text-xs text-muted-foreground">
              Name
              <input
                type="text"
                name="name"
                required
                className={`${FIELD} w-72`}
              />
            </label>
            <label className="grid gap-1 text-xs text-muted-foreground">
              Kind
              <select
                value={kind}
                onChange={(event) =>
                  setKind(event.target.value as 'EVALUATION' | 'CHECKLIST')
                }
                className={FIELD}
              >
                <option value="EVALUATION">Evaluation</option>
                <option value="CHECKLIST">Checklist</option>
              </select>
            </label>
            {checklist ? (
              <label className="grid gap-1 text-xs text-muted-foreground">
                Signed off by
                <select
                  name="signoffCredentialTypeId"
                  required
                  defaultValue=""
                  className={`${FIELD} w-64`}
                >
                  <option value="" disabled>
                    Select a credential…
                  </option>
                  {credentials.map((credential) => (
                    <option key={credential.id} value={credential.id}>
                      {credential.name} or above
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>

          <TemplateEditor checklist={checklist} credentials={credentials} />

          <Button type="submit" size="sm">
            Create {checklist ? 'checklist' : 'form'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
