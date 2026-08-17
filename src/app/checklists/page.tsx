import Link from 'next/link';
import { api } from '@/lib/api';
import { formatCredKey } from '@/lib/format';
import { myPermissions } from '@/lib/me';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PageHeader } from '@/components/page-header';
import { ProgressBar } from './progress-bar';
import type { ChecklistSummary, Progress } from './types';

// Sign-offs land as trainers make them; never serve this from a cache.
export const dynamic = 'force-dynamic';

export default async function ChecklistsPage() {
  const [checklists, mine, permissions] = await Promise.all([
    api<ChecklistSummary[]>('/v1/checklists'),
    api<Progress[]>('/v1/checklists/mine'),
    myPermissions(),
  ]);
  const canSeeRoster = permissions.has('members:read');

  return (
    <div className="space-y-8">
      <PageHeader
        title="Checklists"
        description="Signed off a line at a time, by whoever holds the credential that line calls for."
      />

      <section className="space-y-2">
        <h2 className="text-lg font-medium tracking-tight">Mine</h2>
        {mine.length ? (
          <div className="grid gap-3">
            {mine.map((progress) => (
              <Card key={progress.template.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-base">
                      <Link
                        href={`/checklists/${progress.template.id}/${progress.member.id}`}
                        className="underline underline-offset-2"
                      >
                        {progress.template.name}
                      </Link>
                    </CardTitle>
                    {progress.complete ? <Badge>Complete</Badge> : null}
                    <span className="ml-auto">
                      <ProgressBar
                        signed={progress.signed}
                        total={progress.total}
                      />
                    </span>
                  </div>
                  {progress.leadsTo ? (
                    <CardDescription>
                      Counts toward {progress.leadsTo.name} (
                      {formatCredKey(progress.leadsTo.key)}).
                    </CardDescription>
                  ) : null}
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No checklists are outstanding for you.
          </p>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium tracking-tight">All checklists</h2>
        {checklists.length ? (
          <div className="grid gap-3">
            {checklists.map((checklist) => (
              <Card key={checklist.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-base">
                      {canSeeRoster ? (
                        <Link
                          href={`/checklists/${checklist.id}`}
                          className="underline underline-offset-2"
                        >
                          {checklist.name}
                        </Link>
                      ) : (
                        checklist.name
                      )}
                    </CardTitle>
                    <Badge variant="secondary">v{checklist.version}</Badge>
                  </div>
                  <CardDescription>
                    {checklist.signoffCredentialType
                      ? `Signed by ${checklist.signoffCredentialType.name} or above.`
                      : 'No signing level set — nobody can sign this yet.'}
                    {checklist.leadsTo.length
                      ? ` Required for ${checklist.leadsTo
                          .map((credential) => credential.name)
                          .join(', ')}.`
                      : ' Not attached to a credential, so it applies to everyone.'}
                  </CardDescription>
                </CardHeader>
                {canSeeRoster ? null : (
                  <CardContent className="text-sm text-muted-foreground">
                    Viewing who is working through this needs the member
                    directory.
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No checklists have been created yet.
          </p>
        )}
      </section>
    </div>
  );
}
