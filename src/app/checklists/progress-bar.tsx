/** How far through a checklist someone is, at a glance. */
export function ProgressBar({
  signed,
  total,
}: {
  signed: number;
  total: number;
}) {
  const pct = total ? Math.round((signed / total) * 100) : 0;
  return (
    <span className="flex items-center gap-2">
      <span
        className="h-1.5 w-24 overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label={`${signed} of ${total} signed off`}
      >
        <span
          className={`block h-full rounded-full ${
            signed === total && total > 0 ? 'bg-emerald-600' : 'bg-primary'
          }`}
          style={{ width: `${pct}%` }}
        />
      </span>
      <span className="text-xs whitespace-nowrap text-muted-foreground">
        {signed}/{total}
      </span>
    </span>
  );
}
