import { api } from '@/lib/api';
import { myPermissions } from '@/lib/me';
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
import { addResource, editResource, removeResource } from './actions';

type Resource = {
  id: number;
  title: string;
  url: string;
  description: string | null;
  position: number;
  createdBy: { firstName: string; lastName: string } | null;
};

const FIELD =
  'h-8 rounded-md border border-input bg-background px-2 text-sm';

/** Where the link actually goes, without the noise around it. */
function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

export default async function ResourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const [resources, permissions] = await Promise.all([
    api<Resource[]>('/v1/resources'),
    myPermissions(),
  ]);
  const mayEdit = permissions.has('resources:manage');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Resources"
        description="Links worth keeping in one place — protocols, forms, and the rest."
      />
      <ErrorBanner message={error} />

      {resources.length ? (
        <div className="space-y-3">
          {resources.map((resource) => (
            <Card key={resource.id}>
              <CardHeader>
                <CardTitle className="text-base">
                  {/* Opened in a new tab, since these lead off the portal and
                      losing your place mid-task is its own small annoyance.
                      noreferrer with it: the destination has no business
                      being told which page sent you. */}
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2"
                  >
                    {resource.title}
                  </a>{' '}
                  <span className="text-xs font-normal text-muted-foreground">
                    {hostOf(resource.url)}
                  </span>
                </CardTitle>
                {resource.description ? (
                  <CardDescription>{resource.description}</CardDescription>
                ) : null}
              </CardHeader>

              {mayEdit ? (
                <CardContent className="flex flex-wrap items-end gap-2">
                  {/* Keyed on the saved values: React resets an uncontrolled
                      form when its action finishes, and a reset restores the
                      defaults the fields were mounted with, not the ones just
                      saved. */}
                  <form
                    key={`${resource.title}|${resource.url}|${resource.description ?? ''}|${resource.position}`}
                    action={editResource.bind(null, resource.id)}
                    className="flex flex-wrap items-end gap-2"
                  >
                    <label className="grid gap-1 text-xs text-muted-foreground">
                      Title
                      <input
                        name="title"
                        defaultValue={resource.title}
                        required
                        className={`${FIELD} w-48`}
                      />
                    </label>
                    <label className="grid gap-1 text-xs text-muted-foreground">
                      Address
                      <input
                        name="url"
                        defaultValue={resource.url}
                        required
                        className={`${FIELD} w-72`}
                      />
                    </label>
                    <label className="grid gap-1 text-xs text-muted-foreground">
                      Description
                      <input
                        name="description"
                        defaultValue={resource.description ?? ''}
                        className={`${FIELD} w-64`}
                      />
                    </label>
                    <label className="grid gap-1 text-xs text-muted-foreground">
                      Order
                      <input
                        type="number"
                        name="position"
                        defaultValue={resource.position}
                        className={`${FIELD} w-20`}
                      />
                    </label>
                    <Button type="submit" size="sm" variant="outline" className="h-8">
                      Save
                    </Button>
                  </form>
                  <form action={removeResource.bind(null, resource.id)}>
                    <Button
                      type="submit"
                      size="sm"
                      variant="ghost"
                      className="h-8 text-destructive"
                    >
                      Remove
                    </Button>
                  </form>
                </CardContent>
              ) : null}
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {mayEdit
              ? 'No links yet — add the first one below.'
              : 'No links have been added yet.'}
          </CardContent>
        </Card>
      )}

      {mayEdit ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add a link</CardTitle>
            <CardDescription>
              Anything members keep having to ask for. Lower order numbers sort
              first.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={addResource} className="flex flex-wrap items-end gap-2">
              <label className="grid gap-1 text-xs text-muted-foreground">
                Title
                <input name="title" required className={`${FIELD} w-48`} />
              </label>
              <label className="grid gap-1 text-xs text-muted-foreground">
                Address
                <input
                  name="url"
                  required
                  placeholder="rpiambulance.com/protocols"
                  className={`${FIELD} w-72`}
                />
              </label>
              <label className="grid gap-1 text-xs text-muted-foreground">
                Description (optional)
                <input name="description" className={`${FIELD} w-64`} />
              </label>
              <label className="grid gap-1 text-xs text-muted-foreground">
                Order (optional)
                <input
                  type="number"
                  name="position"
                  className={`${FIELD} w-20`}
                />
              </label>
              <Button type="submit" size="sm" className="h-8">
                Add link
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
