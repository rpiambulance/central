/**
 * A titled run of items on a form.
 *
 * Loose items are plain bordered rows, so a group cannot be another one of
 * those or the two read alike. It gets a tinted header strip and its items are
 * inset behind a rule, which makes both boundaries legible at a glance: where
 * the group starts, and which items belong to it.
 */
export function FormGroup({
  heading,
  description,
  children,
  as: Element = 'section',
}: {
  heading: string;
  description?: string | null;
  children: React.ReactNode;
  /** `fieldset` when the items inside are inputs. */
  as?: 'section' | 'fieldset';
}) {
  const Title = Element === 'fieldset' ? 'legend' : 'h3';
  return (
    <Element className="overflow-hidden rounded-lg border-2 bg-muted/20">
      <div className="border-b bg-muted/60 px-4 py-2">
        <Title className="text-sm font-semibold tracking-tight">
          {heading}
        </Title>
        {description ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className="space-y-3 border-l-4 border-muted-foreground/20 bg-background p-4">
        {children}
      </div>
    </Element>
  );
}
