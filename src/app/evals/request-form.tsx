'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScoreInput, type Item } from './score-input';

export type RequestTemplate = {
  id: number;
  name: string;
  version: number;
  items: Item[];
  groups?: Array<{ id: number; heading: string; items: Item[] }>;
};

export type Trainer = { id: number; firstName: string; lastName: string };

const FIELD = 'h-9 rounded-md border border-input bg-background px-2 text-sm';

/** Every item on a template, in one list, wherever it sits. */
function allItems(template: RequestTemplate): Item[] {
  return [
    ...template.items,
    ...(template.groups ?? []).flatMap((group) => group.items),
  ];
}

/**
 * A trainee asking a trainer for an evaluation.
 *
 * The form's questions change with the template, so it is picked first and
 * the trainee's own fields appear beneath. Only the items marked for trainee
 * input are shown: the rest are the trainer's to answer, and showing them
 * greyed out would only invite the question of why they cannot be filled.
 */
export function RequestForm({
  templates,
  trainers,
  action,
}: {
  templates: RequestTemplate[];
  trainers: Trainer[];
  action: (
    items: Array<{ id: number; scoreType: string }>,
    formData: FormData,
  ) => void;
}) {
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? 0);
  const template = templates.find((t) => t.id === templateId) ?? templates[0];
  const mine = template
    ? allItems(template).filter((item) => item.traineeInput !== 'NONE')
    : [];

  if (!templates.length || !trainers.length) {
    return (
      <p className="text-sm text-muted-foreground">
        {templates.length
          ? 'Nobody is set up to write evaluations yet.'
          : 'No evaluation forms have been published yet.'}
      </p>
    );
  }

  return (
    <form
      action={action.bind(
        null,
        mine.map((item) => ({ id: item.id, scoreType: item.scoreType })),
      )}
      className="space-y-4"
    >
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Evaluation</span>
          <select
            name="templateId"
            value={templateId}
            onChange={(event) => setTemplateId(Number(event.target.value))}
            className={FIELD}
          >
            {templates.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name} (v{option.version})
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Trainer</span>
          <select name="evaluatorId" required className={FIELD}>
            {trainers.map((trainer) => (
              <option key={trainer.id} value={trainer.id}>
                {trainer.lastName}, {trainer.firstName}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Eval date</span>
          <input type="date" name="evalDate" className={FIELD} />
        </label>
      </div>

      {mine.length ? (
        <fieldset className="space-y-3 rounded-md border p-4">
          <legend className="px-1 text-sm font-medium">Your part</legend>
          <p className="text-xs text-muted-foreground">
            The trainer sees these when they open it.
          </p>
          {mine.map((item) => (
            <div key={item.id} className="space-y-1.5">
              <p className="text-sm font-medium">
                {item.prompt}
                {item.traineeInput === 'REQUIRED' ? (
                  <span className="ml-1 text-destructive" aria-hidden>
                    *
                  </span>
                ) : null}
              </p>
              <ScoreInput item={item} />
            </div>
          ))}
          {mine.some((item) => item.traineeInput === 'REQUIRED') ? (
            <p className="text-xs text-muted-foreground">
              <span aria-hidden>*</span> needed before this can be sent.
            </p>
          ) : null}
        </fieldset>
      ) : null}

      <Button type="submit" size="sm">
        Ask for this evaluation
      </Button>
    </form>
  );
}
