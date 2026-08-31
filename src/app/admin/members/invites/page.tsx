import QRCode from 'qrcode';
import { api, ApiError } from '@/lib/api';
import { formatDateOnly } from '@/lib/format';
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
import { closeInvite, createInvite } from './actions';

type Invite = {
  code: string;
  label: string | null;
  createdAt: string;
  closedAt: string | null;
  expiresAt: string | null;
  maxUses: number | null;
  uses: number;
  createdBy: { firstName: string; lastName: string } | null;
  _count: { requests: number };
};

const FIELD = 'h-8 rounded-md border border-input bg-background px-2 text-sm';

export const dynamic = 'force-dynamic';

function NoAccess() {
  return (
    <Card className="mx-auto mt-12 max-w-md">
      <CardHeader>
        <CardTitle>You don&apos;t have access</CardTitle>
        <CardDescription>Invite codes need members:write.</CardDescription>
      </CardHeader>
    </Card>
  );
}

/**
 * The link somebody scans, with the code already in it.
 *
 * Built from the portal's own address rather than the request's, so a QR
 * code printed from a laptop on the office network does not send people to
 * a hostname only that laptop can resolve.
 */
function inviteUrl(code: string): string {
  const base = (process.env.AUTH_URL ?? 'http://localhost:3000').replace(/\/$/, '');
  return `${base}/request-account?invite-code=${encodeURIComponent(code)}`;
}

export default async function InvitesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  let invites: Invite[];
  try {
    invites = await api<Invite[]>('/v1/requests/invites');
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) return <NoAccess />;
    throw err;
  }

  // Rendered server-side as inline SVG: no client library, nothing fetched,
  // and it prints at whatever size the paper wants.
  const codes = await Promise.all(
    invites
      .filter((invite) => !invite.closedAt)
      .map(async (invite) => ({
        code: invite.code,
        svg: await QRCode.toString(inviteUrl(invite.code), {
          type: 'svg',
          margin: 1,
          width: 160,
        }),
      })),
  );
  const qr = new Map(codes.map((entry) => [entry.code, entry.svg]));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invite codes"
        description="How somebody outside the agency asks for an account. There is no other way in."
      />
      <ErrorBanner message={error} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">New code</CardTitle>
          <CardDescription>
            Give it a label so you know later what it was for. A limit and an
            end date are optional — a code with neither works until somebody
            closes it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createInvite} className="flex flex-wrap items-end gap-2">
            <label className="grid gap-1 text-xs text-muted-foreground">
              What it is for
              <input
                name="label"
                placeholder="Autumn open house"
                className={`${FIELD} w-56`}
              />
            </label>
            <label className="grid gap-1 text-xs text-muted-foreground">
              Max uses (optional)
              <input type="number" name="maxUses" min={1} className={`${FIELD} w-28`} />
            </label>
            <label className="grid gap-1 text-xs text-muted-foreground">
              Last day (optional)
              <input type="date" name="expiresAt" className={FIELD} />
            </label>
            <Button type="submit" size="sm">
              Create code
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-3">
        {invites.map((invite) => {
          const spent =
            invite.maxUses !== null && invite.uses >= invite.maxUses;
          const expired =
            !!invite.expiresAt && new Date(invite.expiresAt) < new Date();
          const dead = !!invite.closedAt || spent || expired;
          return (
            <Card key={invite.code} className={dead ? 'opacity-70' : undefined}>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                  <span className="font-mono tracking-widest">{invite.code}</span>
                  {invite.label ? (
                    <span className="text-sm font-normal">{invite.label}</span>
                  ) : null}
                  {invite.closedAt ? (
                    <Badge variant="secondary">closed</Badge>
                  ) : spent ? (
                    <Badge variant="secondary">used up</Badge>
                  ) : expired ? (
                    <Badge variant="secondary">expired</Badge>
                  ) : (
                    <Badge>open</Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  {invite.uses} {invite.uses === 1 ? 'use' : 'uses'}
                  {invite.maxUses !== null ? ` of ${invite.maxUses}` : ''} ·{' '}
                  {invite._count.requests} request
                  {invite._count.requests === 1 ? '' : 's'}
                  {invite.expiresAt
                    ? ` · until ${formatDateOnly(invite.expiresAt)}`
                    : ''}
                  {invite.createdBy
                    ? ` · made by ${invite.createdBy.firstName} ${invite.createdBy.lastName}`
                    : ''}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap items-start gap-4">
                {!dead && qr.has(invite.code) ? (
                  <div className="grid gap-1">
                    {/* Server-rendered SVG: safe to inline, and it is our own
                        output rather than anything a user supplied. */}
                    <div
                      className="rounded-md bg-white p-2"
                      dangerouslySetInnerHTML={{ __html: qr.get(invite.code)! }}
                    />
                    <span className="text-[10px] text-muted-foreground">
                      Print or show this
                    </span>
                  </div>
                ) : null}
                <div className="grid flex-1 gap-2">
                  <label className="grid gap-1 text-xs text-muted-foreground">
                    Link to share
                    <input
                      readOnly
                      value={inviteUrl(invite.code)}
                      onFocus={undefined}
                      className={`${FIELD} w-full font-mono text-xs`}
                    />
                  </label>
                  {!invite.closedAt ? (
                    <form action={closeInvite.bind(null, invite.code)}>
                      <Button
                        type="submit"
                        size="sm"
                        variant="outline"
                        className="text-destructive"
                      >
                        Close this code
                      </Button>
                    </form>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {!invites.length ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No invite codes yet.
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
