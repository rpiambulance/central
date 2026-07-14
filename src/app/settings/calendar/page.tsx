import { api } from '@/lib/api';
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
import { createToken, deleteToken } from './actions';

type IcsToken = {
  id: number;
  token: string;
  scope: 'MY_SCHEDULE' | 'MY_SCHEDULE_AND_ALL_EVENTS';
  createdAt: string;
};

const SCOPES: Array<{
  scope: IcsToken['scope'];
  title: string;
  description: string;
}> = [
  {
    scope: 'MY_SCHEDULE',
    title: 'My Schedule',
    description: 'Your crew shifts and the events you signed up for.',
  },
  {
    scope: 'MY_SCHEDULE_AND_ALL_EVENTS',
    title: 'My Schedule + All Events',
    description: 'Your crew shifts plus every agency event.',
  },
];

const API_URL = process.env.RAMPART_API_URL ?? 'http://localhost:3001';

export default async function CalendarSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ error }, tokens] = await Promise.all([
    searchParams,
    api<IcsToken[]>('/v1/calendar/tokens'),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendar Feeds"
        description="Subscribe to your Rampart schedule from Google Calendar, Apple Calendar, or any app that supports ICS feeds."
      />
      <ErrorBanner message={error} />

      <div className="grid gap-4 md:grid-cols-2">
        {SCOPES.map(({ scope, title, description }) => {
          const token = tokens.find((t) => t.scope === scope);
          return (
            <Card key={scope}>
              <CardHeader>
                <CardTitle className="text-base">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {token ? (
                  <>
                    <code className="block w-full overflow-x-auto rounded-md bg-muted px-3 py-2 text-xs whitespace-nowrap">
                      {`${API_URL}/v1/calendar/feed/${token.token}.ics`}
                    </code>
                    <div className="flex gap-2">
                      <form action={createToken.bind(null, scope)}>
                        <Button type="submit" variant="outline" size="sm">
                          Regenerate
                        </Button>
                      </form>
                      <form action={deleteToken.bind(null, token.id)}>
                        <Button type="submit" variant="ghost" size="sm">
                          Delete
                        </Button>
                      </form>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Regenerating or deleting invalidates the old URL.
                    </p>
                  </>
                ) : (
                  <form action={createToken.bind(null, scope)}>
                    <Button type="submit" size="sm">
                      Create feed
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
