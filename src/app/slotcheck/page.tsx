'use client';

import { useState } from 'react';
import { Option, SearchSelect } from '@/components/search-select';

const people = ['Bruce, Dan', 'McDonald, Toby'].map((label, i) => ({
  value: String(i + 1),
  label,
}));

/** The night crew slot control, minus its server actions. */
export default function SlotCheck() {
  const [current, setCurrent] = useState('— vacant —');
  return (
    <div className="mx-auto max-w-xl space-y-3 p-6">
      <SearchSelect
        label={current}
        triggerClassName="h-7 w-36 px-1 text-xs"
        choices={people}
        onFreeText={(text) => setCurrent(text)}
        standing={
          <>
            <Option onPick={() => setCurrent('— vacant —')}>— vacant —</Option>
            <Option onPick={() => setCurrent('CLOSED')}>Label…</Option>
          </>
        }
        onPick={(v) =>
          setCurrent(people.find((p) => p.value === v)?.label ?? '')
        }
      />
      <p className="text-sm text-muted-foreground">slot reads: {current}</p>
    </div>
  );
}
