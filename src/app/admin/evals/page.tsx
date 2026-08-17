import Link from 'next/link';
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
import { createTemplate } from './actions';
import { TemplateEditor } from './template-editor';

type TemplateItem = {
  order: number;
  prompt: string;
  scoreType: string;
  options?: Array<{ value: string; label: string }> | null;
};

type Template = {
  id: number;
  name: string;
  version: number;
  active: boolean;
  items: TemplateItem[];
};

const inputCls =
  'h-8 rounded-md border border-input bg-background px-2 text-sm';

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

function scoreTypeLabel(scoreType: TemplateItem['scoreType']): string {
  if (scoreType === 'SCALE_1_5') return 'scale 1–5';
  if (scoreType === 'PASS_FAIL') return 'pass/fail';
  return 'text';
}

export default async function AdminEvalsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  let templates: Template[];
  try {
    templates = await api<Template[]>('/v1/evals/templates');
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) return <NoAccess />;
    throw err;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Evaluation forms"
        description="Author the templates trainers fill out for ride evaluations."
      />
      <ErrorBanner message={error} />

      <div className="grid gap-4">
        {templates.map((template) => (
          <Card key={template.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {template.name}
                <Badge variant="secondary">v{template.version}</Badge>
                {template.active ? null : (
                  <Badge variant="secondary">Inactive</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {template.items.length ? (
                <ol className="list-decimal space-y-1 pl-5 text-sm">
                  {template.items.map((item) => (
                    <li key={item.order}>
                      {item.prompt}{' '}
                      <span className="text-xs text-muted-foreground">
                        ({scoreTypeLabel(item.scoreType)})
                      </span>
                    </li>
                  ))}
                </ol>
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

      <Card>
        <CardHeader>
          <CardTitle>New template</CardTitle>
          <CardDescription>
            Fill in up to 10 items; blank rows are dropped.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createTemplate} className="space-y-4">
            <label className="grid gap-1 text-xs text-muted-foreground">
              Name
              <input
                type="text"
                name="name"
                required
                className={`${inputCls} w-72`}
              />
            </label>
            <TemplateEditor />
            <Button type="submit" size="sm">
              Create template
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
