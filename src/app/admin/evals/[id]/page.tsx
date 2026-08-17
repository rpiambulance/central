import Link from 'next/link';
import { notFound } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
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
import { reviseTemplate } from '../actions';
import { ChecklistLevelField, TemplateEditor } from '../template-editor';
import { toEditorNodes, type ApiTemplate } from '../template-shape';

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

export default async function ReviseTemplatePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const templateId = Number(id);

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

  const template = templates.find((t) => t.id === templateId);
  if (!template) notFound();
  const checklist = template.kind === 'CHECKLIST';

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Revise: ${template.name}`}
        description={
          checklist
            ? 'Checklists are edited in place. Sign-offs already recorded stay against the lines they were given for.'
            : 'Editing a template that is already in use creates a new version.'
        }
      />
      <div className="flex items-center gap-2">
        <Link
          href="/admin/evals"
          className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          &larr; All templates
        </Link>
        <Badge variant="secondary">v{template.version}</Badge>
        {checklist ? <Badge>Checklist</Badge> : null}
      </div>
      <ErrorBanner message={error} />

      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
          <CardDescription>
            Add as many items as the form needs, in any order, loose or inside
            a group. Items left blank are dropped, and so is a group with
            nothing in it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={reviseTemplate.bind(null, template.id)}
            className="space-y-4"
          >
            <input type="hidden" name="name" value={template.name} />
            <input type="hidden" name="kind" value={template.kind ?? 'EVALUATION'} />
            {checklist ? (
              <ChecklistLevelField
                credentials={credentials}
                initial={(template.signoffCredentialTypes ?? []).map(
                  (credential) => credential.id,
                )}
              />
            ) : null}
            <TemplateEditor
              initial={toEditorNodes(template)}
              checklist={checklist}
              credentials={credentials}
            />
            <Button type="submit" size="sm">
              Save revision
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
