import QRCode from 'qrcode';
import { api } from '@/lib/api';
import { displayName } from '@/lib/name';
import { formatDateTime } from '@/lib/format';
import { prefers12Hour } from '@/lib/me';
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
import { createLink, revokeLink } from './actions';
import { ResetCounter } from './reset-button';

type Link = {
  id: number;
  token: string;
  label: string | null;
  createdAt: string;
  lastSeenAt: string | null;
  revokedAt: string | null;
  createdBy: {
    firstName: string;
    preferredFirstName?: string | null;
    lastName: string;
  } | null;
};

const FIELD =
  'h-9 w-full rounded-md border border-input bg-background px-3 text-sm';

/**
 * The links that open a display, and the numbers on the board.
 *
 * Each screen gets its own link so one can be revoked without darkening the
 * rest, and each is shown as a QR code — the way a link actually gets from
 * here onto a television is somebody standing in the bay with a phone.
 */
export default async function LinksPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; done?: string }>;
}) {
  const { error, done } = await searchParams;
  const [links, counters, hour12] = await Promise.all([
    api<Link[]>('/v1/headsup/links'),
    api<{ calls: number; mishaps: number }>('/v1/headsup/counters'),
    prefers12Hour(),
  ]);

  // Built from the portal's own address rather than the request's, so a link
  // printed from a laptop does not point at a hostname only that laptop
  // resolves.
  const base = (process.env.AUTH_URL ?? 'http://localhost:3000').replace(
    /\/$/,
    '',
  );
  const displayUrl = (token: string) =>
    `${base}/headsup?token=${encodeURIComponent(token)}`;

  const withCodes = await Promise.all(
    links.map(async (link) => ({
      ...link,
      url: displayUrl(link.token),
      svg: link.revokedAt
        ? null
        : await QRCode.toString(displayUrl(link.token), {
            type: 'svg',
            margin: 1,
            width: 120,
          }),
    })),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Heads up displays"
        description="The links that open the whiteboard on a screen, and the counters it shows."
      />
      <ErrorBanner message={error} />
      {done ? (
        <p className="rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
          {done === 'made'
            ? 'Link created. Point a screen at it, or scan the code.'
            : done === 'revoked'
              ? 'Revoked — that screen will stop loading the board.'
              : done === 'reset-calls'
                ? 'The calls count has started again. Every dispatch is still recorded.'
                : 'The mishap count has started again. Nothing was deleted.'}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">The numbers on the board</CardTitle>
          <CardDescription>
            Each counts from the last time it was started again, not from the
            beginning of the records — so a season can be closed without
            losing what was in it.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 rounded-md border p-3">
            <p className="text-sm text-muted-foreground">Calls to date</p>
            <p className="text-4xl font-semibold tabular-nums">
              {counters.calls}
            </p>
            <ResetCounter counter="calls" label="Calls" current={counters.calls} />
          </div>
          <div className="space-y-2 rounded-md border p-3">
            <p className="text-sm text-muted-foreground">Dispatch mishaps</p>
            <p className="text-4xl font-semibold tabular-nums">
              {counters.mishaps}
            </p>
            <ResetCounter
              counter="mishaps"
              label="Mishaps"
              current={counters.mishaps}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Display links</CardTitle>
          <CardDescription>
            One per screen. A link is the whole credential, so give each
            screen its own — then losing one costs a revocation rather than
            every board in the building.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action={createLink} className="flex items-end gap-2">
            <label className="grid flex-1 gap-1 text-xs text-muted-foreground">
              Which screen (optional, but future you will want it)
              <input
                name="label"
                maxLength={100}
                placeholder="Bay television"
                className={FIELD}
              />
            </label>
            <Button type="submit" size="sm">
              Create a link
            </Button>
          </form>

          {withCodes.length ? (
            <ul className="grid gap-3">
              {withCodes.map((link) => (
                <li
                  key={link.id}
                  className={`flex flex-wrap items-center gap-4 rounded-md border p-3 ${
                    link.revokedAt ? 'opacity-60' : ''
                  }`}
                >
                  {link.svg ? (
                    <div
                      className="shrink-0 rounded bg-white p-1 [&_svg]:h-24 [&_svg]:w-24"
                      dangerouslySetInnerHTML={{ __html: link.svg }}
                    />
                  ) : null}
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-sm font-medium">
                      {link.label ?? 'Unlabelled screen'}
                      {link.revokedAt ? ' — revoked' : ''}
                    </p>
                    <p className="break-all font-mono text-xs text-muted-foreground">
                      {link.url}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Made{' '}
                      {formatDateTime(link.createdAt, hour12)}
                      {link.createdBy
                        ? ` by ${displayName(link.createdBy)}`
                        : ''}
                      {' · '}
                      {link.lastSeenAt
                        ? `last used ${formatDateTime(link.lastSeenAt, hour12)}`
                        : 'never used'}
                    </p>
                  </div>
                  {link.revokedAt ? null : (
                    <form action={revokeLink.bind(null, link.id)}>
                      <Button
                        type="submit"
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-destructive"
                      >
                        Revoke
                      </Button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No display links yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
