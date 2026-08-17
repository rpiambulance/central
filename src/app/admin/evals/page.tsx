import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ErrorBanner } from '@/components/error-banner';
import { PageHeader } from '@/components/page-header';
import { createTemplate } from './actions';
import { NewTemplateForm } from './new-template-form';
import type { ApiTemplate } from './template-shape';

type Credential = { id: number; key: string; name: string };

function NoAccess() {
  return (
    <Card className="mx-auto mt-12 max-w-md">
      <CardHeader>
        <CardTitle>You don&apos;t have access</CardTitle>
        <CardDescription>
          Evaluation form administration requires additional permissions. If
          you think you should have access, contact an officer.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

const SCORE_TYPE_LABEL: Record<string, string> = {
  SCALE_1_5: 'scale 1–5',
  PASS_FAIL: 'pass/fail',
  SHORT_TEXT: 'short text',
  TEXT: 'long text',
  NUMBER: 'number',
  OPTIONS: 'choose one',
  MULTI_SELECT: 'choose any',
  HEADING: 'heading',
  SIGNOFF: 'sign-off',
};

function scoreTypeLabel(scoreType: string): string {
  return SCORE_TYPE_LABEL[scoreType] ?? scoreType.toLowerCase();
}

export default async function AdminEvalsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  let templates: ApiTemplate[];
  let credentials: Credential[];
  try {
    [templates, credentials] = await Promise.all([
      api<ApiTemplate[]>('/v1/evals/templates'),
      api<Credential[]>('/v1/credentials/types'),
    ]);
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) return <NoAccess />;
    throw err;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Evaluation and checklist forms"
        description="Author the forms trainers fill out, and the checklists they sign off."
      />
      <ErrorBanner message={error} />

      <div className="grid gap-4">
        {templates.map((template) => (
          <Card key={template.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {template.name}
                <Badge variant="secondary">v{template.version}</Badge>
                {template.kind === 'CHECKLIST' ? <Badge>Checklist</Badge> : null}
                {template.active ? null : (
                  <Badge variant="secondary">Inactive</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {template.items.length || template.groups?.length ? (
                <div className="space-y-2 text-sm">
                  {template.items.length ? (
                    <ol className="list-decimal space-y-1 pl-5">
                      {template.items.map((item) => (
                        <li key={`i${item.id ?? item.order}`}>
                          {item.prompt}{' '}
                          <span className="text-xs text-muted-foreground">
                            ({scoreTypeLabel(item.scoreType)})
                          </span>
                        </li>
                      ))}
                    </ol>
                  ) : null}
                  {(template.groups ?? []).map((group) => (
                    <div key={group.id}>
                      <p className="font-medium">{group.heading}</p>
                      <ol className="list-decimal space-y-1 pl-5">
                        {group.items.map((item) => (
                          <li key={`g${item.id ?? item.order}`}>
                            {item.prompt}{' '}
                            <span className="text-xs text-muted-foreground">
                              ({scoreTypeLabel(item.scoreType)})
                            </span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No items.</p>
              )}
              <Link
                href={`/admin/evals/${template.id}`}
                className="text-sm underline underline-offset-2 hover:text-foreground"
              >
                Revise
              </Link>
            </CardContent>
          </Card>
        ))}
        {!templates.length ? (
          <p className="text-sm text-muted-foreground">No templates yet.</p>
        ) : null}
      </div>

      <NewTemplateForm action={createTemplate} credentials={credentials} />
    </div>
  );
}
