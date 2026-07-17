import { api, ApiError } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ErrorBanner } from '@/components/error-banner';
import { PageHeader } from '@/components/page-header';
import { createToken, revokeToken } from './actions';
import { PERMISSION_INFO, groupPermissions } from '@/lib/permissions';

type Token = {
  id: number;
  name: string;
  permissions: string[];
  expiresAt: string | null;
  revokedAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  owner: { id: number; firstName: string; lastName: string } | null;
};

const inputCls =
  'h-8 rounded-md border border-input bg-background px-2 text-sm';

function NoAccess() {
  return (
    <Card className="mx-auto mt-12 max-w-md">
      <CardHeader>
        <CardTitle>You don&apos;t have access</CardTitle>
        <CardDescription>
          Token administration requires additional permissions. If you think
          you should have access, contact an officer.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

function Dash() {
  return <span className="text-muted-foreground">&mdash;</span>;
}

function tokenStatus(token: Token): 'active' | 'revoked' | 'expired' {
  if (token.revokedAt) return 'revoked';
  if (token.expiresAt && new Date(token.expiresAt) < new Date()) {
    return 'expired';
  }
  return 'active';
}

function StatusBadge({ status }: { status: 'active' | 'revoked' | 'expired' }) {
  if (status === 'active') return <Badge>Active</Badge>;
  if (status === 'revoked') return <Badge variant="destructive">Revoked</Badge>;
  return <Badge variant="secondary">Expired</Badge>;
}

export default async function AdminTokensPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; secret?: string }>;
}) {
  const { error, secret } = await searchParams;

  let tokens: Token[];
  let permissionCatalog: string[];
  try {
    [tokens, permissionCatalog] = await Promise.all([
      api<Token[]>('/v1/tokens'),
      api<string[]>('/v1/roles/permissions'),
    ]);
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) return <NoAccess />;
    throw err;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="API tokens"
        description="Machine tokens with explicit permission subsets."
      />
      <ErrorBanner message={error} />

      {secret ? (
        <div
          role="alert"
          className="space-y-2 rounded-md border border-primary/50 bg-primary/10 px-4 py-3 text-sm"
        >
          <p className="font-medium">
            Token created. Copy the secret now — it will never be shown again.
          </p>
          <code className="block break-all rounded-md bg-background px-3 py-2 font-mono text-sm">
            {secret}
          </code>
        </div>
      ) : null}

      <section className="space-y-2">
        <h2 className="text-lg font-medium tracking-tight">Tokens</h2>
        {tokens.length ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Last used</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...tokens]
                  .sort((a, b) => {
                    const order = { active: 0, expired: 1, revoked: 2 } as const;
                    const byStatus =
                      order[tokenStatus(a)] - order[tokenStatus(b)];
                    return byStatus !== 0
                      ? byStatus
                      : a.name.localeCompare(b.name);
                  })
                  .map((token) => {
                  const status = tokenStatus(token);
                  return (
                    <TableRow key={token.id}>
                      <TableCell className="font-medium whitespace-nowrap">
                        {token.name}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex max-w-xs flex-wrap gap-1">
                          {[...token.permissions].sort().map((permission) => (
                            <Badge
                              key={permission}
                              variant="secondary"
                              title={PERMISSION_INFO[permission]}
                            >
                              {permission}
                            </Badge>
                          ))}
                        </div>
                        <details className="mt-1 max-w-xs text-xs text-muted-foreground">
                          <summary className="cursor-pointer">
                            What this token allows
                          </summary>
                          <ul className="mt-1 list-disc space-y-0.5 pl-4">
                            {[...token.permissions].sort().map((permission) => (
                              <li key={permission}>
                                {PERMISSION_INFO[permission] ?? permission}
                              </li>
                            ))}
                          </ul>
                        </details>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {token.owner ? (
                          `${token.owner.lastName}, ${token.owner.firstName}`
                        ) : (
                          <Dash />
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {token.expiresAt ? (
                          formatDateTime(token.expiresAt)
                        ) : (
                          <Dash />
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {token.lastUsedAt ? (
                          formatDateTime(token.lastUsedAt)
                        ) : (
                          <Dash />
                        )}
                      </TableCell>
                      <TableCell>
                        {status === 'active' ? (
                          <form action={revokeToken.bind(null, token.id)}>
                            <Button
                              type="submit"
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs text-destructive"
                            >
                              revoke
                            </Button>
                          </form>
                        ) : (
                          <Dash />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No tokens.</p>
        )}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Create token</CardTitle>
          <CardDescription>
            The secret is shown exactly once after creation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createToken} className="space-y-4">
            <div className="flex flex-wrap items-end gap-4">
              <label className="grid gap-1 text-xs text-muted-foreground">
                Name
                <input
                  type="text"
                  name="name"
                  required
                  className={`${inputCls} w-56`}
                />
              </label>
              <label className="grid gap-1 text-xs text-muted-foreground">
                Expires (optional)
                <input type="date" name="expiresAt" className={inputCls} />
              </label>
            </div>
            <fieldset className="space-y-2">
              <legend className="text-xs text-muted-foreground">
                Permissions
              </legend>
              <div className="space-y-3">
                {groupPermissions(permissionCatalog).map(({ group, permissions }) => (
                  <div key={group}>
                    <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {group}
                    </h3>
                    <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
                      {permissions.map((permission) => (
                        <label
                          key={permission}
                          className="flex items-start gap-2 text-sm"
                        >
                          <input
                            type="checkbox"
                            name="permissions"
                            value={permission}
                            className="mt-1"
                          />
                          <span>
                            <code className="text-xs">{permission}</code>
                            <span className="block text-xs text-muted-foreground">
                              {PERMISSION_INFO[permission] ?? ''}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </fieldset>
            <Button type="submit" size="sm">
              Create token
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
