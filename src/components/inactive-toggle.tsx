import Link from 'next/link';

/**
 * Switches a member listing between the active roster and the full one.
 * Render only for members holding VIEW_INACTIVE — the API ignores the
 * parameter for everyone else regardless.
 */
export function InactiveToggle({
  basePath,
  showingInactive,
}: {
  basePath: string;
  showingInactive: boolean;
}) {
  return (
    <Link
      href={showingInactive ? basePath : `${basePath}?showInactive=1`}
      className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
    >
      {showingInactive ? 'Hide inactive members' : 'Show inactive members'}
    </Link>
  );
}
