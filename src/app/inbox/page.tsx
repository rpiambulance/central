import Link from 'next/link';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { prefers12Hour } from '@/lib/me';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ErrorBanner } from '@/components/error-banner';
import { PageHeader } from '@/components/page-header';
import { completeTask, markAllRead, markRead, startTask } from './actions';

type InboxMessage = {
  id: number;
  type: string;
  subject: string;
  body: string;
  isTask: boolean;
  actionLabel: string | null;
  actionUrl: string | null;
  completedAt: string | null;
  readAt: string | null;
  createdAt: string;
};

const FILTERS = [
  { key: '', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'tasks', label: 'To do' },
];

// Counts move as messages arrive; never serve this from a cache.
export const dynamic = 'force-dynamic';

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; error?: string }>;
}) {
  const { filter, error } = await searchParams;
  const active = FILTERS.some((f) => f.key === filter) ? (filter ?? '') : '';
  const hour12 = await prefers12Hour();
  const messages = await api<InboxMessage[]>(
    `/v1/inbox${active ? `?filter=${active}` : ''}`,
  );
  const unread = messages.filter((m) => !m.readAt).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inbox"
        description="Everything the portal has sent you, and anything waiting on you."
      />
      <ErrorBanner message={error} />

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((entry) => (
          <Link
            key={entry.key}
            href={entry.key ? `/inbox?filter=${entry.key}` : '/inbox'}
            className={
              entry.key === active
                ? 'rounded-md bg-secondary px-3 py-1 text-sm font-medium text-secondary-foreground'
                : 'rounded-md px-3 py-1 text-sm text-muted-foreground hover:text-foreground'
            }
          >
            {entry.label}
          </Link>
        ))}
        {unread ? (
          <form action={markAllRead} className="ml-auto">
            <Button type="submit" size="sm" variant="outline">
              Mark all read
            </Button>
          </form>
        ) : null}
      </div>

      {messages.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {active === 'tasks'
              ? 'Nothing waiting on you.'
              : active === 'unread'
                ? 'Nothing unread.'
                : 'Your inbox is empty.'}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {messages.map((message) => {
            const outstanding = message.isTask && !message.completedAt;
            return (
              <Card
                key={message.id}
                className={
                  outstanding
                    ? 'border-primary/40'
                    : message.readAt
                      ? 'opacity-80'
                      : undefined
                }
              >
                <CardHeader>
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-base">
                      {message.subject}
                    </CardTitle>
                    {outstanding ? <Badge>To do</Badge> : null}
                    {message.isTask && message.completedAt ? (
                      <Badge variant="secondary">Done</Badge>
                    ) : null}
                    {!message.readAt ? (
                      <Badge variant="outline">New</Badge>
                    ) : null}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {formatDateTime(message.createdAt, hour12)}
                    </span>
                  </div>
                  <CardDescription className="whitespace-pre-line">
                    {message.body}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center gap-2">
                  {outstanding && message.actionUrl ? (
                    <form
                      action={startTask.bind(null, message.id, message.actionUrl)}
                    >
                      <Button type="submit" size="sm">
                        {message.actionLabel ?? 'Open'}
                      </Button>
                    </form>
                  ) : null}
                  {outstanding ? (
                    <form action={completeTask.bind(null, message.id)}>
                      <Button type="submit" size="sm" variant="outline">
                        Mark done
                      </Button>
                    </form>
                  ) : null}
                  {!message.readAt ? (
                    <form action={markRead.bind(null, message.id)}>
                      <Button
                        type="submit"
                        size="sm"
                        variant="ghost"
                        className="text-muted-foreground"
                      >
                        Mark read
                      </Button>
                    </form>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
