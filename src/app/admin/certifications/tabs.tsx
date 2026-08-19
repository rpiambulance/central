import Link from 'next/link';

/**
 * One page in two views: the queue of submissions to verify, and the report
 * of what is coming up for renewal. Both are "how healthy are our certs",
 * which is why they share a navigation entry and switch here instead.
 */
export function CertificationTabs({
  active,
}: {
  active: 'queue' | 'expiring';
}) {
  const tab = (href: string, label: string, current: boolean) => (
    <Link
      href={href}
      aria-current={current ? 'page' : undefined}
      className={
        current
          ? 'rounded-md bg-secondary px-3 py-1 text-sm font-medium text-secondary-foreground'
          : 'rounded-md px-3 py-1 text-sm text-muted-foreground hover:text-foreground'
      }
    >
      {label}
    </Link>
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      {tab('/admin/certifications', 'Verification queue', active === 'queue')}
      {tab('/admin/certifications/expiring', 'Expiring', active === 'expiring')}
    </div>
  );
}
