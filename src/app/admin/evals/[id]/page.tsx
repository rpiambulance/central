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
import { TemplateItemRows, type TemplateItem } from '../template-form';

type Template = {
  id: number;
  name: string;
  version: number;
  active: boolean;
  items: TemplateItem[];
};

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

  let templates: Template[];
  try {
    templates = await api<Template[]>('/v1/evals/templates');
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) return <NoAccess />;
    throw err;
  }

  const template = templates.find((t) => t.id === templateId);
  if (!template) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Revise: ${template.name}`}
        description="Editing a template that is already in use creates a new version."
      />
      <div className="flex items-center gap-2">
        <Link
          href="/admin/evals"
          className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          &larr; All templates
        </Link>
        <Badge variant="secondary">v{template.version}</Badge>
      </div>
      <ErrorBanner message={error} />

      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
          <CardDescription>
            Fill in up to 10 items; blank rows are dropped.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={reviseTemplate.bind(null, template.id)}
            className="space-y-4"
          >
            <input type="hidden" name="name" value={template.name} />
            <TemplateItemRows items={template.items} />
            <Button type="submit" size="sm">
              Save revision
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
