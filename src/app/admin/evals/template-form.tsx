export const ITEM_ROWS = 10;

export const SCORE_TYPES = ['SCALE_1_5', 'PASS_FAIL', 'TEXT'] as const;

export type TemplateItem = {
  order: number;
  prompt: string;
  scoreType: (typeof SCORE_TYPES)[number];
};

const inputCls =
  'h-8 rounded-md border border-input bg-background px-2 text-sm';

/** Fixed set of optional item rows; blank prompts are dropped by the action. */
export function TemplateItemRows({ items = [] }: { items?: TemplateItem[] }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: ITEM_ROWS }, (_, i) => {
        const item = items[i];
        return (
          <div key={i} className="flex flex-wrap items-end gap-2">
            <label className="grid gap-1 text-xs text-muted-foreground">
              Item {i + 1} prompt
              <input
                type="text"
                name={`prompt-${i}`}
                defaultValue={item?.prompt ?? ''}
                className={`${inputCls} w-96 max-w-full`}
              />
            </label>
            <label className="grid gap-1 text-xs text-muted-foreground">
              Score type
              <select
                name={`scoreType-${i}`}
                defaultValue={item?.scoreType ?? 'SCALE_1_5'}
                className={inputCls}
              >
                <option value="SCALE_1_5">Scale 1–5</option>
                <option value="PASS_FAIL">Pass / fail</option>
                <option value="TEXT">Text</option>
              </select>
            </label>
          </div>
        );
      })}
    </div>
  );
}
