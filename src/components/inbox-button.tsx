import Link from 'next/link';
import { Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * The inbox, always within reach in the top right.
 *
 * The count is unread messages. Something outstanding but already read still
 * deserves notice, so tasks with nothing unread show a plain dot rather than
 * a number the member would read as "you have five new messages".
 */
export function InboxButton({
  unread,
  tasks,
}: {
  unread: number;
  tasks: number;
}) {
  const label = [
    unread ? `${unread} unread` : null,
    tasks ? `${tasks} to do` : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <Button
      render={<Link href="/inbox" />}
      variant="ghost"
      size="sm"
      className="relative h-9 px-2"
      aria-label={label ? `Inbox — ${label}` : 'Inbox'}
      title={label ? `Inbox — ${label}` : 'Inbox'}
    >
      <Inbox aria-hidden className="size-5" />
      {unread ? (
        <span className="absolute -top-0.5 right-0 min-w-4 rounded-full bg-primary px-1 text-[10px] leading-4 font-medium text-primary-foreground">
          {unread > 99 ? '99+' : unread}
        </span>
      ) : tasks ? (
        <span
          aria-hidden
          className="absolute top-1 right-1.5 size-2 rounded-full bg-primary"
        />
      ) : null}
    </Button>
  );
}
